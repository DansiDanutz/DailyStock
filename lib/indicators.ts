// Pure technical-analysis math. Mirrors the scoring ideas of the vendored
// daily_stock_analysis engine (score / trend / support & resistance zones)
// in a form the web tier can run against any OHLC series.

export interface SeriesPoint {
  close: number;
  high: number;
  low: number;
}

export interface Signals {
  score: number; // 0..100 composite
  trend: 'bullish' | 'leaning-bullish' | 'neutral' | 'leaning-bearish' | 'bearish';
  rsi14: number | null;
  sma20: number | null;
  sma50: number | null;
  change1d: number | null; // percent
  change5d: number | null;
  change20d: number | null;
  supportZone: number | null; // recent swing low
  resistanceZone: number | null; // recent swing high
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  const recent = closes.slice(-(period + 1));
  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i] - recent[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (gains + losses === 0) return 50;
  const rs = losses === 0 ? Infinity : gains / losses;
  return losses === 0 ? 100 : 100 - 100 / (1 + rs);
}

function pctChange(closes: number[], lookback: number): number | null {
  if (closes.length < lookback + 1) return null;
  const prev = closes[closes.length - 1 - lookback];
  const last = closes[closes.length - 1];
  if (prev === 0) return null;
  return ((last - prev) / prev) * 100;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Composite 0-100 score: trend structure (price vs SMA20 vs SMA50),
 * momentum (5d/20d), and RSI positioning. Deliberately simple and
 * deterministic — same inputs, same score.
 */
export function computeSignals(series: SeriesPoint[]): Signals {
  const closes = series.map((p) => p.close).filter((c) => Number.isFinite(c));
  const last = closes[closes.length - 1] ?? null;

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const rsi14 = rsi(closes);
  const change1d = pctChange(closes, 1);
  const change5d = pctChange(closes, 5);
  const change20d = pctChange(closes, 20);

  const recent = series.slice(-20);
  const supportZone = recent.length
    ? Math.min(...recent.map((p) => p.low).filter(Number.isFinite))
    : null;
  const resistanceZone = recent.length
    ? Math.max(...recent.map((p) => p.high).filter(Number.isFinite))
    : null;

  let score = 50;
  if (last !== null && sma20 !== null) score += last > sma20 ? 10 : -10;
  if (last !== null && sma50 !== null) score += last > sma50 ? 8 : -8;
  if (sma20 !== null && sma50 !== null) score += sma20 > sma50 ? 7 : -7;
  if (change5d !== null) score += clamp(change5d, -8, 8);
  if (change20d !== null) score += clamp(change20d / 2, -8, 8);
  if (rsi14 !== null) {
    if (rsi14 > 70) score -= 6; // overbought penalty
    else if (rsi14 < 30) score += 4; // oversold bounce potential
    else score += (rsi14 - 50) / 5;
  }
  score = clamp(Math.round(score), 0, 100);

  const trend: Signals['trend'] =
    score >= 72 ? 'bullish'
    : score >= 58 ? 'leaning-bullish'
    : score >= 43 ? 'neutral'
    : score >= 28 ? 'leaning-bearish'
    : 'bearish';

  return { score, trend, rsi14, sma20, sma50, change1d, change5d, change20d, supportZone, resistanceZone };
}

export const TREND_LABEL: Record<Signals['trend'], string> = {
  bullish: 'Bullish',
  'leaning-bullish': 'Leaning bullish',
  neutral: 'Neutral',
  'leaning-bearish': 'Leaning bearish',
  bearish: 'Bearish',
};
