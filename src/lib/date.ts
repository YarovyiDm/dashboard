// Ukrainian date display: day first, then month. Pure string formatting on the
// ISO prefix (YYYY-MM-DD…) so results never shift across timezones.

export function toDayMonth(iso?: string | null): string {
  if (!iso) return '';
  const [, m, d] = iso.slice(0, 10).split('-');
  return d && m ? `${d}.${m}` : '';
}

export function toDayMonthYear(iso?: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}.${m}.${y}` : '—';
}
