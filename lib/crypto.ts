import { computeSignals, Signals, SeriesPoint } from './indicators';
import { backtestWinRate, WinRateResult } from './backtest';

export interface CryptoCardData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number | null;
  change7d: number | null;
  marketCapRank: number;
  sparkline: number[];
  signals: Signals;
  winRate: WinRateResult | null;
}

const REVALIDATE_SECONDS = 900;
const HISTORY_REVALIDATE_SECONDS = 3600; // win-rate history moves slowly

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 180 days of daily closes — the walk-forward window for crypto win rates. */
async function getDailyHistory(id: string): Promise<SeriesPoint[] | null> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=180`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: { revalidate: HISTORY_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.status === 429 && attempt === 0) {
        await sleep(2_500); // free-tier rate limit — back off once and retry
        continue;
      }
      if (!res.ok) return null;
      const json = await res.json();
      const prices: [number, number][] = json?.prices ?? [];
      const series = prices
        .map(([, p]) => Number(p))
        .filter(Number.isFinite)
        .map((p) => ({ close: p, high: p, low: p }));
      return series.length >= 90 ? series : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * CoinGecko free API — top coins by market cap with 7d sparkline.
 * Stablecoins and wrapped assets are filtered out (nothing to "signal" on a peg).
 */
export async function getCryptoCards(limit = 9): Promise<CryptoCardData[]> {
  try {
    const url =
      'https://api.coingecko.com/api/v3/coins/markets' +
      '?vs_currency=usd&order=market_cap_desc&per_page=20&page=1' +
      '&sparkline=true&price_change_percentage=24h,7d';
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const coins: any[] = await res.json();

    // stablecoins, wrapped/staked duplicates, and tokenized RWA products —
    // nothing meaningful to "signal" on a peg or a note
    const EXCLUDED = new Set([
      'tether', 'usd-coin', 'dai', 'usds', 'ethena-usde', 'susds', 'first-digital-usd',
      'binance-bridged-usdt-bnb-smart-chain', 'paypal-usd', 'usdt0', 'usde',
      'staked-ether', 'wrapped-bitcoin', 'weth', 'wrapped-steth', 'wrapped-eeth',
      'coinbase-wrapped-btc', 'binance-staked-sol', 'lombard-staked-btc',
      'figure-heloc', 'blackrock-usd-institutional-digital-liquidity-fund',
    ]);

    const selected = coins.filter((c) => !EXCLUDED.has(c.id)).slice(0, limit);

    // Histories fetched sequentially with a small stagger — CoinGecko's free
    // tier rate-limits bursts, and these are hourly-cached anyway.
    const cards: CryptoCardData[] = [];
    for (const c of selected) {
      const prices: number[] = c.sparkline_in_7d?.price ?? [];
      const hourlySeries = prices.map((p) => ({ close: p, high: p, low: p }));
      const daily = await getDailyHistory(c.id);
      // Daily series (180d) gives a real trend read + walk-forward win rate;
      // the 7d hourly sparkline is the fallback scoring basis.
      const signals: Signals = computeSignals(daily ?? hourlySeries);
      // 24h change from the API is more authoritative than series-derived.
      signals.change1d = c.price_change_percentage_24h_in_currency ?? signals.change1d;
      cards.push({
        id: c.id,
        symbol: (c.symbol as string).toUpperCase(),
        name: c.name as string,
        price: c.current_price as number,
        change24h: c.price_change_percentage_24h_in_currency ?? null,
        change7d: c.price_change_percentage_7d_in_currency ?? null,
        marketCapRank: c.market_cap_rank as number,
        sparkline: prices.filter((_, i) => i % 3 === 0), // thin to ~56 pts
        signals,
        winRate: daily ? backtestWinRate(daily, signals) : null,
      });
      await sleep(400); // pace every history call — successes and 429s alike
    }
    return cards.sort((a, b) => b.signals.score - a.signals.score);
  } catch {
    return [];
  }
}
