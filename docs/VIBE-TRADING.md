# Vibe-Trading integration plan

[HKUDS/Vibe-Trading](https://github.com/HKUDS/Vibe-Trading) (MIT) evaluated 2026-07-21.

## What it is

An open-source **personal trading agent platform** (Python 3.11+, FastAPI + React):

- **Alpha Zoo**: 460+ registered academic factors (alpha101, qlib158, fundamental
  quality/value, betting-against-beta, correlation-regime…)
- **Backtest engine** with look-ahead-bias guards, strict OOS validation, causal
  rebalances, real cost modeling
- **Shadow Account**: paper-trading validation layer with mined entry gates
- **Strategy Development Manager**: turns papers into registered factors with
  automated IC/Sharpe decay monitoring (active → monitoring → decayed → disabled)
- 88 bundled skills, 12 broker connectors, MCP server, scheduled research,
  LLM-provider-agnostic (Anthropic, GLM/zhipu, Kimi, DeepSeek, Ollama…)

## Why it is NOT vendored into this site

It is an interactive agent service (Docker, LLM keys, broker credentials) —
the opposite shape of this zero-key, zero-server static site. Embedding it
would be architecture soup.

## How it fits (research lane)

Run Vibe-Trading as the **offline research engine**; the site stays the
public display layer:

1. Vibe-Trading runs locally / on a droplet with a cheap-capable LLM (GLM),
   using its scheduled-research + Shadow Account features on the site's
   watchlist symbols.
2. A scheduled job exports its output (factor scores, strategy status,
   Shadow Account P&L, decay states) as **static JSON artifacts** committed
   to this repo or pushed to blob storage.
3. The site renders a "Research lab" page from those artifacts — same
   pattern as `/intel`: server components, ISR, graceful absence.

The hourly-refresh GitHub Action (`.github/workflows/hourly-refresh.yml`)
is the natural delivery hook: the same cadence that warms the ISR cache can
later pull fresh research artifacts.

**Blocked on**: operator go-ahead for LLM usage (provider + budget) and
choosing where the engine runs (Mac Studio vs droplet). No code in this repo
depends on it today.
