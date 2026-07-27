import { useEffect, useMemo, useState } from 'react';
import { Users as UsersIcon, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, LogIn } from 'lucide-react';
import { useKmetaUsers, useKmetaSubcounts, planBadgeClass, type TutorCounts } from '../../hooks/useKmetaData';
import { toDayMonthYear, toJsDate } from '../../lib/date';

type PlanFilter = 'all' | 'free' | 'pro' | 'cancelled';
type SortField = 'registered' | 'students' | 'groups' | 'lessons';
type SortDir = 'asc' | 'desc';
const PAGE_SIZE = 10;

export function KmetaUsers() {
  const { users, loading, connected, connect, error } = useKmetaUsers();
  const { counts, loading: countsLoading, available: countsAvailable } = useKmetaSubcounts(users);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [sortField, setSortField] = useState<SortField>('registered');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
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
    if (planFilter !== 'all') {
      list = list.filter(u => (u.plan ?? 'free') === planFilter);
    }
    return list;
  }, [users, counts, search, planFilter, sortField, sortDir]);

  useEffect(() => { setPage(1); }, [search, planFilter, sortField, sortDir]);

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
          <button
            onClick={connect}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Підключити kmeta
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
          <button
            onClick={connect}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Спробувати ще
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <UsersIcon className="w-6 h-6" /> Users
          <span className="text-base font-normal text-text-muted">({users.length})</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-surface border border-border rounded-lg p-0.5">
            {(['all', 'free', 'pro', 'cancelled'] as PlanFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setPlanFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  planFilter === f
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by name, email, specialization..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted w-full sm:w-72 focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {!countsAvailable && (
        <p className="text-xs text-text-muted mb-4">
          Студенти / групи / уроки недоступні — дозволь адміну <code>read</code> підколекцій
          у Firestore rules kmeta.
        </p>
      )}

      <div className="bg-surface-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Tutor</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Specialization</th>
              {sortableHead('registered', 'Registered')}
              {sortableHead('students', 'Students')}
              {sortableHead('groups', 'Groups')}
              {sortableHead('lessons', 'Lessons')}
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Plan</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Pro until</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(u => (
              <tr key={u.uid} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted text-xs">
                        {(u.name || u.email || '?')[0]}
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-text-primary">{u.name || 'No name'}</div>
                      <div className="text-xs text-text-muted">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{u.specialization || '—'}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {toDayMonthYear(toJsDate(u.createdAt)?.toISOString() ?? null)}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{cellCount(u.uid, 'students')}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{cellCount(u.uid, 'groups')}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{cellCount(u.uid, 'lessons')}</td>
                <td className="px-4 py-3">
                  <span className={planBadgeClass(u.plan)}>{u.plan ?? 'free'}</span>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {toDayMonthYear(toJsDate(u.proExpiresAt)?.toISOString() ?? null)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-text-muted">
          <div>
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-text-primary">
              {currentPage} / {totalPages}
            </span>
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
