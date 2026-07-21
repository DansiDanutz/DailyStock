import Link from 'next/link';
import { getCryptoCards } from '@/lib/crypto';
import { getIntelBundle, INTEL_SYMBOLS } from '@/lib/zmarty';
import { fuse, FusionVerdict } from '@/lib/fusion';
import type { Metadata } from 'next';

export const revalidate = 300; // 5 min — intelligence moves faster than the daily board

export const metadata: Metadata = {
  title: 'Crypto Intelligence — DailyStock × Zmarty',
  description:
    'Win-rate-filtered smart signals, 47-indicator multi-timeframe alignment, live liquidation flow and triple-lens confluence verdicts. Educational only — not financial advice.',
};

const fmtUsd = (v: number) =>
  v >= 1_000_000_000 ? `$${(v / 1_000_000_000).toFixed(2)}B`
  : v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000 ? `$${(v / 1_000).toFixed(1)}K`
  : `$${v.toFixed(0)}`;

const fmtPrice = (v: number) =>
  v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  : v >= 1 ? v.toLocaleString('en-US', { maximumFractionDigits: 2 })
  : v.toLocaleString('en-US', { maximumFractionDigits: 4 });

const biasClass = (bias: string) => {
  const b = bias.toUpperCase();
  if (b.includes('LONG') || b.includes('BULL')) return 'up';
  if (b.includes('SHORT') || b.includes('BEAR')) return 'down';
  return 'flat';
};

const voteGlyph = (v: 1 | 0 | -1) => (v === 1 ? '▲' : v === -1 ? '▼' : '•');
const voteClass = (v: 1 | 0 | -1) => (v === 1 ? 'up' : v === -1 ? 'down' : 'flat');

function VerdictCard({ v, price }: { v: FusionVerdict; price: number | null }) {
  return (
    <article className={`verdict-card ${v.verdict}`}>
      <div className="verdict-top">
        <span className="sym">{v.symbol}</span>
        {price !== null && <span className="px">${fmtPrice(price)}</span>}
      </div>
      <div className={`verdict-label ${v.verdict}`}>{v.label}</div>
      <p className="verdict-detail">{v.detail}</p>
      <div className="lens-row">
        <span className={`lens ${voteClass(v.votes.momentum)}`} title="DailyStock composite momentum score">
          {voteGlyph(v.votes.momentum)} Momentum
        </span>
        <span className={`lens ${voteClass(v.votes.alignment)}`} title="Zmarty 47-indicator multi-timeframe alignment">
          {voteGlyph(v.votes.alignment)} Indicators
        </span>
        <span className={`lens ${voteClass(v.votes.liquidation)}`} title="24h liquidation-flow pressure">
          {voteGlyph(v.votes.liquidation)} Liq flow
        </span>
      </div>
    </article>
  );
}

