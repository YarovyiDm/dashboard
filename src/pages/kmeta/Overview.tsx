import { useMemo } from 'react';
import { Users, Crown, UserPlus, LogIn, BookOpen, Layers, GraduationCap, DollarSign, Globe, Calendar, UserCheck, Flag } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import {
  useKmetaUsers, useKmetaSubcounts, useKmetaRevenue, isKmetaPro, kmetaEffectiveStatus,
  useKmetaPublicProfiles, useKmetaBookingRequests, useKmetaPageReports, useKmetaConvertedTrials,
  kmetaAcquisitionChannel, type KmetaChannel,
} from '../../hooks/useKmetaData';
import { toDayMonth, toJsDate } from '../../lib/date';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PRO_PRICE = 149;
// Pro payments made before subscriptionPayments logging existed — they have no
// records in the DB, so they're added as a fixed legacy baseline.
// TODO: drop once these are backfilled into subscriptionPayments.
const LEGACY_PRO_PAYMENTS = 4;
// Of each 149 UAH charge, this much reaches the account after WayForPay's fee.
const WAYFORPAY_PAYOUT_RATIO = 146 / 149;
// 5% ФОП single tax + 1% військовий збір.
const TOTAL_TAX = 0.06;

export function KmetaOverview() {
  const { users, loading, connected, connect, error } = useKmetaUsers();
  const { totals, loading: countsLoading, available: countsAvailable } = useKmetaSubcounts(users);
  const { payments: subPayments } = useKmetaRevenue(connected);
  const { profiles } = useKmetaPublicProfiles(connected);
  const { requests } = useKmetaBookingRequests(connected);
  const { reports } = useKmetaPageReports(connected);
  const { count: convertedTrials, available: convertedAvailable } = useKmetaConvertedTrials(connected);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newThisWeek = users.filter(u => {
      const d = toJsDate(u.createdAt);
      return d ? d >= weekAgo : false;
    }).length;
    const proUsers = users.filter(isKmetaPro).length;

    const statusCounts: Record<'free' | 'pro' | 'pro_ending' | 'cancelled', number> =
      { free: 0, pro: 0, pro_ending: 0, cancelled: 0 };
    users.forEach(u => { statusCounts[kmetaEffectiveStatus(u)]++; });

    return { totalUsers: users.length, proUsers, newThisWeek, statusCounts };
  }, [users]);

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    users.forEach(u => {
      const d = toJsDate(u.createdAt);
      if (d) {
        const day = d.toISOString().slice(0, 10);
        if (day in days) days[day]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({ date: toDayMonth(date), count }));
  }, [users]);

  // Subscription revenue from the collection-group read, split by currency and
  // new vs renewal, plus the fixed legacy UAH baseline for pre-logging payments.
  const revenue = useMemo(() => {
    const list = subPayments ?? [];
    let uahLogged = 0, eur = 0, renewals = 0, newLogged = 0;
    list.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.currency === 'EUR') eur += amt; else uahLogged += amt;
      if (p.isRenewal) renewals++; else newLogged++;
    });
    const uahGross = LEGACY_PRO_PAYMENTS * PRO_PRICE + uahLogged;
    return {
      uahGross,
      uahNet: uahGross * WAYFORPAY_PAYOUT_RATIO * (1 - TOTAL_TAX),
      eur,
      paymentsCount: LEGACY_PRO_PAYMENTS + list.length,
      newCount: LEGACY_PRO_PAYMENTS + newLogged,
      renewals,
    };
  }, [subPayments]);

  const bookingStats = useMemo(() => {
    const list = requests ?? [];
    const by = { new: 0, accepted: 0, declined: 0 };
    list.forEach(r => {
      if (r.status === 'new') by.new++;
      else if (r.status === 'accepted') by.accepted++;
      else if (r.status === 'declined') by.declined++;
    });
    return { total: list.length, ...by };
  }, [requests]);

  const reportStats = useMemo(() => {
    const list = reports ?? [];
    return {
      total: list.length,
      newCount: list.filter(r => r.status === 'new').length,
      tutors: new Set(list.map(r => r.uid || r.slug)).size,
    };
  }, [reports]);

  const acq = useMemo(() => {
    const channels: Record<KmetaChannel, number> = { ads: 0, organic: 0, direct: 0, unknown: 0 };
    const byCampaign = new Map<string, { signups: number; pro: number }>();
    const byTerm = new Map<string, { signups: number; pro: number }>();
    const bump = (m: Map<string, { signups: number; pro: number }>, key: string | undefined, pro: boolean) => {
      if (!key) return;
      const e = m.get(key) || { signups: 0, pro: 0 };
      e.signups++; if (pro) e.pro++;
      m.set(key, e);
    };
    users.forEach(u => {
      channels[kmetaAcquisitionChannel(u)]++;
      const pro = isKmetaPro(u);
      bump(byCampaign, u.acquisition?.utmCampaign, pro);
      bump(byTerm, u.acquisition?.utmTerm, pro);
    });
    const top = (m: Map<string, { signups: number; pro: number }>) =>
      [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.signups - a.signups).slice(0, 8);
    return { channels, topCampaigns: top(byCampaign), topTerms: top(byTerm) };
  }, [users]);

  if (!connected) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Kmeta Overview</h1>
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

  if (loading) {
    return <div className="text-text-muted">Loading...</div>;
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Kmeta Overview</h1>
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

  const total = (n: number): string | number => (!countsAvailable ? '—' : countsLoading ? '…' : n);
  const createdPages = users.filter(u => u.publicSlug).length;
  const publishedPages = (profiles ?? []).filter(p => p.enabled).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Kmeta Overview</h1>

      {/* Users summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Active Pro" value={stats.proUsers} icon={<Crown className="w-5 h-5" />} />
        <StatCard label="New this week" value={stats.newThisWeek} icon={<UserPlus className="w-5 h-5" />} />
      </div>

      {/* Subscription revenue: logged payments + legacy baseline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-secondary text-sm">Revenue</span>
            <span className="text-text-muted"><DollarSign className="w-5 h-5" /></span>
          </div>
          <div className="text-2xl font-semibold text-text-primary">
            {Math.round(revenue.uahGross).toLocaleString()} UAH{revenue.eur > 0 ? ` · ${Math.round(revenue.eur).toLocaleString()} EUR` : ''}
          </div>
          <div className="mt-2 text-xs text-text-muted">
            {revenue.paymentsCount} оплат · {revenue.newCount} нові / {revenue.renewals} продовж. · {LEGACY_PRO_PAYMENTS} legacy
          </div>
        </div>
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-secondary text-sm">Net UAH (after fees & tax)</span>
          </div>
          <div className="text-2xl font-semibold text-green">{Math.round(revenue.uahNet).toLocaleString()} UAH</div>
          <div className="mt-2 text-xs text-text-muted">
            WayForPay 146/149 · −5% ФОП −1% ЗЗ
          </div>
        </div>
      </div>

      {/* Activity totals across all tutors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Lessons" value={total(totals.lessons)} icon={<BookOpen className="w-5 h-5" />} />
        <StatCard label="Groups" value={total(totals.groups)} icon={<Layers className="w-5 h-5" />} />
        <StatCard label="Students" value={total(totals.students)} icon={<GraduationCap className="w-5 h-5" />} />
      </div>
      {!countsAvailable && (
        <p className="text-xs text-text-muted mb-8">
          Уроки / групи / студенти недоступні — треба дозволити адміну <code>read</code> підколекцій
          у Firestore rules kmeta (isAdmin на <code>{'/users/{uid}/{document=**}'}</code>).
        </p>
      )}
      {countsAvailable && <div className="mb-4" />}

      {/* Plan breakdown */}
      <div className="bg-surface-card border border-border rounded-xl p-5 mb-8">
        <h2 className="text-sm text-text-secondary mb-3">Subscription status</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <div>
            <div className="text-lg font-semibold text-text-primary">{stats.statusCounts.free}</div>
            <div className="text-xs text-text-muted">Free</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-amber">{stats.statusCounts.pro}</div>
            <div className="text-xs text-text-muted">Pro</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue">{stats.statusCounts.pro_ending}</div>
            <div className="text-xs text-text-muted">Pro ending</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red">{stats.statusCounts.cancelled}</div>
            <div className="text-xs text-text-muted">Cancelled</div>
          </div>
        </div>
      </div>

      {/* Booking pages + trial requests + page reports */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Booking pages" value={createdPages} icon={<Globe className="w-5 h-5" />} />
        <StatCard label="Published" value={publishedPages} icon={<Globe className="w-5 h-5" />} />
        <StatCard label="Trial requests" value={bookingStats.total} icon={<Calendar className="w-5 h-5" />} />
        <StatCard label="Became students" value={convertedAvailable && convertedTrials !== null ? convertedTrials : '—'} icon={<UserCheck className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h2 className="text-sm text-text-secondary mb-3">Trial requests</h2>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <div className="text-lg font-semibold text-blue">{bookingStats.new}</div>
              <div className="text-xs text-text-muted">New</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green">{bookingStats.accepted}</div>
              <div className="text-xs text-text-muted">Accepted</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-text-muted">{bookingStats.declined}</div>
              <div className="text-xs text-text-muted">Declined</div>
            </div>
          </div>
        </div>
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h2 className="text-sm text-text-secondary mb-3 flex items-center gap-2">
            <Flag className="w-4 h-4" /> Page reports
            {reportStats.newCount > 0 && (
              <span className="px-1.5 py-0.5 bg-red/15 text-red rounded text-xs font-medium">{reportStats.newCount} new</span>
            )}
          </h2>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <div className="text-lg font-semibold text-text-primary">{reportStats.total}</div>
              <div className="text-xs text-text-muted">Total</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${reportStats.newCount > 0 ? 'text-red' : 'text-text-primary'}`}>{reportStats.newCount}</div>
              <div className="text-xs text-text-muted">New (unreviewed)</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-text-primary">{reportStats.tutors}</div>
              <div className="text-xs text-text-muted">Tutors with reports</div>
            </div>
          </div>
        </div>
      </div>

      {/* Acquisition */}
      <div className="bg-surface-card border border-border rounded-xl p-5 mb-4">
        <h2 className="text-sm text-text-secondary mb-3">Acquisition</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <div>
            <div className="text-lg font-semibold text-blue">{acq.channels.ads}</div>
            <div className="text-xs text-text-muted">Google Ads</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green">{acq.channels.organic}</div>
            <div className="text-xs text-text-muted">Organic</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-text-primary">{acq.channels.direct}</div>
            <div className="text-xs text-text-muted">Direct</div>
          </div>
          {acq.channels.unknown > 0 && (
            <div>
              <div className="text-lg font-semibold text-text-muted">{acq.channels.unknown}</div>
              <div className="text-xs text-text-muted">Unknown</div>
            </div>
          )}
        </div>
      </div>

      {(acq.topCampaigns.length > 0 || acq.topTerms.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {acq.topCampaigns.length > 0 && (
            <div className="bg-surface-card border border-border rounded-xl p-5">
              <h2 className="text-sm text-text-secondary mb-3">Top campaigns (sign-ups / Pro)</h2>
              <div className="space-y-1.5">
                {acq.topCampaigns.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-sm gap-3">
                    <span className="text-text-primary font-mono text-xs truncate">{c.name}</span>
                    <span className="text-text-secondary shrink-0">{c.signups} / <span className="text-amber">{c.pro}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {acq.topTerms.length > 0 && (
            <div className="bg-surface-card border border-border rounded-xl p-5">
              <h2 className="text-sm text-text-secondary mb-3">Top keywords (sign-ups / Pro)</h2>
              <div className="space-y-1.5">
                {acq.topTerms.map(t => (
                  <div key={t.name} className="flex items-center justify-between text-sm gap-3">
                    <span className="text-text-primary truncate">{t.name}</span>
                    <span className="text-text-secondary shrink-0">{t.signups} / <span className="text-amber">{t.pro}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Registrations chart */}
      <div className="bg-surface-card border border-border rounded-xl p-5 mb-8">
        <h2 className="text-sm text-text-secondary mb-4">New Registrations (30 days)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCountKmeta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8, color: '#f1f5f9' }}
            />
            <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#colorCountKmeta)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
