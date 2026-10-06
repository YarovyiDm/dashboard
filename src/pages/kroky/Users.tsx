import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Pen, FileText, Briefcase, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, AlertTriangle, Search, X, SlidersHorizontal, Eye, Download } from 'lucide-react';
import { usePersistentState, oneOf } from '../../hooks/usePersistentState';
import { PageHeader, LoadingSkeleton, Avatar } from '../../components/ui';
import { stagger } from '../../lib/theme';
import { useKrokyUsers, useKrokyPayments } from '../../hooks/useKrokyData';
import { getProPurchaseDate, getTotalExports } from '../../lib/krokyFields';
import type { UserProfile } from '../../types';

type ProFilter = 'all' | 'pro' | 'non-pro';
type LocaleFilter = 'all' | 'uk' | 'pl' | 'ro' | 'en';
type PayFilter = 'all' | 'multi' | 'flagged';
type SortField = 'registered' | 'visits' | 'exports';
type SortDir = 'asc' | 'desc';
const PAGE_SIZE = 10;
const PRO_VALUES = ['all', 'pro', 'non-pro'] as const;
const LOCALE_VALUES = ['all', 'uk', 'pl', 'ro', 'en'] as const;
const PAY_VALUES = ['all', 'multi', 'flagged'] as const;
const SORT_FIELDS = ['registered', 'visits', 'exports'] as const;
const SORT_DIRS = ['asc', 'desc'] as const;
const isPage = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1;
// localStorage keys — filters survive reloads and opening a user and back.
const K = 'kroky.users.';

const DAY = 24 * 60 * 60 * 1000;
// Pro is a 30-day product, so two Pro charges closer than this look like a
// duplicate/callback-race rather than a real repeat purchase.
const MIN_GAP_DAYS = 10;
// A single Pro grant is ~30 days; more time left than this hints that two
// callbacks stacked two grants onto one payment.
const MAX_PRO_DAYS = 35;

interface UserFlag {
  proPays: number;
  flagged: boolean;
  reasons: string[];
}

