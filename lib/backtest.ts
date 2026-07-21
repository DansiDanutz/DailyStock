// Walk-forward "same setup" win rate.
//
// For each historical day t the composite score is recomputed using ONLY data
// up to t (no look-ahead). Days whose setup fell in the same score band as
// today's are collected, and the win rate is the share of those days where
// price moved in the signal's direction over the next HORIZON sessions.
// This is a historical frequency on ~6 months of data — shown with its
// sample size, and never a prediction.

import { computeSignals, SeriesPoint, Signals } from './indicators';

const HORIZON = 5; // sessions ahead
const WARMUP = 50; // sessions needed before the score is meaningful (SMA50)
const MIN_SAMPLES = 8;

export interface WinRateResult {
  winRatePct: number;
  sampleSize: number;
  horizonDays: number;
  direction: 'up' | 'down';
}

type Band = 'bullish' | 'leaning-bullish' | 'neutral' | 'leaning-bearish' | 'bearish';

const bandOf = (score: number): Band =>
  score >= 72 ? 'bullish'
  : score >= 58 ? 'leaning-bullish'
  : score >= 43 ? 'neutral'
  : score >= 28 ? 'leaning-bearish'
  : 'bearish';

export function backtestWinRate(series: SeriesPoint[], current: Signals): WinRateResult | null {
  if (series.length < WARMUP + HORIZON + MIN_SAMPLES) return null;

  const currentBand = bandOf(current.score);
  const direction: 'up' | 'down' =
    currentBand === 'neutral' ? (current.score >= 50 ? 'up' : 'down')
    : currentBand === 'bullish' || currentBand === 'leaning-bullish' ? 'up'
    : 'down';

  // Walk forward once, recording each day's score.
  const scores: number[] = [];
  for (let t = WARMUP; t < series.length; t++) {
    scores.push(computeSignals(series.slice(0, t + 1)).score);
  }

  const evaluate = (match: (score: number) => boolean): { wins: number; n: number } => {
    let wins = 0;
    let n = 0;
    for (let i = 0; i < scores.length - HORIZON; i++) {
      if (!match(scores[i])) continue;
      const t = WARMUP + i;
      const entry = series[t].close;
      const exit = series[t + HORIZON].close;
      if (!entry || !exit) continue;
      const fwd = (exit - entry) / entry;
      n++;
      if ((direction === 'up' && fwd > 0) || (direction === 'down' && fwd < 0)) wins++;
    }
    return { wins, n };
  };

  // Exact band first; broaden to the same side of the scale if too few samples.
  let { wins, n } = evaluate((s) => bandOf(s) === currentBand);
  if (n < MIN_SAMPLES) {
    ({ wins, n } =
      direction === 'up' && currentBand !== 'neutral' ? evaluate((s) => s >= 58)
      : direction === 'down' && currentBand !== 'neutral' ? evaluate((s) => s <= 42)
      : evaluate(() => true));
  }
  if (n < MIN_SAMPLES) return null;

  return {
    winRatePct: Math.round((wins / n) * 100),
    sampleSize: n,
    horizonDays: HORIZON,
    direction,
  };
}
