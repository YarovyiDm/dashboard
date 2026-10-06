import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Globe, AlertTriangle, Search, X, SlidersHorizontal, GraduationCap, Layers, BookOpen } from 'lucide-react';
import {
  useKmetaUsers, useKmetaSubcounts, useKmetaPageReports, useKmetaPublicProfiles,
  kmetaEffectiveStatus, statusBadgeClass, KMETA_STATUS_LABEL, kmetaAcquisitionChannel,
  type TutorCounts, type KmetaStatus, type KmetaChannel,
} from '../../hooks/useKmetaData';
import { toDayMonthYear, toJsDate } from '../../lib/date';
import { usePersistentState, oneOf } from '../../hooks/usePersistentState';
import { PageHeader, ConnectGate, LoadingSkeleton, Avatar } from '../../components/ui';
import { stagger } from '../../lib/theme';

const SITE = 'https://kmeta.com.ua';

type StatusFilter = 'all' | KmetaStatus;
type ChannelFilter = 'all' | 'ads' | 'organic' | 'direct';
type SortField = 'registered' | 'students' | 'groups' | 'lessons';
type SortDir = 'asc' | 'desc';
const PAGE_SIZE = 10;

const STATUS_VALUES = ['all', 'free', 'pro', 'pro_ending', 'cancelled'] as const;
const CHANNEL_VALUES = ['all', 'ads', 'organic', 'direct'] as const;
const SORT_FIELDS = ['registered', 'students', 'groups', 'lessons'] as const;
const SORT_DIRS = ['asc', 'desc'] as const;
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isPage = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1;
// localStorage keys — filters survive reloads and navigating to a tutor and back.
const K = 'kmeta.users.';

const STATUS_FILTERS: { v: StatusFilter; label: string }[] = [
  { v: 'all', label: 'All' },
  { v: 'free', label: 'Free' },
  { v: 'pro', label: 'Pro' },
  { v: 'pro_ending', label: 'Ending' },
  { v: 'cancelled', label: 'Cancelled' },
];
const CHANNEL_FILTERS: { v: ChannelFilter; label: string }[] = [
  { v: 'all', label: 'All' },
  { v: 'ads', label: 'Ads' },
  { v: 'organic', label: 'Org' },
  { v: 'direct', label: 'Dir' },
];

function channelPill(ch: KmetaChannel) {
  if (ch === 'unknown') return null;
  const tone = ch === 'ads' ? 'bg-blue/15 text-blue' : ch === 'organic' ? 'bg-green/15 text-green' : 'bg-surface-hover text-text-muted';
  const label = ch === 'ads' ? 'Ads' : ch === 'organic' ? 'Org' : 'Dir';
  return <span className={`px-1.5 py-px rounded-full text-[10px] font-semibold shrink-0 ${tone}`}>{label}</span>;
}

