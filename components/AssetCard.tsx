import Sparkline from './Sparkline';
import ScoreDial from './ScoreDial';
import { Signals, TREND_LABEL } from '@/lib/indicators';

export interface AssetCardProps {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  changePct: number | null; // headline change (1d stocks / 24h crypto)
  changeLabel: string; // "1D" | "24H"
  sparkline: number[];
  signals: Signals;
  secondaryChange?: { label: string; value: number | null };
}

const fmtPrice = (v: number) =>
  v >= 1000
    ? v.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : v >= 1
      ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : v.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

const fmtPct = (v: number | null) =>
  v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const chgClass = (v: number | null) => (v === null ? 'flat' : v >= 0.02 ? 'up' : v <= -0.02 ? 'down' : 'flat');

export default function AssetCard(props: AssetCardProps) {
  const { rank, symbol, name, price, changePct, changeLabel, sparkline, signals, secondaryChange } = props;
  const positive = (changePct ?? 0) >= 0;
  return (
    <article className={`asset-card${rank === 1 ? ' rank-1' : ''}`}>
      <span className="rank-badge">#{rank}</span>
      <div className="card-top">
        <div className="asset-id">
          <div className="sym">{symbol}</div>
          <div className="name">{name}</div>
        </div>
        <div className="price-block">
          <div className="px">${fmtPrice(price)}</div>
          <div className={`chg ${chgClass(changePct)}`}>
            {fmtPct(changePct)} <span style={{ color: 'var(--text-faint)' }}>{changeLabel}</span>
          </div>
          {secondaryChange && (
            <div className={`chg ${chgClass(secondaryChange.value)}`} style={{ fontSize: 'var(--text-xs)' }}>
              {fmtPct(secondaryChange.value)} <span style={{ color: 'var(--text-faint)' }}>{secondaryChange.label}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card-mid">
        <div className="spark">
          <Sparkline values={sparkline} positive={positive} id={symbol.toLowerCase()} />
        </div>
        <ScoreDial score={signals.score} />
      </div>

      <div className="trend-row">
        <span className={`trend-pill ${signals.trend}`}>{TREND_LABEL[signals.trend]}</span>
        <span className="rsi-note">RSI {signals.rsi14 === null ? '—' : Math.round(signals.rsi14)}</span>
      </div>

      {(signals.supportZone !== null || signals.resistanceZone !== null) && (
        <div className="zones">
          <div className="zone support">
            <span className="z-label">Support zone</span>
            <span className="z-val">{signals.supportZone === null ? '—' : `$${fmtPrice(signals.supportZone)}`}</span>
          </div>
          <div className="zone resistance">
            <span className="z-label">Resistance zone</span>
            <span className="z-val">{signals.resistanceZone === null ? '—' : `$${fmtPrice(signals.resistanceZone)}`}</span>
          </div>
        </div>
      )}
    </article>
  );
}
