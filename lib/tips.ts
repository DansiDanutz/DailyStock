// Daily trading-discipline tips, echoing the "操作检查清单 / 交易纪律"
// (operation checklist / trading discipline) section of the vendored
// daily_stock_analysis decision dashboard. Educational only — no advice.

export interface Tip {
  title: string;
  body: string;
  tag: 'Risk' | 'Discipline' | 'Psychology' | 'Crypto' | 'Process';
}

const TIPS: Tip[] = [
  { tag: 'Risk', title: 'Position sizing before conviction', body: 'Decide the maximum loss you can accept before entering, then size the position from that number — never the other way around.' },
  { tag: 'Discipline', title: 'Plan the exit with the entry', body: 'Write down your invalidation level and target before buying. If you can\'t name what would prove you wrong, you don\'t have a thesis yet.' },
  { tag: 'Psychology', title: 'Don\'t average down on a broken thesis', body: 'Adding to a loser is only valid if the original reason to own it is intact. If the story changed, the discount is a trap, not a gift.' },
  { tag: 'Crypto', title: 'Crypto trades 24/7 — you don\'t have to', body: 'Set alerts instead of watching charts overnight. Fatigue-driven decisions at 3am are where accounts go to shrink.' },
  { tag: 'Process', title: 'Review weekly, not tick by tick', body: 'Judge your process on a weekly review of closed trades, not on today\'s P&L. One good habit beats ten good guesses.' },
  { tag: 'Risk', title: 'Correlation is hidden concentration', body: 'Five tech stocks and two majors-tracking altcoins is closer to two positions than seven. Stress-test your basket as one trade.' },
  { tag: 'Discipline', title: 'Overbought is a condition, not a signal', body: 'High RSI can stay high for weeks in a strong trend. Use it to manage expectations and sizing, not as an automatic sell trigger.' },
  { tag: 'Psychology', title: 'FOMO is the market\'s most reliable tax', body: 'If your urge to buy comes from a green candle instead of your watchlist plan, close the tab and revisit tomorrow.' },
  { tag: 'Crypto', title: 'Volatility cuts both ways', body: 'A 10% daily move is normal for crypto majors and catastrophic for a leveraged position. Size crypto exposure for its volatility, not the stock playbook.' },
  { tag: 'Process', title: 'Cash is a position', body: 'Sitting out a choppy, signal-less market preserves both capital and judgment for when the setup is actually there.' },
  { tag: 'Risk', title: 'News spikes need wider stops or no trade', body: 'Around earnings and macro prints, spreads widen and stops get hunted. Either widen your risk budget or stand aside.' },
  { tag: 'Discipline', title: 'One setup, traded well, beats ten', body: 'Master a single repeatable pattern before collecting new ones. Edge comes from repetition, not variety.' },
];

/** Deterministic daily rotation — same 3 tips for everyone on a given date. */
export function getDailyTips(count = 3, date = new Date()): Tip[] {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  const start = dayIndex % TIPS.length;
  return Array.from({ length: count }, (_, i) => TIPS[(start + i) % TIPS.length]);
}