function getSource(u: UserProfile): string {
  if (u.acquisition?.utmSource) return u.acquisition.utmSource;
  if (u.acquisition?.referrer) {
    try {
      const url = new URL(u.acquisition.referrer);
      const utm = url.searchParams.get('utm_source');
      if (utm) return utm;
      const host = url.hostname.replace(/^www\./, '');
      if (host && host !== 'kroky.com.ua') return host;
    } catch { /* */ }
  }
  return 'direct';
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function KrokyUsers() {
  const { users, loading } = useKrokyUsers();
  const { payments, loading: paymentsLoading } = useKrokyPayments();
  const [search, setSearch] = usePersistentState(K + 'search', '');
  const [proFilter, setProFilter] = usePersistentState<ProFilter>(K + 'pro', 'all', oneOf(PRO_VALUES));
  const [localeFilter, setLocaleFilter] = usePersistentState<LocaleFilter>(K + 'locale', 'all', oneOf(LOCALE_VALUES));
  const [payFilter, setPayFilter] = usePersistentState<PayFilter>(K + 'pay', 'all', oneOf(PAY_VALUES));
  const [sortField, setSortField] = usePersistentState<SortField>(K + 'sortField', 'registered', oneOf(SORT_FIELDS));
  const [sortDir, setSortDir] = usePersistentState<SortDir>(K + 'sortDir', 'desc', oneOf(SORT_DIRS));
  const [page, setPage] = usePersistentState(K + 'page', 1, isPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Payment-anomaly detection per user — to catch double charges / callback races.
  const flags = useMemo(() => {
    const now = Date.now();
    const proTimes = new Map<string, number[]>();
    payments.forEach(p => {
      if (p.status !== 'approved') return;
      if (!(p.templateId === 'pro' || p.productType === 'pro')) return;
      const t = new Date(p.purchasedAt || p.createdAt || 0).getTime();
      if (!Number.isFinite(t)) return;
      const arr = proTimes.get(p.uid);
      if (arr) arr.push(t); else proTimes.set(p.uid, [t]);
    });

    const map = new Map<string, UserFlag>();
    users.forEach(u => {
      const times = (proTimes.get(u.uid) ?? []).slice().sort((a, b) => a - b);
      let minGap = Infinity;
      for (let i = 1; i < times.length; i++) minGap = Math.min(minGap, (times[i] - times[i - 1]) / DAY);

      const smallGap = times.length > 1 && minGap < MIN_GAP_DAYS;
      const expMs = u.proExpiresAt ? new Date(u.proExpiresAt).getTime() : NaN;
      const daysLeft = Number.isFinite(expMs) ? (expMs - now) / DAY : null;
      const inflatedPro = daysLeft !== null && daysLeft > MAX_PRO_DAYS;

      const reasons: string[] = [];
      if (smallGap) reasons.push(`2+ Pro-оплати з інтервалом ${minGap < 1 ? '<1' : Math.round(minGap)} дн (норма ≥${MIN_GAP_DAYS})`);
      if (inflatedPro) reasons.push(`Pro активний ще ${Math.round(daysLeft as number)} дн (норма ≤~30)`);

      map.set(u.uid, { proPays: times.length, flagged: smallGap || inflatedPro, reasons });
    });
    return map;
  }, [users, payments]);

  const filtered = useMemo(() => {
    const now = new Date();
    let list = [...users].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'visits') {
        return ((a.visitCount ?? 0) - (b.visitCount ?? 0)) * dir;
      }
      if (sortField === 'exports') {
        return (getTotalExports(a) - getTotalExports(b)) * dir;
      }
      return (a.createdAt || '').localeCompare(b.createdAt || '') * dir;
    });
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
      );
    }
    if (proFilter !== 'all') {
      list = list.filter(u => {
        const active = !!(u.isPro && u.proExpiresAt && new Date(u.proExpiresAt) > now);
        return proFilter === 'pro' ? active : !active;
      });
    }
    if (localeFilter !== 'all') {
      list = list.filter(u => {
        const loc = u.acquisition?.signupLocale;
        // Legacy users without a signupLocale are treated as Ukrainian.
        return localeFilter === 'uk' ? (loc === 'uk' || !loc) : loc === localeFilter;
      });
    }
    if (payFilter === 'multi') {
      list = list.filter(u => (flags.get(u.uid)?.proPays ?? 0) > 1);
    } else if (payFilter === 'flagged') {
      list = list.filter(u => flags.get(u.uid)?.flagged);
    }
    return list;
  }, [users, flags, search, proFilter, localeFilter, payFilter, sortField, sortDir]);

  // Back to page 1 when filters change — but not on mount, so the restored
  // page survives opening a user and coming back.
  const filterKey = JSON.stringify([search, proFilter, localeFilter, payFilter, sortField, sortDir]);
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return;
    lastFilterKey.current = filterKey;
    setPage(1);
  }, [filterKey, setPage]);

  const activeFilters = (proFilter !== 'all' ? 1 : 0) + (localeFilter !== 'all' ? 1 : 0) + (payFilter !== 'all' ? 1 : 0) + (search ? 1 : 0);
  const resetFilters = () => { setSearch(''); setProFilter('all'); setLocaleFilter('all'); setPayFilter('all'); };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  if (loading || paymentsLoading) return <LoadingSkeleton rows={2} />;

  const now = new Date();
  const isActivePro = (u: UserProfile) => !!(u.isPro && u.proExpiresAt && new Date(u.proExpiresAt) > now);

  const segmented = <T extends string>(opts: { v: T; label: string; title?: string; danger?: boolean }[], value: T, set: (v: T) => void) => (
    <div className="flex shrink-0 bg-surface-card border border-border rounded-xl p-1">
      {opts.map(o => (
        <button
          key={o.v}
          onClick={() => set(o.v)}
          title={o.title}
          className={`k-chip px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap ${
            value === o.v
              ? o.danger ? 'bg-red text-white' : 'bg-accent text-[#1d1503] shadow-[0_4px_14px_-6px_var(--k-gold-glow)]'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const sortableHead = (field: SortField, label: string) => (
    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
      <button
        onClick={() => toggleSort(field)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-text-primary transition-colors ${sortField === field ? 'text-accent' : ''}`}
      >
        {label}
        {sortField === field && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    </th>
  );
  const plainHead = (label: string, title?: string) => (
    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted" title={title}>{label}</th>
  );

  const badges = (u: UserProfile): ReactNode => {
    const purchasedAt = isActivePro(u) ? getProPurchaseDate(u) : null;
    return (
      <div className="flex gap-1.5 items-center flex-wrap">
        {isActivePro(u) && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 bg-accent/15 text-accent rounded-full text-[11px] font-semibold"
            title={purchasedAt ? `Куплено ${formatDate(purchasedAt)}` : undefined}>
            <Crown className="w-3 h-3" /> Pro{purchasedAt && <span className="text-accent/70 font-medium">· {formatDate(purchasedAt)}</span>}
          </span>
        )}
        {(u.purchasedTemplates?.length || 0) > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green/15 text-green rounded-full text-[11px] font-semibold">
            <FileText className="w-3 h-3" /> {u.purchasedTemplates.length}
          </span>
        )}
        {u.signaturePurchased && (
          <span className="inline-flex items-center px-2 py-0.5 bg-[var(--k-teal)]/15 text-[var(--k-teal)] rounded-full text-[11px]">
            <Pen className="w-3 h-3" />
          </span>
        )}
        {(u.applicationsCreated || 0) > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue/15 text-blue rounded-full text-[11px] font-semibold">
            <Briefcase className="w-3 h-3" /> {u.applicationsCreated}
          </span>
        )}
      </div>
    );
  };

  const payCell = (uid: string) => {
    const flag = flags.get(uid);
    return flag?.flagged ? (
      <span className="inline-flex items-center gap-1 text-red font-semibold" title={flag.reasons.join(' · ')}>
        <AlertTriangle className="w-3.5 h-3.5" />{flag.proPays}
      </span>
    ) : <span className="text-text-secondary">{flag?.proPays ?? 0}</span>;
  };

  return (
    <div className="max-w-7xl">
      <PageHeader
        eyebrow="kroky"
        title={<>Users <span className="text-text-muted font-bold text-xl align-middle ml-1">{users.length}</span></>}
        subtitle={activeFilters > 0 ? <>Знайдено <span className="text-accent font-semibold">{filtered.length}</span> · фільтри збережено</> : 'Усі користувачі kroky'}
      />

      {/* Filters */}
      <div className="k-rise space-y-3 mb-4 sm:mb-5" style={stagger(1)}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name, email, UID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-card border border-border rounded-xl pl-10 pr-10 py-3 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 focus:ring-4 focus:ring-accent/10 transition-shadow [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-muted hover:text-text-primary" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="k-rail flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {segmented([{ v: 'all', label: 'All' }, { v: 'pro', label: 'Pro' }, { v: 'non-pro', label: 'Non-Pro' }], proFilter, setProFilter)}
          {segmented(LOCALE_VALUES.map(v => ({ v, label: v === 'all' ? 'All' : v === 'uk' ? 'UA' : v.toUpperCase() })), localeFilter, setLocaleFilter)}
          {segmented([
            { v: 'all', label: 'All' },
            { v: 'multi', label: '≥2 Pro', title: '≥2 Pro-оплати' },
            { v: 'flagged', label: '⚠ Flagged', title: 'Підозрілі: малий інтервал між оплатами або роздутий Pro', danger: true },
          ], payFilter, setPayFilter)}
          {activeFilters > 0 && (
            <button onClick={resetFilters} className="k-chip k-fade shrink-0 inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl text-text-muted hover:text-red">
              <X className="w-3.5 h-3.5" /> Скинути ({activeFilters})
            </button>
          )}
        </div>
        <div className="md:hidden flex items-center gap-2 text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted" />
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value as SortField)}
            className="bg-surface-card border border-border rounded-lg px-2.5 py-1 text-base text-text-primary focus:outline-none focus:border-accent/60"
          >
            <option value="registered">Registered</option>
            <option value="visits">Visits</option>
            <option value="exports">Exports</option>
          </select>
          <button
            onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
            className="k-chip inline-flex items-center gap-1 bg-surface-card border border-border rounded-lg px-2.5 py-1.5 text-text-primary"
          >
            {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {sortDir === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="k-card k-fade p-10 text-center">
          <div className="text-text-secondary font-semibold mb-1">Нікого не знайдено</div>
          <div className="text-sm text-text-muted mb-4">Спробуй змінити фільтри</div>
          {activeFilters > 0 && <button onClick={resetFilters} className="k-btn-gold px-4 py-2 rounded-xl text-sm">Скинути фільтри</button>}
        </div>
      )}

      {/* Mobile: cards */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-2.5" key={`m-${currentPage}-${filterKey}`}>
          {paginated.map((u, idx) => {
            const flagged = flags.get(u.uid)?.flagged ?? false;
            return (
              <Link key={u.uid} to={`/kroky/users/${u.uid}`}
                className={`k-card k-rise block p-3.5 active:scale-[0.99] transition-transform ${flagged ? 'ring-1 ring-red/40' : ''}`} style={stagger(idx)}>
                <div className="flex items-center gap-3">
                  <Avatar src={u.photoURL ?? undefined} name={u.displayName || u.email || '?'} size={42} gold={isActivePro(u)} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[15px] font-bold truncate ${flagged ? 'text-red' : 'text-text-primary'}`}>{u.displayName || 'No name'}</div>
                    <div className="text-xs text-text-muted truncate">{u.email}</div>
                  </div>
                  <span className="text-[11px] text-text-muted shrink-0">{formatDate(u.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/70">
                  <div className="flex items-center gap-3.5 text-xs text-text-secondary">
                    <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-text-muted" />{u.visitCount ?? 0}</span>
                    <span className="inline-flex items-center gap-1"><Download className="w-3.5 h-3.5 text-text-muted" />{getTotalExports(u)}</span>
                    <span className="inline-flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-text-muted" />{payCell(u.uid)}</span>
                  </div>
                  {badges(u)}
                </div>
                <div className="text-[11px] text-text-muted mt-2 truncate">{getSource(u)}</div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Desktop: table */}
      {filtered.length > 0 && (
        <div className="hidden md:block k-card k-rise overflow-x-auto" style={stagger(2)}>
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-border text-left">
                {plainHead('User')}
                {sortableHead('registered', 'Registered')}
                {plainHead('Source')}
                {sortableHead('visits', 'Visits')}
                {sortableHead('exports', 'Exports')}
                {plainHead('Pro pays', 'Кількість успішних Pro-оплат')}
                {plainHead('Status')}
              </tr>
            </thead>
            <tbody key={`d-${currentPage}-${filterKey}`}>
              {paginated.map((u, idx) => {
                const flagged = flags.get(u.uid)?.flagged ?? false;
                return (
                  <tr key={u.uid} style={stagger(idx)}
                    className={`k-rise border-b border-border/60 last:border-0 transition-colors ${flagged ? 'bg-red/5 hover:bg-red/10' : 'hover:bg-surface-hover/70'}`}>
                    <td className="px-4 py-3">
                      <Link to={`/kroky/users/${u.uid}`} className="flex items-center gap-3 group min-w-0">
                        <Avatar src={u.photoURL ?? undefined} name={u.displayName || u.email || '?'} size={34} gold={isActivePro(u)} />
                        <div className="min-w-0">
                          <div className={`text-sm font-semibold truncate group-hover:text-accent transition-colors ${flagged ? 'text-red' : 'text-text-primary'}`}>{u.displayName || 'No name'}</div>
                          <div className="text-xs text-text-muted truncate">{u.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary max-w-40 truncate">{getSource(u)}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{u.visitCount ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-text-primary font-semibold tabular-nums">{getTotalExports(u) || '—'}</td>
                    <td className="px-4 py-3 text-sm">{payCell(u.uid)}</td>
                    <td className="px-4 py-3">{badges(u)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 mt-4 text-sm text-text-muted">
          <div className="text-xs sm:text-sm">{pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="k-chip grid place-items-center w-10 h-10 rounded-xl border border-border bg-surface-card hover:border-accent/40 hover:text-accent disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-text-primary font-semibold tabular-nums min-w-14 text-center">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="k-chip grid place-items-center w-10 h-10 rounded-xl border border-border bg-surface-card hover:border-accent/40 hover:text-accent disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
