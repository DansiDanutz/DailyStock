// Perpetual funding rates = the price of crowd positioning.
// Positive funding: longs pay shorts to keep the trade on — crowded upside.
// Negative funding: shorts pay — crowded downside, and squeeze fuel.
// Sources verified reachable from Vercel's runtime: OKX (primary),
// Hyperliquid (fallback, one POST covers every symbol).

const REVALIDATE_SECONDS = 900;
const TIMEOUT_MS = 10_000;

export type CrowdRead = 'longs-crowded' | 'shorts-crowded' | 'balanced';

export interface FundingRate {
  symbol: string;
  rate8hPct: number; // funding per 8h window, in percent
  annualizedPct: number;
  source: 'okx' | 'hyperliquid';
  crowd: CrowdRead;
}

// Baseline funding is +0.01%/8h, so the thresholds are asymmetric:
// meaningfully above baseline = crowded longs; below zero = crowded shorts.
function crowdRead(rate8hPct: number): CrowdRead {
  if (rate8hPct >= 0.025) return 'longs-crowded';
  if (rate8hPct <= -0.005) return 'shorts-crowded';
  return 'balanced';
}

async function okxFunding(symbol: string): Promise<FundingRate | null> {
  try {
    const res = await fetch(
      `https://www.okx.com/api/v5/public/funding-rate?instId=${symbol}-USDT-SWAP`,
      { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const rate = Number(json?.data?.[0]?.fundingRate);
    if (!Number.isFinite(rate)) return null;
    const rate8hPct = rate * 100;
    return {
      symbol,
      rate8hPct,
      annualizedPct: rate8hPct * 3 * 365,
      source: 'okx',
      crowd: crowdRead(rate8hPct),
    };
  } catch {
    return null;
  }
}

async function hyperliquidFunding(symbols: string[]): Promise<Map<string, FundingRate>> {
  const out = new Map<string, FundingRate>();
  try {
    const res = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return out;
    const [meta, ctxs] = await res.json();
    const universe: { name: string }[] = meta?.universe ?? [];
    universe.forEach((u, i) => {
      if (!symbols.includes(u.name)) return;
      const hourly = Number(ctxs?.[i]?.funding);
      if (!Number.isFinite(hourly)) return;
      const rate8hPct = hourly * 8 * 100; // hourly → 8h window, as percent
      out.set(u.name, {
        symbol: u.name,
        rate8hPct,
        annualizedPct: rate8hPct * 3 * 365,
        source: 'hyperliquid',
        crowd: crowdRead(rate8hPct),
      });
    });
    return out;
  } catch {
    return out;
  }
}

/** OKX per symbol, Hyperliquid filling any gaps. Missing symbols are omitted. */
export async function getFundingRates(symbols: readonly string[]): Promise<FundingRate[]> {
  const okxSettled = await Promise.allSettled(symbols.map((s) => okxFunding(s)));
  const rates = new Map<string, FundingRate>();
  okxSettled.forEach((r) => {
    if (r.status === 'fulfilled' && r.value) rates.set(r.value.symbol, r.value);
  });

  const missing = symbols.filter((s) => !rates.has(s));
  if (missing.length > 0) {
    const hl = await hyperliquidFunding([...missing]);
    hl.forEach((v, k) => rates.set(k, v));
  }

  return symbols.map((s) => rates.get(s)).filter((r): r is FundingRate => Boolean(r));
}
