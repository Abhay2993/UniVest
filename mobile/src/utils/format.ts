/** "$1,870,000" — full precision for commitment rows. */
export function formatMoney(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('en-US');
}

/** "$1.87M" / "$940K" — compact form for dense card layouts. */
export function formatMoneyCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `$${m >= 10 ? Math.round(m) : m.toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return formatMoney(amount);
}

/** "74.8%" with one decimal, clamped to [0, 100]. */
export function formatPct(ratio: number): string {
  return `${(Math.min(Math.max(ratio, 0), 1) * 100).toFixed(1)}%`;
}

/** "12 Jun 2025" from an ISO date string. */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
