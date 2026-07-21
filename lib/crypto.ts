import { computeSignals, Signals } from './indicators';

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
}

const REVALIDATE_SECONDS = 900;

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

    return coins
      .filter((c) => !EXCLUDED.has(c.id))
      .slice(0, limit)
      .map((c) => {
        const prices: number[] = c.sparkline_in_7d?.price ?? [];
        // Hourly 7d sparkline → treat each point as a pseudo-candle for scoring.
        const series = prices.map((p) => ({ close: p, high: p, low: p }));
        const signals: Signals = computeSignals(series);
        // 24h/7d change from the API is more authoritative than sparkline-derived.
        signals.change1d = c.price_change_percentage_24h_in_currency ?? signals.change1d;
        return {
          id: c.id,
          symbol: (c.symbol as string).toUpperCase(),
          name: c.name as string,
          price: c.current_price as number,
          change24h: c.price_change_percentage_24h_in_currency ?? null,
          change7d: c.price_change_percentage_7d_in_currency ?? null,
          marketCapRank: c.market_cap_rank as number,
          sparkline: prices.filter((_, i) => i % 3 === 0), // thin to ~56 pts
          signals,
        };
      })
      .sort((a, b) => b.signals.score - a.signals.score);
  } catch {
    return [];
  }
}
