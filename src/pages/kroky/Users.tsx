import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users as UsersIcon, Crown, Pen, FileText, Briefcase, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { useKrokyUsers, useKrokyPayments } from '../../hooks/useKrokyData';
import { getProPurchaseDate, getTotalExports } from '../../lib/krokyFields';
import type { UserProfile } from '../../types';

type ProFilter = 'all' | 'pro' | 'non-pro';
type LocaleFilter = 'all' | 'uk' | 'pl' | 'en';
type PayFilter = 'all' | 'multi' | 'flagged';
type SortField = 'registered' | 'visits' | 'exports';
type SortDir = 'asc' | 'desc';
const PAGE_SIZE = 10;

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
  const [search, setSearch] = useState('');
  const [proFilter, setProFilter] = useState<ProFilter>('all');
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>('all');
  const [payFilter, setPayFilter] = useState<PayFilter>('all');
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

  useEffect(() => { setPage(1); }, [search, proFilter, localeFilter, payFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  if (loading || paymentsLoading) return <div className="text-text-muted">Loading...</div>;

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
          <div className="flex bg-surface border border-border rounded-lg p-0.5">
            {(['all', 'uk', 'pl', 'en'] as LocaleFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setLocaleFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  localeFilter === f
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {f === 'all' ? 'All' : f === 'uk' ? 'UA' : f.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex bg-surface border border-border rounded-lg p-0.5">
            {(['all', 'multi', 'flagged'] as PayFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setPayFilter(f)}
                title={f === 'multi' ? '≥2 Pro-оплати' : f === 'flagged' ? 'Підозрілі: малий інтервал між оплатами або роздутий Pro' : undefined}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  payFilter === f
                    ? (f === 'flagged' ? 'bg-red/15 text-red' : 'bg-accent/15 text-accent')
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {f === 'all' ? 'All' : f === 'multi' ? '≥2 Pro' : '⚠ Flagged'}
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
        <table className="w-full min-w-[800px]">
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
              <th className="px-4 py-3 text-xs font-medium text-text-muted" title="Кількість успішних Pro-оплат">Pro pays</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(u => {
              const now = new Date();
              const proActive = u.isPro && u.proExpiresAt && new Date(u.proExpiresAt) > now;
              const flag = flags.get(u.uid);
              const flagged = flag?.flagged ?? false;
              return (
                <tr key={u.uid} className={`border-b border-border last:border-0 transition-colors ${flagged ? 'bg-red/5 hover:bg-red/10' : 'hover:bg-surface-hover'}`}>
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
                        <div className={`text-sm hover:text-accent transition-colors ${flagged ? 'text-red font-medium' : proActive ? 'text-amber font-medium' : 'text-text-primary'}`}>{u.displayName || 'No name'}</div>
                        <div className="text-xs text-text-muted">{u.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{getSource(u)}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{u.visitCount ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{getTotalExports(u) || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    {flagged ? (
                      <span className="inline-flex items-center gap-1 text-red font-medium" title={flag?.reasons.join(' · ')}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {flag?.proPays ?? 0}
                      </span>
                    ) : (
                      <span className="text-text-secondary">{flag?.proPays ?? 0}</span>
                    )}
                  </td>
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
