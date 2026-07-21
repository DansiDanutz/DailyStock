# DailyStock 📈

Daily stock & crypto **decision dashboard** — a web frontend built on the analysis concepts of
[ZhuLinsen/daily_stock_analysis](https://github.com/ZhuLinsen/daily_stock_analysis) (vendored in
[`daily_stock_analysis/`](daily_stock_analysis/), MIT licensed).

Every card blends trend structure (price vs SMA20/SMA50), momentum (5d/20d) and RSI into a single
0–100 composite score, with support/resistance zones from the last 20 sessions — for a curated US
large-cap watchlist **and** the top crypto assets (stablecoins excluded). A daily-rotating
"trading discipline" tips section echoes the upstream project's operation checklist.

## Stack

- **Next.js 15** (App Router, React Server Components, ISR — data revalidates every 15 min)
- Zero client-side JS for the dashboard — sparklines and score dials are pure SVG
- **Data**: Yahoo Finance chart API (with Stooq CSV fallback) for equities & indices, CoinGecko free API for crypto. No API keys required.
- Deployed on **Vercel**

## Develop

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build (tsc + next)
```

## Structure

```
app/                  # Next.js App Router pages + global styles
components/           # AssetCard, ScoreDial, Sparkline (server components)
lib/                  # indicators (SMA/RSI/score), stock & crypto fetchers, tips
daily_stock_analysis/ # vendored upstream Python engine (unmodified, MIT)
```

## Automation

- `.github/workflows/hourly-refresh.yml` pings `/` and `/intel` hourly so the
  ISR cache regenerates even with zero traffic — data is never more than ~1h stale.
- Planned research lane on top of [HKUDS/Vibe-Trading](https://github.com/HKUDS/Vibe-Trading):
  see [docs/VIBE-TRADING.md](docs/VIBE-TRADING.md).

## Disclaimer

Scores and zones are deterministic technical calculations, **not recommendations**.
Nothing on the site is financial advice. Market data comes from free, delayed,
best-effort endpoints.
