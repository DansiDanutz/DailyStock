import { computeSignals, Signals, SeriesPoint } from './indicators';
import { backtestWinRate, WinRateResult } from './backtest';

export interface StockCardData {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  sparkline: number[]; // last ~60 closes
  signals: Signals;
  winRate: WinRateResult | null;
}

// Curated liquid large-cap watchlist (the vendored engine analyses a
// user-defined watchlist the same way; this is the zero-config default).
const WATCHLIST: { symbol: string; name: string; stooq: string }[] = [
  { symbol: 'AAPL', name: 'Apple', stooq: 'aapl.us' },
  { symbol: 'MSFT', name: 'Microsoft', stooq: 'msft.us' },
  { symbol: 'NVDA', name: 'NVIDIA', stooq: 'nvda.us' },
  { symbol: 'GOOGL', name: 'Alphabet', stooq: 'googl.us' },
  { symbol: 'AMZN', name: 'Amazon', stooq: 'amzn.us' },
  { symbol: 'META', name: 'Meta Platforms', stooq: 'meta.us' },
  { symbol: 'TSLA', name: 'Tesla', stooq: 'tsla.us' },
  { symbol: 'AVGO', name: 'Broadcom', stooq: 'avgo.us' },
  { symbol: 'AMD', name: 'AMD', stooq: 'amd.us' },
  { symbol: 'NFLX', name: 'Netflix', stooq: 'nflx.us' },
  { symbol: 'JPM', name: 'JPMorgan Chase', stooq: 'jpm.us' },
  { symbol: 'V', name: 'Visa', stooq: 'v.us' },
  { symbol: 'LLY', name: 'Eli Lilly', stooq: 'lly.us' },
  { symbol: 'XOM', name: 'Exxon Mobil', stooq: 'xom.us' },
  { symbol: 'PLTR', name: 'Palantir', stooq: 'pltr.us' },
  { symbol: 'COIN', name: 'Coinbase', stooq: 'coin.us' },
];

const REVALIDATE_SECONDS = 900;

async function fetchYahooSeries(symbol: string): Promise<SeriesPoint[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=6mo&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DailyStock/1.0)' },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    if (!quote?.close) return null;
    const series: SeriesPoint[] = [];
    for (let i = 0; i < quote.close.length; i++) {
      const close = quote.close[i];
      if (close === null || close === undefined) continue;
      series.push({
        close,
        high: quote.high?.[i] ?? close,
        low: quote.low?.[i] ?? close,
      });
    }
    return series.length >= 30 ? series : null;
  } catch {
    return null;
  }
}

async function fetchStooqSeries(stooqSymbol: string): Promise<SeriesPoint[] | null> {
  try {
    const url = `https://stooq.com/q/d/l/?s=${stooqSymbol}&i=d`;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    const csv = await res.text();
    const lines = csv.trim().split('\n').slice(1); // drop header
    const series: SeriesPoint[] = [];
    for (const line of lines.slice(-130)) {
      const [, , high, low, close] = line.split(',');
      const c = parseFloat(close);
      if (!Number.isFinite(c)) continue;
      series.push({ close: c, high: parseFloat(high) || c, low: parseFloat(low) || c });
    }
    return series.length >= 30 ? series : null;
  } catch {
    return null;
  }
}

async function buildCard(entry: (typeof WATCHLIST)[number]): Promise<StockCardData | null> {
  const series = (await fetchYahooSeries(entry.symbol)) ?? (await fetchStooqSeries(entry.stooq));
  if (!series) return null;
  const signals = computeSignals(series);
  const price = series[series.length - 1].close;
  return {
    symbol: entry.symbol,
    name: entry.name,
    price,
    currency: 'USD',
    sparkline: series.slice(-60).map((p) => p.close),
    signals,
    winRate: backtestWinRate(series, signals),
  };
}

/** Fetch the watchlist, score it, return all cards sorted by score desc. */
export async function getStockCards(): Promise<StockCardData[]> {
  const settled = await Promise.allSettled(WATCHLIST.map(buildCard));
  const cards = settled
    .filter((r): r is PromiseFulfilledResult<StockCardData | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((c): c is StockCardData => c !== null);
  return cards.sort((a, b) => b.signals.score - a.signals.score);
}

export interface IndexQuote {
  label: string;
  price: number;
  changePct: number | null;
}

const INDICES: { symbol: string; label: string }[] = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: 'Nasdaq' },
  { symbol: '^DJI', label: 'Dow Jones' },
];

export async function getIndexQuotes(): Promise<IndexQuote[]> {
  const settled = await Promise.allSettled(
    INDICES.map(async ({ symbol, label }) => {
      const series = await fetchYahooSeries(symbol);
      if (!series || series.length < 2) return null;
      const last = series[series.length - 1].close;
      const prev = series[series.length - 2].close;
      return { label, price: last, changePct: prev ? ((last - prev) / prev) * 100 : null };
    })
  );
  return settled
    .filter((r): r is PromiseFulfilledResult<IndexQuote | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((q): q is IndexQuote => q !== null);
}