export default async function IntelPage() {
  const [bundle, cryptoCards] = await Promise.all([getIntelBundle(), getCryptoCards(20)]);
  const bySymbol = new Map(cryptoCards.map((c) => [c.symbol, c]));

  const verdicts = INTEL_SYMBOLS.map((sym) =>
    fuse(sym, bySymbol.get(sym)?.signals ?? null, bundle.alignments.get(sym) ?? null, bundle.liquidations.get(sym) ?? null)
  ).sort((a, b) => {
    const rank = (v: FusionVerdict) =>
      v.verdict === 'bullish-confluence' || v.verdict === 'bearish-confluence' ? 2 : v.verdict === 'divergence' ? 1 : 0;
    return rank(b) - rank(a);
  });

  const liqRows = INTEL_SYMBOLS.map((s) => bundle.liquidations.get(s)).filter(
    (l): l is NonNullable<typeof l> => Boolean(l)
  );
  const market24h = liqRows.reduce(
    (acc, l) => {
      const w = l.windows.find((x) => x.window === '24h');
      if (w) { acc.total += w.total; acc.long += w.long; acc.short += w.short; }
      return acc;
    },
    { total: 0, long: 0, short: 0 }
  );

  const alignRows = INTEL_SYMBOLS.map((s) => bundle.alignments.get(s)).filter(
    (a): a is NonNullable<typeof a> => Boolean(a)
  );
  const tfColumns = alignRows[0]?.timeframes.map((t) => t.timeframe) ?? [];
  const generatedAt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

  return (
    <div className="container">
      <header className="site-header">
        <div className="brand">
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <span className="brand-mark">Daily<span className="tick">▲</span>Stock</span>
          </Link>
          <span className="brand-sub">Crypto Intelligence</span>
        </div>
        <div className="header-meta">
          <span className="live-dot" aria-hidden="true" />
          <span>updated {generatedAt} UTC · refreshes 5 min</span>
        </div>
      </header>

      <section className="hero" aria-labelledby="intel-hero">
        <h1 id="intel-hero">
          Three systems. <span className="accent">One verdict.</span>
        </h1>
        <p>
          Powered by the <a href="https://zmarty.me" target="_blank" rel="noopener noreferrer">Zmarty</a> intelligence
          engine: signals only count when they pass a backtested win-rate filter, 47 indicators vote across five
          timeframes, and live liquidation flow shows where leverage is actually being punished. A directional call
          appears here only when independent systems agree.
        </p>
        <span className="disclaimer-chip">Educational only — not financial advice</span>
      </section>

      <section aria-labelledby="confluence-heading">
        <div className="section-head">
          <h2 id="confluence-heading">
            <span className="kicker">Fusion · momentum × indicators × liquidations</span>
            Confluence board
          </h2>
          <span className="meta">confluence requires ≥2 agreeing lenses, zero dissent</span>
        </div>
        <div className="card-grid">
          {verdicts.map((v) => (
            <VerdictCard key={v.symbol} v={v} price={bundle.liquidations.get(v.symbol)?.currentPrice ?? bySymbol.get(v.symbol)?.price ?? null} />
          ))}
        </div>
      </section>

      <section aria-labelledby="signals-heading">
        <div className="section-head">
          <h2 id="signals-heading">
            <span className="kicker">Zmarty smart signals · proven-edge filter</span>
            Signals that already win
          </h2>
          {bundle.signals.available && <span className="meta">{bundle.signals.filter}</span>}
        </div>
        {!bundle.signals.available ? (
          <div className="empty-note">Signal service unreachable right now — it refreshes automatically.</div>
        ) : bundle.signals.signals.length === 0 ? (
          <div className="signal-empty">
            <span className="signal-empty-badge">0 ACTIVE</span>
            <div>
              <strong>No setup passes the filter right now.</strong>
              <p>
                Only signals with a backtested win rate above 65% make it through — and today nothing qualifies.
                That is the strategy working, not failing: the edge comes from refusing every trade that hasn&apos;t
                historically paid. Flat is a position.
              </p>
            </div>
          </div>
        ) : (
          <div className="card-grid">
            {bundle.signals.signals.map((s, i) => (
              <article className="asset-card" key={i}>
                <div className="signal-kv">
                  {Object.entries(s.raw)
                    .filter(([, val]) => ['string', 'number', 'boolean'].includes(typeof val))
                    .slice(0, 8)
                    .map(([k, val]) => (
                      <div key={k} className="kv-row">
                        <span className="kv-key">{k.replace(/_/g, ' ')}</span>
                        <span className="kv-val">{String(val)}</span>
                      </div>
                    ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="liq-heading">
        <div className="section-head">
          <h2 id="liq-heading">
            <span className="kicker">Derivatives · where leverage gets punished</span>
            Liquidation flow
          </h2>
          {market24h.total > 0 && (
            <span className="meta">
              24h across board: {fmtUsd(market24h.total)} liquidated · {((market24h.short / market24h.total) * 100).toFixed(0)}% shorts
            </span>
          )}
        </div>
        {liqRows.length === 0 ? (
          <div className="empty-note">Liquidation service unreachable right now — it refreshes automatically.</div>
        ) : (
          <div className="liq-list">
            {liqRows.map((l) => {
              const w24 = l.windows.find((x) => x.window === '24h');
              const shortShare = w24 && w24.total > 0 ? w24.short / w24.total : null;
              return (
                <div className="liq-row" key={l.symbol}>
                  <div className="liq-id">
                    <span className="sym">{l.symbol}</span>
                    {l.currentPrice !== null && <span className="liq-px">${fmtPrice(l.currentPrice)}</span>}
                  </div>
                  <div className="liq-bar-wrap">
                    {shortShare !== null ? (
                      <>
                        <div className="liq-bar" role="img" aria-label={`24h liquidations: ${((1 - shortShare) * 100).toFixed(0)}% longs, ${(shortShare * 100).toFixed(0)}% shorts`}>
                          <i className="longs" style={{ width: `${(1 - shortShare) * 100}%` }} />
                          <i className="shorts" style={{ width: `${shortShare * 100}%` }} />
                        </div>
                        <div className="liq-legend">
                          <span className="down">longs {fmtUsd(w24!.long)}</span>
                          <span className="up">shorts {fmtUsd(w24!.short)}</span>
                        </div>
                      </>
                    ) : (
                      <span className="rsi-note">no 24h data</span>
                    )}
                  </div>
                  <div className="liq-meta">
                    <span className="rsi-note">24h {w24 ? fmtUsd(w24.total) : '—'}</span>
                    {shortShare !== null && (
                      <span className={`trend-pill ${shortShare >= 0.65 ? 'bullish' : shortShare <= 0.35 ? 'bearish' : 'neutral'}`}>
                        {shortShare >= 0.65 ? 'Short squeeze' : shortShare <= 0.35 ? 'Long flush' : 'Two-sided'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="section-note">
          Shorts liquidate when price rises; longs when it falls. A window dominated by one side shows which
          crowd is being forced out — and forced exits are fuel for the move that caused them.
        </p>
      </section>

      <section aria-labelledby="mtf-heading">
        <div className="section-head">
          <h2 id="mtf-heading">
            <span className="kicker">Zmarty engine · 47 indicators per timeframe</span>
            Multi-timeframe alignment
          </h2>
          <span className="meta">share of indicators voting long per timeframe</span>
        </div>
        {alignRows.length === 0 ? (
          <div className="empty-note">Alignment service unreachable right now — it refreshes automatically.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="watch-table mtf-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  {tfColumns.map((tf) => <th key={tf}>{tf}</th>)}
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {alignRows.map((a) => (
                  <tr key={a.symbol}>
                    <td><span className="sym">{a.symbol}</span></td>
                    {a.timeframes.map((t) => {
                      const net = t.longPct - t.shortPct;
                      const cls = net >= 10 ? 'up' : net <= -10 ? 'down' : 'flat';
                      return (
                        <td key={t.timeframe}>
                          <span className={`mtf-cell chg ${cls}`} title={`${t.indicatorCount} indicators: ${t.longPct.toFixed(0)}% long / ${t.shortPct.toFixed(0)}% short`}>
                            {net >= 10 ? '▲' : net <= -10 ? '▼' : '•'} {t.longPct.toFixed(0)}%
                          </span>
                        </td>
                      );
                    })}
                    <td><span className={`chg ${biasClass(a.overallBias)}`}>{a.overallBias}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="cta-heading" className="intel-cta">
        <h2 id="cta-heading">Want the full engine?</h2>
        <p>
          This page shows the surface. The full Zmarty platform adds AI chat analysis, portfolio reports,
          alerts, paper-trade tracking and the complete indicator suite.
        </p>
        <a className="cta-btn" href="https://zmarty.me" target="_blank" rel="noopener noreferrer">
          Explore Zmarty →
        </a>
      </section>

      <footer className="site-footer">
        <span>
          Intelligence: <a href="https://zmarty.me" target="_blank" rel="noopener noreferrer">Zmarty</a> live API ·
          Prices: CoinGecko · <Link href="/">← Daily board</Link>
        </span>
        <span>
          Verdicts are deterministic fusions of independent quantitative systems, not recommendations.
          Nothing here is financial advice. Leverage trading can exceed your deposit — size accordingly.
        </span>
      </footer>
    </div>
  );
}
