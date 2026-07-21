// Open-source / free market-pulse trackers, all keyless and server-side:
//   - Fear & Greed Index — alternative.me
//   - Global market snapshot + trending coins — CoinGecko
//   - DeFi TVL by chain — DefiLlama (open source)
//   - BTC network status — mempool.space (open source)
// Every fetcher degrades to null so the page renders with whatever is up.

const REVALIDATE_SECONDS = 900;
const TIMEOUT_MS = 15_000;

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- Fear & Greed ----------

export interface FearGreed {
  value: number;
  label: string;
  yesterdayValue: number | null;
}

export async function getFearGreed(): Promise<FearGreed | null> {
  const json = await getJson('https://api.alternative.me/fng/?limit=2');
  const today = json?.data?.[0];
  if (!today) return null;
  const value = Number(today.value);
  if (!Number.isFinite(value)) return null;
  return {
    value,
    label: String(today.value_classification ?? ''),
    yesterdayValue: Number.isFinite(Number(json.data?.[1]?.value)) ? Number(json.data[1].value) : null,
  };
}

// ---------- Global market ----------

export interface GlobalMarket {
  totalMarketCapUsd: number;
  marketCapChange24hPct: number | null;
  btcDominancePct: number | null;
  ethDominancePct: number | null;
  activeCryptos: number | null;
}

export async function getGlobalMarket(): Promise<GlobalMarket | null> {
  const json = await getJson('https://api.coingecko.com/api/v3/global');
  const d = json?.data;
  const mcap = Number(d?.total_market_cap?.usd);
  if (!Number.isFinite(mcap)) return null;
  return {
    totalMarketCapUsd: mcap,
    marketCapChange24hPct: Number.isFinite(Number(d.market_cap_change_percentage_24h_usd))
      ? Number(d.market_cap_change_percentage_24h_usd)
      : null,
    btcDominancePct: Number.isFinite(Number(d.market_cap_percentage?.btc)) ? Number(d.market_cap_percentage.btc) : null,
    ethDominancePct: Number.isFinite(Number(d.market_cap_percentage?.eth)) ? Number(d.market_cap_percentage.eth) : null,
    activeCryptos: Number.isFinite(Number(d.active_cryptocurrencies)) ? Number(d.active_cryptocurrencies) : null,
  };
}

// ---------- Trending coins ----------

export interface TrendingCoin {
  name: string;
  symbol: string;
  marketCapRank: number | null;
  change24hPct: number | null;
}

export async function getTrendingCoins(limit = 7): Promise<TrendingCoin[]> {
  const json = await getJson('https://api.coingecko.com/api/v3/search/trending');
  const coins: any[] = json?.coins ?? [];
  return coins.slice(0, limit).map((c) => {
    const item = c.item ?? {};
    const chg = Number(item.data?.price_change_percentage_24h?.usd);
    return {
      name: String(item.name ?? '?'),
      symbol: String(item.symbol ?? '?').toUpperCase(),
      marketCapRank: Number.isFinite(Number(item.market_cap_rank)) ? Number(item.market_cap_rank) : null,
      change24hPct: Number.isFinite(chg) ? chg : null,
    };
  });
}

// ---------- DeFi TVL by chain (DefiLlama) ----------

export interface ChainTvl {
  name: string;
  tvlUsd: number;
}

export async function getTopChainsTvl(limit = 6): Promise<ChainTvl[]> {
  const json = await getJson('https://api.llama.fi/v2/chains');
  if (!Array.isArray(json)) return [];
  return json
    .filter((c: any) => Number.isFinite(Number(c.tvl)) && c.name)
    .sort((a: any, b: any) => Number(b.tvl) - Number(a.tvl))
    .slice(0, limit)
    .map((c: any) => ({ name: String(c.name), tvlUsd: Number(c.tvl) }));
}

// ---------- BTC network (mempool.space) ----------

export interface BtcNetwork {
  fastestFee: number;
  halfHourFee: number;
  economyFee: number;
  mempoolTxCount: number | null;
}

export async function getBtcNetwork(): Promise<BtcNetwork | null> {
  const [fees, mempool] = await Promise.all([
    getJson('https://mempool.space/api/v1/fees/recommended'),
    getJson('https://mempool.space/api/mempool'),
  ]);
  if (!fees || !Number.isFinite(Number(fees.fastestFee))) return null;
  return {
    fastestFee: Number(fees.fastestFee),
    halfHourFee: Number(fees.halfHourFee ?? fees.fastestFee),
    economyFee: Number(fees.economyFee ?? fees.fastestFee),
    mempoolTxCount: Number.isFinite(Number(mempool?.count)) ? Number(mempool.count) : null,
  };
}

// ---------- Bundle ----------

export interface PulseBundle {
  fearGreed: FearGreed | null;
  global: GlobalMarket | null;
  trending: TrendingCoin[];
  chains: ChainTvl[];
  btcNetwork: BtcNetwork | null;
}

export async function getPulseBundle(): Promise<PulseBundle> {
  const [fearGreed, global, trending, chains, btcNetwork] = await Promise.all([
    getFearGreed(),
    getGlobalMarket(),
    getTrendingCoins(),
    getTopChainsTvl(),
    getBtcNetwork(),
  ]);
  return { fearGreed, global, trending, chains, btcNetwork };
}
