import AssetCard from '@/components/AssetCard';
import { getStockCards, getIndexQuotes } from '@/lib/stocks';
import { getCryptoCards } from '@/lib/crypto';
import { getDailyTips } from '@/lib/tips';
import { TREND_LABEL } from '@/lib/indicators';

export const revalidate = 900; // refresh data every 15 minutes

const fmtPct = (v: number | null) => (v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`);
const pctClass = (v: number | null) => (v === null ? 'flat' : v >= 0 ? 'up' : 'down');
const scoreColor = (s: number) => (s >= 58 ? 'var(--up)' : s >= 43 ? 'var(--neutral)' : 'var(--down)');

export default async function Home() {
  const [stocks, cryptos, indices] = await Promise.all([
    getStockCards(),
    getCryptoCards(9),
    getIndexQuotes(),
  ]);
  const tips = getDailyTips(3);
  const topStocks = stocks.slice(0, 6);
  const restStocks = stocks.slice(6);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
  const generatedAt = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  });

  return (
    <>
      <div className="container">
        <header className="site-header">
          <div className="brand">
            <span className="brand-mark">Daily<span className="tick">▲</span>Stock</span>
            <span className="brand-sub">Decision Dashboard</span>
          </div>
          <div className="header-meta">
            <a className="nav-link" href="/intel">Crypto Intel →</a>
            <span className="live-dot" aria-hidden="true" />
            <span>{today} · {generatedAt} UTC · auto-refresh hourly</span>
          </div>
        </header>

        {indices.length > 0 && (
          <div className="index-strip" role="list" aria-label="Market indices">
            {indices.map((q) => (
              <span className="index-chip" role="listitem" key={q.label}>
                <span className="label">{q.label}</span>
                <span>{q.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                <span className={`chg ${pctClass(q.changePct)}`}>{fmtPct(q.changePct)}</span>
              </span>
            ))}
          </div>
        )}

        <section className="hero" aria-labelledby="hero-heading">
          <h1 id="hero-heading">
            Today&apos;s strongest setups, <span className="accent">scored daily.</span>
          </h1>
          <p>
            A web take on the open-source <a href="https://github.com/ZhuLinsen/daily_stock_analysis" target="_blank" rel="noopener noreferrer">daily_stock_analysis</a> decision
            dashboard: each card blends trend structure, momentum and RSI into a single 0–100 score,
            with support and resistance zones from the last 20 sessions — across top stocks and crypto.
          </p>
          <span className="disclaimer-chip">Educational only — not financial advice</span>
        </section>

        <section aria-labelledby="stocks-heading">
          <div className="section-head">
            <h2 id="stocks-heading">
              <span className="kicker">Equities · US large caps</span>
              Today&apos;s top stock cards
            </h2>
            <span className="meta">ranked by composite score · refreshed every 15 min</span>
          </div>
          {topStocks.length === 0 ? (
            <div className="empty-note">
              Market data is momentarily unavailable from upstream providers. It refreshes automatically — check back in a few minutes.
            </div>
          ) : (
            <div className="card-grid">
              {topStocks.map((s, i) => (
                <AssetCard
                  key={s.symbol}
                  rank={i + 1}
                  symbol={s.symbol}
                  name={s.name}
                  price={s.price}
                  changePct={s.signals.change1d}
                  changeLabel="1D"
                  sparkline={s.sparkline}
                  signals={s.signals}
                  secondaryChange={{ label: '20D', value: s.signals.change20d }}
                  winRate={s.winRate}
                />
              ))}
            </div>
          )}
        </section>

        {restStocks.length > 0 && (
          <section aria-labelledby="watchlist-heading">
            <div className="section-head">
              <h2 id="watchlist-heading">
                <span className="kicker">Equities · full watchlist</span>
                Rest of the board
              </h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="watch-table">
                <thead>
                  <tr>
                    <th>Asset</th><th>Price</th><th>1D</th><th>20D</th><th>RSI</th><th>Trend</th><th>Win rate</th><th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {restStocks.map((s) => (
                    <tr key={s.symbol}>
                      <td><span className="sym">{s.symbol}</span> <span className="nm">{s.name}</span></td>
                      <td>${s.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className={`chg ${pctClass(s.signals.change1d)}`}>{fmtPct(s.signals.change1d)}</td>
                      <td className={`chg ${pctClass(s.signals.change20d)}`}>{fmtPct(s.signals.change20d)}</td>
                      <td>{s.signals.rsi14 === null ? '—' : Math.round(s.signals.rsi14)}</td>
                      <td>{TREND_LABEL[s.signals.trend]}</td>
                      <td>
                        {s.winRate ? (
                          <span
                            className={`chg ${s.winRate.winRatePct >= 55 ? 'up' : s.winRate.winRatePct < 45 ? 'down' : 'flat'}`}
                            title={`${s.winRate.direction === 'up' ? 'Up' : 'Down'} over next ${s.winRate.horizonDays} sessions in ${s.winRate.winRatePct}% of ${s.winRate.sampleSize} similar past setups`}
                          >
                            {s.winRate.winRatePct}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className="score-cell">
                          {s.signals.score}
                          <span className="score-bar"><i style={{ width: `${s.signals.score}%`, background: scoreColor(s.signals.score) }} /></span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section aria-labelledby="crypto-heading">
          <div className="section-head">
            <h2 id="crypto-heading">
              <span className="kicker">Crypto · top caps, stables excluded</span>
              Crypto radar
            </h2>
            <span className="meta">7-day structure · 24h &amp; 7d change · via CoinGecko</span>
          </div>
          {cryptos.length === 0 ? (
            <div className="empty-note">
              Crypto data is momentarily unavailable from CoinGecko. It refreshes automatically — check back in a few minutes.
            </div>
          ) : (
            <div className="card-grid">
              {cryptos.map((c, i) => (
                <AssetCard
                  key={c.id}
                  rank={i + 1}
                  symbol={c.symbol}
                  name={c.name}
                  price={c.price}
                  changePct={c.change24h}
                  changeLabel="24H"
                  sparkline={c.sparkline}
                  signals={c.signals}
                  secondaryChange={{ label: '7D', value: c.change7d }}
                  winRate={c.winRate}
                />
              ))}
            </div>
          )}
          <div className="intel-teaser">
            <p>
              <strong>Go deeper:</strong> win-rate-filtered smart signals, 47-indicator timeframe alignment and
              live liquidation flow from the Zmarty engine — fused into one confluence verdict per coin.
            </p>
            <a className="cta-btn" href="/intel">Open Crypto Intelligence →</a>
          </div>
        </section>

        <section aria-labelledby="tips-heading">
          <div className="section-head">
            <h2 id="tips-heading">
              <span className="kicker">Daily discipline</span>
              Three tips for today
            </h2>
            <span className="meta">rotates daily</span>
          </div>
          <div className="tips-grid">
            {tips.map((t) => (
              <article className="tip-card" key={t.title}>
                <span className="tip-tag">{t.tag}</span>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="site-footer">
          <span>
            Built on the analysis concepts of{' '}
            <a href="https://github.com/ZhuLinsen/daily_stock_analysis" target="_blank" rel="noopener noreferrer">ZhuLinsen/daily_stock_analysis</a> (MIT).
            Market data: Yahoo Finance / Stooq / CoinGecko free endpoints — delayed and best-effort.
          </span>
          <span>
            Scores and zones are deterministic technical calculations, not recommendations. Win rates are
            walk-forward historical frequencies (same-setup days, 5-session horizon, ~6-month window) — past
            frequency is not future probability. Nothing here is financial advice; do your own research and
            never risk money you cannot afford to lose.
          </span>
        </footer>
      </div>
    </>
  );
}
