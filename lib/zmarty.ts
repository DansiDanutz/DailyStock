// Server-side client for the Zmarty intelligence API (zmarty-chat-api.onrender.com).
// Only endpoints verified live are used; every fetcher degrades to null/[] so the
// page renders honestly when a service is cold, gated, or in fallback mode.

const BASE = process.env.ZMARTY_API_BASE ?? 'https://zmarty-chat-api.onrender.com';
const REVALIDATE_SECONDS = 300;
const FETCH_TIMEOUT_MS = 30_000;

/** Focus list = DailyStock crypto radar ∩ Zmarty supported symbols. */
export const INTEL_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE'] as const;
export type IntelSymbol = (typeof INTEL_SYMBOLS)[number];

async function zmartyGet(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- Smart signals (backtested win-rate filter) ----------

export interface SmartSignal {
  raw: Record<string, unknown>;
}

export interface SmartSignalsResult {
  available: boolean;
  filter: string;
  signals: SmartSignal[];
}

export async function getSmartSignals(): Promise<SmartSignalsResult> {
  const json = await zmartyGet('/api/v1/signals/smart');
  if (!json || json.status !== 'success') {
    return { available: false, filter: '', signals: [] };
  }
  const signals: SmartSignal[] = Array.isArray(json.signals)
    ? json.signals.map((s: Record<string, unknown>) => ({ raw: s }))
    : [];
  return {
    available: true,
    filter: typeof json.filter === 'string' ? json.filter : 'backtested win-rate filter',
    signals,
  };
}

// ---------- Multi-timeframe indicator alignment ----------

export interface AlignmentTimeframe {
  timeframe: string;
  bias: string;
  longPct: number;
  shortPct: number;
  strength: number;
  indicatorCount: number;
}

export interface AlignmentData {
  symbol: string;
  overallBias: string;
  alignedTimeframes: number;
  totalTimeframes: number;
  timeframes: AlignmentTimeframe[];
}

export async function getAlignment(symbol: string): Promise<AlignmentData | null> {
  const json = await zmartyGet(`/api/v1/alignment/${encodeURIComponent(symbol)}`);
  if (!json?.success || !json.alignment) return null;
  return {
    symbol,
    overallBias: String(json.alignment.overall_bias ?? 'NEUTRAL'),
    alignedTimeframes: Number(json.alignment.aligned_timeframes ?? 0),
    totalTimeframes: Number(json.alignment.total_timeframes ?? 0),
    timeframes: (json.timeframes ?? []).map((t: any) => ({
      timeframe: String(t.timeframe),
      bias: String(t.bias ?? 'NEUTRAL'),
      longPct: Number(t.long_percentage ?? 0),
      shortPct: Number(t.short_percentage ?? 0),
      strength: Number(t.strength ?? 0),
      indicatorCount: Number(t.indicator_count ?? 0),
    })),
  };
}

// ---------- Liquidation flow ----------

export interface LiquidationFlow {
  symbol: string;
  currentPrice: number | null;
  bias: string;
  biasRatio: number | null;
  topSupport: number[];
  topResistance: number[];
  windows: { window: string; total: number; long: number; short: number }[];
}

export async function getLiquidationFlow(symbol: string): Promise<LiquidationFlow | null> {
  const json = await zmartyGet(`/api/v1/liquidation-clusters/symbol/${encodeURIComponent(symbol)}`);
  const d = json?.data;
  if (!json?.success || !d) return null;
  const tf = d.timeframe_data ?? {};
  const windows = ['1h', '4h', '12h', '24h']
    .filter((w) => tf[w])
    .map((w) => ({
      window: w,
      total: Number(tf[w].total ?? 0),
      long: Number(tf[w].long ?? 0),
      short: Number(tf[w].short ?? 0),
    }));
  const clusterPrice = (c: any) => Number(c?.price ?? c?.price_level ?? c?.level ?? NaN);
  return {
    symbol,
    currentPrice: Number.isFinite(Number(d.current_price)) ? Number(d.current_price) : null,
    bias: String(d.bias ?? 'balanced'),
    biasRatio: Number.isFinite(Number(d.bias_ratio)) ? Number(d.bias_ratio) : null,
    topSupport: (d.top_support ?? []).map(clusterPrice).filter(Number.isFinite).slice(0, 3),
    topResistance: (d.top_resistance ?? []).map(clusterPrice).filter(Number.isFinite).slice(0, 3),
    windows,
  };
}

// ---------- Batch fetch for the intel page ----------

export interface IntelBundle {
  signals: SmartSignalsResult;
  alignments: Map<string, AlignmentData>;
  liquidations: Map<string, LiquidationFlow>;
}

export async function getIntelBundle(): Promise<IntelBundle> {
  const [signals, alignSettled, liqSettled] = await Promise.all([
    getSmartSignals(),
    Promise.allSettled(INTEL_SYMBOLS.map((s) => getAlignment(s))),
    Promise.allSettled(INTEL_SYMBOLS.map((s) => getLiquidationFlow(s))),
  ]);

  const alignments = new Map<string, AlignmentData>();
  alignSettled.forEach((r) => {
    if (r.status === 'fulfilled' && r.value) alignments.set(r.value.symbol, r.value);
  });

  const liquidations = new Map<string, LiquidationFlow>();
  liqSettled.forEach((r) => {
    if (r.status === 'fulfilled' && r.value) liquidations.set(r.value.symbol, r.value);
  });

  return { signals, alignments, liquidations };
}
