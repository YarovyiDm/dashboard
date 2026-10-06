import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users as UsersIcon, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, LogIn, Globe, AlertTriangle } from 'lucide-react';
import {
  useKmetaUsers, useKmetaSubcounts, useKmetaPageReports, useKmetaPublicProfiles,
  kmetaEffectiveStatus, statusBadgeClass, KMETA_STATUS_LABEL, kmetaAcquisitionChannel,
  type TutorCounts, type KmetaStatus, type KmetaChannel,
} from '../../hooks/useKmetaData';
import { toDayMonthYear, toJsDate } from '../../lib/date';

const SITE = 'https://kmeta.com.ua';

type StatusFilter = 'all' | KmetaStatus;
type ChannelFilter = 'all' | 'ads' | 'organic' | 'direct';
type SortField = 'registered' | 'students' | 'groups' | 'lessons';
type SortDir = 'asc' | 'desc';
const PAGE_SIZE = 10;

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
  return <span className={`px-1 rounded text-[10px] shrink-0 ${tone}`}>{label}</span>;
}

export function KmetaUsers() {
  const { users, loading, connected, connect, error } = useKmetaUsers();
  const { counts, loading: countsLoading, available: countsAvailable } = useKmetaSubcounts(users);
  const { reports } = useKmetaPageReports(connected);
  const { profiles } = useKmetaPublicProfiles(connected);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [pageOnly, setPageOnly] = useState(false);
  const [newReportsOnly, setNewReportsOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('registered');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

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

  useEffect(() => { setPage(1); }, [search, statusFilter, channelFilter, pageOnly, newReportsOnly, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  if (!connected) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Kmeta Users</h1>
        <div className="bg-surface-card border border-border rounded-xl p-6 max-w-md">
          <p className="text-text-secondary mb-4">
            kmeta — окремий Firebase-проект. Підключи його, щоб побачити дані
            (окрема авторизація Google, потрібна один раз).
          </p>
          <button onClick={connect} className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
            <LogIn className="w-4 h-4" /> Підключити kmeta
          </button>
          {error && <p className="text-red text-sm mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  if (loading) return <div className="text-text-muted">Loading...</div>;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Kmeta Users</h1>
        <div className="bg-surface-card border border-border rounded-xl p-6 max-w-md">
          <p className="text-red text-sm mb-4">{error}</p>
          <button onClick={connect} className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
            <LogIn className="w-4 h-4" /> Спробувати ще
          </button>
        </div>
      </div>
    );
  }

  const cellCount = (uid: string, key: keyof TutorCounts): string | number => {
    if (!countsAvailable) return '—';
    const c = counts[uid];
    if (!c) return countsLoading ? '…' : '—';
    return c[key];
  };

  const sortableHead = (field: SortField, label: string) => (
    <th className="px-4 py-3 text-xs font-medium text-text-muted">
      <button
        onClick={() => toggleSort(field)}
        className={`inline-flex items-center gap-1 hover:text-text-primary transition-colors ${sortField === field ? 'text-text-primary' : ''}`}
      >
        {label}
        {sortField === field && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    </th>
  );

  const segmented = <T extends string>(opts: { v: T; label: string }[], value: T, set: (v: T) => void) => (
    <div className="flex bg-surface border border-border rounded-lg p-0.5">
      {opts.map(o => (
        <button
          key={o.v}
          onClick={() => set(o.v)}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${value === o.v ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <UsersIcon className="w-6 h-6" /> Users
          <span className="text-base font-normal text-text-muted">({users.length})</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {segmented(STATUS_FILTERS, statusFilter, setStatusFilter)}
          {segmented(CHANNEL_FILTERS, channelFilter, setChannelFilter)}
          <button
            onClick={() => setPageOnly(v => !v)}
            title="Has a booking page"
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${pageOnly ? 'bg-accent/15 text-accent border-accent/30' : 'bg-surface border-border text-text-muted hover:text-text-primary'}`}
          >
            Page
          </button>
          <button
            onClick={() => setNewReportsOnly(v => !v)}
            title="Has new (unreviewed) page reports"
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ${newReportsOnly ? 'bg-red/15 text-red border-red/30' : 'bg-surface border-border text-text-muted hover:text-text-primary'}`}
          >
            <AlertTriangle className="w-3 h-3" /> Reports
          </button>
          <input
            type="text"
            placeholder="Search by name, email, specialization..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted w-full sm:w-64 focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {!countsAvailable && (
        <p className="text-xs text-text-muted mb-4">
          Студенти / групи / уроки недоступні — дозволь адміну <code>read</code> підколекцій у Firestore rules kmeta.
        </p>
      )}

      <div className="bg-surface-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Tutor</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Specialization</th>
              {sortableHead('registered', 'Registered')}
              {sortableHead('students', 'Students')}
              {sortableHead('groups', 'Groups')}
              {sortableHead('lessons', 'Lessons')}
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Reports</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Pro until</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(u => {
              const status = kmetaEffectiveStatus(u);
              const channel = kmetaAcquisitionChannel(u);
              const rc = reportsByUid.get(u.uid);
              const published = u.publicSlug ? publishedBySlug.get(u.publicSlug) : undefined;
              return (
                <tr key={u.uid} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/kmeta/users/${u.uid}`} className="flex items-center gap-3 group min-w-0">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted text-xs shrink-0">
                            {(u.name || u.email || '?')[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm text-text-primary group-hover:text-accent transition-colors truncate">{u.name || 'No name'}</div>
                          <div className="text-xs text-text-muted flex items-center gap-1.5">
                            <span className="truncate">{u.email}</span>
                            {channelPill(channel)}
                          </div>
                        </div>
                      </Link>
                      {u.publicSlug && (
                        <a
                          href={`${SITE}/t/${u.publicSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={published === false ? 'Page (switched off)' : 'Open public page'}
                          className={`shrink-0 ${published === false ? 'text-text-muted' : 'text-green'} hover:opacity-80`}
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{u.specialization || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{toDayMonthYear(toJsDate(u.createdAt)?.toISOString() ?? null)}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{cellCount(u.uid, 'students')}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{cellCount(u.uid, 'groups')}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{cellCount(u.uid, 'lessons')}</td>
                  <td className="px-4 py-3 text-sm">
                    {!rc ? (
                      <span className="text-text-muted">—</span>
                    ) : rc.newCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red font-medium"><AlertTriangle className="w-3.5 h-3.5" />{rc.count}</span>
                    ) : (
                      <span className="text-text-secondary">{rc.count}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadgeClass(status)}>{KMETA_STATUS_LABEL[status]}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{toDayMonthYear(toJsDate(u.proExpiresAt)?.toISOString() ?? null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-text-muted">
          <div>Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-text-primary">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
