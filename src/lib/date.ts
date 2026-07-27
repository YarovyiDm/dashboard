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

// Coerce a value that may be an ISO string, a JS Date, or a Firestore
// Timestamp ({ toDate() } / { seconds }) into a Date, or null if unparseable.
// Guards against `new Date(x).toISOString()` throwing on invalid input.
export function toJsDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'object') {
    const o = v as { toDate?: () => Date; seconds?: number };
    if (typeof o.toDate === 'function') {
      const d = o.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
    if (typeof o.seconds === 'number') return new Date(o.seconds * 1000);
    return null;
  }
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d;
}
