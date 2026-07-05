import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users as UsersIcon, Crown, Pen, FileText, Briefcase, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useKrokyUsers } from '../../hooks/useKrokyData';
import { getProPurchaseDate, getTotalExports } from '../../lib/krokyFields';
import type { UserProfile } from '../../types';

type ProFilter = 'all' | 'pro' | 'non-pro';
type SortField = 'registered' | 'visits' | 'exports';
type SortDir = 'asc' | 'desc';
const PAGE_SIZE = 10;

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
  const [search, setSearch] = useState('');
  const [proFilter, setProFilter] = useState<ProFilter>('all');
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
    return list;
  }, [users, search, proFilter, sortField, sortDir]);

  useEffect(() => { setPage(1); }, [search, proFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  if (loading) return <div className="text-text-muted">Loading...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <UsersIcon className="w-6 h-6" /> Users
          <span className="text-base font-normal text-text-muted">({users.length})</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-surface border border-border rounded-lg p-0.5">
            {(['all', 'pro', 'non-pro'] as ProFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setProFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  proFilter === f
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {f === 'all' ? 'All' : f === 'pro' ? 'Pro' : 'Non-Pro'}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by name, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted w-full sm:w-64 focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="bg-surface-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-text-muted">User</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">
                <button
                  onClick={() => toggleSort('registered')}
                  className={`inline-flex items-center gap-1 hover:text-text-primary transition-colors ${sortField === 'registered' ? 'text-text-primary' : ''}`}
                >
                  Registered
                  {sortField === 'registered' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Source</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">
                <button
                  onClick={() => toggleSort('visits')}
                  className={`inline-flex items-center gap-1 hover:text-text-primary transition-colors ${sortField === 'visits' ? 'text-text-primary' : ''}`}
                >
                  Visits
                  {sortField === 'visits' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">
                <button
                  onClick={() => toggleSort('exports')}
                  className={`inline-flex items-center gap-1 hover:text-text-primary transition-colors ${sortField === 'exports' ? 'text-text-primary' : ''}`}
                >
                  Exports
                  {sortField === 'exports' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(u => {
              const now = new Date();
              const proActive = u.isPro && u.proExpiresAt && new Date(u.proExpiresAt) > now;
              return (
                <tr key={u.uid} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/kroky/users/${u.uid}`} className="flex items-center gap-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted text-xs">
                          {(u.displayName || u.email || '?')[0]}
                        </div>
                      )}
                      <div>
                        <div className={`text-sm hover:text-accent transition-colors ${proActive ? 'text-amber font-medium' : 'text-text-primary'}`}>{u.displayName || 'No name'}</div>
                        <div className="text-xs text-text-muted">{u.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{getSource(u)}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{u.visitCount ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{getTotalExports(u) || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 items-center flex-wrap">
                      {proActive && (() => {
                        const purchasedAt = getProPurchaseDate(u);
                        return (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber/15 text-amber rounded text-xs"
                            title={purchasedAt ? `Куплено ${formatDate(purchasedAt)}` : undefined}
                          >
                            <Crown className="w-3 h-3" />
                            Pro
                            {purchasedAt && (
                              <span className="text-amber/70 font-normal ml-0.5">
                                · {formatDate(purchasedAt)}
                              </span>
                            )}
                          </span>
                        );
                      })()}
                      {(u.purchasedTemplates?.length || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green/15 text-green rounded text-xs">
                          <FileText className="w-3 h-3" /> {u.purchasedTemplates.length}
                        </span>
                      )}
                      {u.signaturePurchased && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent/15 text-accent rounded text-xs">
                          <Pen className="w-3 h-3" />
                        </span>
                      )}
                      {(u.applicationsCreated || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue/15 text-blue rounded text-xs">
                          <Briefcase className="w-3 h-3" /> {u.applicationsCreated}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