export function KmetaUsers() {
  const { users, loading, connected, connect, error } = useKmetaUsers();
  const { counts, loading: countsLoading, available: countsAvailable } = useKmetaSubcounts(users);
  const { reports } = useKmetaPageReports(connected);
  const { profiles } = useKmetaPublicProfiles(connected);
  const [search, setSearch] = usePersistentState(K + 'search', '');
  const [statusFilter, setStatusFilter] = usePersistentState<StatusFilter>(K + 'status', 'all', oneOf(STATUS_VALUES));
  const [channelFilter, setChannelFilter] = usePersistentState<ChannelFilter>(K + 'channel', 'all', oneOf(CHANNEL_VALUES));
  const [pageOnly, setPageOnly] = usePersistentState(K + 'pageOnly', false, isBool);
  const [newReportsOnly, setNewReportsOnly] = usePersistentState(K + 'newReportsOnly', false, isBool);
  const [sortField, setSortField] = usePersistentState<SortField>(K + 'sortField', 'registered', oneOf(SORT_FIELDS));
  const [sortDir, setSortDir] = usePersistentState<SortDir>(K + 'sortDir', 'desc', oneOf(SORT_DIRS));
  const [page, setPage] = usePersistentState(K + 'page', 1, isPage);

  const reportsByUid = useMemo(() => {
    const m = new Map<string, { count: number; newCount: number }>();
    (reports ?? []).forEach(r => {
      if (!r.uid) return;
      const e = m.get(r.uid) || { count: 0, newCount: 0 };
      e.count++;
      if ((r.status || 'new') === 'new') e.newCount++;
      m.set(r.uid, e);
    });
    return m;
  }, [reports]);

  const publishedBySlug = useMemo(() => {
    const m = new Map<string, boolean>();
    (profiles ?? []).forEach(p => { if (p.slug) m.set(p.slug, !!p.enabled); });
    return m;
  }, [profiles]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    const cnt = (uid: string, key: keyof TutorCounts) => counts[uid]?.[key] ?? 0;
    let list = [...users].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'students') return (cnt(a.uid, 'students') - cnt(b.uid, 'students')) * dir;
      if (sortField === 'groups') return (cnt(a.uid, 'groups') - cnt(b.uid, 'groups')) * dir;
      if (sortField === 'lessons') return (cnt(a.uid, 'lessons') - cnt(b.uid, 'lessons')) * dir;
      const ta = toJsDate(a.createdAt)?.getTime() ?? 0;
      const tb = toJsDate(b.createdAt)?.getTime() ?? 0;
      return (ta - tb) * dir;
    });
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.specialization || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter(u => kmetaEffectiveStatus(u) === statusFilter);
    if (channelFilter !== 'all') list = list.filter(u => kmetaAcquisitionChannel(u) === channelFilter);
    if (pageOnly) list = list.filter(u => !!u.publicSlug);
    if (newReportsOnly) list = list.filter(u => (reportsByUid.get(u.uid)?.newCount ?? 0) > 0);
    return list;
  }, [users, counts, search, statusFilter, channelFilter, pageOnly, newReportsOnly, reportsByUid, sortField, sortDir]);

  // Back to page 1 when filters change — but not on mount, so the restored
  // page survives opening a tutor and coming back.
  const filterKey = JSON.stringify([search, statusFilter, channelFilter, pageOnly, newReportsOnly, sortField, sortDir]);
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return;
    lastFilterKey.current = filterKey;
    setPage(1);
  }, [filterKey, setPage]);

  const activeFilters = (statusFilter !== 'all' ? 1 : 0) + (channelFilter !== 'all' ? 1 : 0) + (pageOnly ? 1 : 0) + (newReportsOnly ? 1 : 0) + (search ? 1 : 0);
  const resetFilters = () => {
    setSearch(''); setStatusFilter('all'); setChannelFilter('all'); setPageOnly(false); setNewReportsOnly(false);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  if (!connected) return <ConnectGate title="Users" error={error} onConnect={connect} />;
  if (loading) return <LoadingSkeleton rows={2} />;
  if (error) return <ConnectGate title="Users" error={error} onConnect={connect} retry />;

  const cellCount = (uid: string, key: keyof TutorCounts): string | number => {
    if (!countsAvailable) return '—';
    const c = counts[uid];
    if (!c) return countsLoading ? '…' : '—';
    return c[key];
  };

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
  const plainHead = (label: string) => (
    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</th>
  );

  const segmented = <T extends string>(opts: { v: T; label: string }[], value: T, set: (v: T) => void) => (
    <div className="flex shrink-0 bg-surface-card border border-border rounded-xl p-1">
      {opts.map(o => (
        <button
          key={o.v}
          onClick={() => set(o.v)}
          className={`k-chip px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap ${value === o.v ? 'bg-accent text-[#1d1503] shadow-[0_4px_14px_-6px_var(--k-gold-glow)]' : 'text-text-muted hover:text-text-primary'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const toggle = (on: boolean, onClick: () => void, children: ReactNode, title: string, danger = false) => (
    <button
      onClick={onClick}
      title={title}
      className={`k-chip shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border whitespace-nowrap ${
        on
          ? danger ? 'bg-red/15 text-red border-red/40' : 'bg-accent/15 text-accent border-accent/40'
          : 'bg-surface-card border-border text-text-muted hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );

  const reportCell = (uid: string) => {
    const rc = reportsByUid.get(uid);
    if (!rc) return <span className="text-text-muted">—</span>;
    if (rc.newCount > 0) return <span className="inline-flex items-center gap-1 text-red font-semibold"><AlertTriangle className="w-3.5 h-3.5" />{rc.count}</span>;
    return <span className="text-text-secondary">{rc.count}</span>;
  };

  const pageLink = (slug: string | undefined, size = 'w-4 h-4') => {
    if (!slug) return null;
    const published = publishedBySlug.get(slug);
    return (
      <a
        href={`${SITE}/t/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        title={published === false ? 'Page (switched off)' : 'Open public page'}
        className={`shrink-0 grid place-items-center w-7 h-7 rounded-lg ${published === false ? 'text-text-muted bg-surface-hover' : 'text-green bg-green/10'} hover:opacity-80`}
      >
        <Globe className={size} />
      </a>
    );
  };

  const fmtD = (v: unknown) => toDayMonthYear(toJsDate(v)?.toISOString() ?? null);

  return (
    <div className="max-w-7xl">
      <PageHeader
        eyebrow="kmeta"
        title={<>Users <span className="text-text-muted font-bold text-xl align-middle ml-1">{users.length}</span></>}
        subtitle={activeFilters > 0 ? <>Знайдено <span className="text-accent font-semibold">{filtered.length}</span> · фільтри збережено</> : 'Усі тьютори kmeta'}
      />

      {/* Filters */}
      <div className="k-rise space-y-3 mb-4 sm:mb-5" style={stagger(1)}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name, email, specialization…"
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
          {segmented(STATUS_FILTERS, statusFilter, setStatusFilter)}
          {segmented(CHANNEL_FILTERS, channelFilter, setChannelFilter)}
          {toggle(pageOnly, () => setPageOnly(v => !v), <><Globe className="w-3.5 h-3.5" /> Page</>, 'Has a booking page')}
          {toggle(newReportsOnly, () => setNewReportsOnly(v => !v), <><AlertTriangle className="w-3.5 h-3.5" /> Reports</>, 'Has new (unreviewed) page reports', true)}
          {activeFilters > 0 && (
            <button onClick={resetFilters} className="k-chip k-fade shrink-0 inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl text-text-muted hover:text-red">
              <X className="w-3.5 h-3.5" /> Скинути ({activeFilters})
            </button>
          )}
        </div>
        {/* Mobile sort */}
        <div className="md:hidden flex items-center gap-2 text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted" />
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value as SortField)}
            className="bg-surface-card border border-border rounded-lg px-2.5 py-1 text-base text-text-primary focus:outline-none focus:border-accent/60"
          >
            <option value="registered">Registered</option>
            <option value="students">Students</option>
            <option value="groups">Groups</option>
            <option value="lessons">Lessons</option>
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

      {!countsAvailable && (
        <p className="text-xs text-text-muted mb-4">
          Студенти / групи / уроки недоступні — дозволь адміну <code>read</code> підколекцій у Firestore rules kmeta.
        </p>
      )}

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
            const status = kmetaEffectiveStatus(u);
            const isPro = status === 'pro' || status === 'pro_ending';
            return (
              <Link key={u.uid} to={`/kmeta/users/${u.uid}`} className="k-card k-rise block p-3.5 active:scale-[0.99] transition-transform" style={stagger(idx)}>
                <div className="flex items-center gap-3">
                  <Avatar src={u.photoURL} name={u.name || u.email} size={42} gold={isPro} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-text-primary truncate">{u.name || 'No name'}</span>
                      {channelPill(kmetaAcquisitionChannel(u))}
                    </div>
                    <div className="text-xs text-text-muted truncate">{u.email}</div>
                  </div>
                  {pageLink(u.publicSlug)}
                </div>
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/70">
                  <div className="flex items-center gap-3.5 text-xs text-text-secondary">
                    <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5 text-text-muted" />{cellCount(u.uid, 'students')}</span>
                    <span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-text-muted" />{cellCount(u.uid, 'groups')}</span>
                    <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-text-muted" />{cellCount(u.uid, 'lessons')}</span>
                    {reportsByUid.get(u.uid) && <span className="text-xs">{reportCell(u.uid)}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-text-muted">{fmtD(u.createdAt)}</span>
                    <span className={statusBadgeClass(status)}>{KMETA_STATUS_LABEL[status]}</span>
                  </div>
                </div>
                {u.specialization && <div className="text-xs text-text-muted mt-2 truncate">{u.specialization}</div>}
              </Link>
            );
          })}
        </div>
      )}

      {/* Desktop: table */}
      {filtered.length > 0 && (
        <div className="hidden md:block k-card k-rise overflow-x-auto" style={stagger(2)}>
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-border text-left">
                {plainHead('Tutor')}
                {plainHead('Specialization')}
                {sortableHead('registered', 'Registered')}
                {sortableHead('students', 'Students')}
                {sortableHead('groups', 'Groups')}
                {sortableHead('lessons', 'Lessons')}
                {plainHead('Reports')}
                {plainHead('Status')}
                {plainHead('Pro until')}
              </tr>
            </thead>
            <tbody key={`d-${currentPage}-${filterKey}`}>
              {paginated.map((u, idx) => {
                const status = kmetaEffectiveStatus(u);
                const isPro = status === 'pro' || status === 'pro_ending';
                return (
                  <tr key={u.uid} className="k-rise border-b border-border/60 last:border-0 hover:bg-surface-hover/70 transition-colors" style={stagger(idx)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/kmeta/users/${u.uid}`} className="flex items-center gap-3 group min-w-0 flex-1">
                          <Avatar src={u.photoURL} name={u.name || u.email} size={34} gold={isPro} />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">{u.name || 'No name'}</div>
                            <div className="text-xs text-text-muted flex items-center gap-1.5">
                              <span className="truncate">{u.email}</span>
                              {channelPill(kmetaAcquisitionChannel(u))}
                            </div>
                          </div>
                        </Link>
                        {pageLink(u.publicSlug)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{u.specialization || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{fmtD(u.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-text-primary font-semibold tabular-nums">{cellCount(u.uid, 'students')}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{cellCount(u.uid, 'groups')}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{cellCount(u.uid, 'lessons')}</td>
                    <td className="px-4 py-3 text-sm">{reportCell(u.uid)}</td>
                    <td className="px-4 py-3"><span className={statusBadgeClass(status)}>{KMETA_STATUS_LABEL[status]}</span></td>
                    <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{fmtD(u.proExpiresAt)}</td>
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
