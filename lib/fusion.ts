// Triple-lens fusion: DailyStock's own composite score, Zmarty's 47-indicator
// multi-timeframe alignment, and live liquidation flow are three INDEPENDENT
// systems. A directional call only earns "confluence" when they agree.

import type { Signals } from './indicators';
import type { AlignmentData, LiquidationFlow } from './zmarty';

export type LensVote = 1 | 0 | -1;

export interface FusionVerdict {
  symbol: string;
  votes: {
    momentum: LensVote; // DailyStock composite score
    alignment: LensVote; // Zmarty MTF indicator alignment
    liquidation: LensVote; // liquidation-flow pressure
  };
  lensesAvailable: number; // 1..3
  verdict: 'bullish-confluence' | 'bearish-confluence' | 'divergence' | 'no-edge';
  label: string;
  detail: string;
}

function momentumVote(signals: Signals | null): LensVote | null {
  if (!signals) return null;
  if (signals.score >= 58) return 1;
  if (signals.score <= 42) return -1;
  return 0;
}

function alignmentVote(a: AlignmentData | null): LensVote | null {
  if (!a) return null;
  const bias = a.overallBias.toUpperCase();
  if (bias.includes('LONG') || bias.includes('BULL')) return 1;
  if (bias.includes('SHORT') || bias.includes('BEAR')) return -1;
  // NEUTRAL headline — fall back to average long vs short indicator percentage
  if (a.timeframes.length > 0) {
    const avgLong = a.timeframes.reduce((s, t) => s + t.longPct, 0) / a.timeframes.length;
    const avgShort = a.timeframes.reduce((s, t) => s + t.shortPct, 0) / a.timeframes.length;
    if (avgLong > avgShort * 1.5) return 1;
    if (avgShort > avgLong * 1.5) return -1;
  }
  return 0;
}

/**
 * Liquidation logic: shorts liquidate when price RISES, longs when it falls.
 * A 24h window dominated by short liquidations is evidence of upward pressure
 * (and squeezed shorts as fuel), and vice versa.
 */
function liquidationVote(l: LiquidationFlow | null): LensVote | null {
  if (!l) return null;
  const w = l.windows.find((x) => x.window === '24h') ?? l.windows[l.windows.length - 1];
  if (!w || w.total <= 0) return 0;
  const shortShare = w.short / w.total;
  if (shortShare >= 0.65) return 1;
  if (shortShare <= 0.35) return -1;
  return 0;
}

export function fuse(
  symbol: string,
  signals: Signals | null,
  alignment: AlignmentData | null,
  liquidation: LiquidationFlow | null
): FusionVerdict {
  const m = momentumVote(signals);
  const a = alignmentVote(alignment);
  const l = liquidationVote(liquidation);
  const cast = [m, a, l].filter((v): v is LensVote => v !== null);
  const sum = cast.reduce<number>((s, v) => s + v, 0);
  const nonZero = cast.filter((v) => v !== 0);
  const hasConflict = nonZero.includes(1) && nonZero.includes(-1);

  let verdict: FusionVerdict['verdict'];
  let label: string;
  let detail: string;

  if (cast.length < 2) {
    verdict = 'no-edge';
    label = 'Insufficient data';
    detail = 'Fewer than two lenses reporting — no call.';
  } else if (hasConflict) {
    verdict = 'divergence';
    label = 'Divergence';
    detail = 'The lenses disagree. Conflicting evidence is a signal to stand aside.';
  } else if (sum >= 2) {
    verdict = 'bullish-confluence';
    label = 'Bullish confluence';
    detail = 'Independent systems agree on upward pressure.';
  } else if (sum <= -2) {
    verdict = 'bearish-confluence';
    label = 'Bearish confluence';
    detail = 'Independent systems agree on downward pressure.';
  } else {
    verdict = 'no-edge';
    label = 'No edge';
    detail = 'Signals are flat or too weak to justify a directional view.';
  }

  return {
    symbol,
    votes: { momentum: m ?? 0, alignment: a ?? 0, liquidation: l ?? 0 },
    lensesAvailable: cast.length,
    verdict,
    label,
    detail,
  };
}
