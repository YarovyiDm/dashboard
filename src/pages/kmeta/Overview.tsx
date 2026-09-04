import { useMemo } from 'react';
import { Users, Crown, UserPlus, LogIn, BookOpen, Layers, GraduationCap, DollarSign } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useKmetaUsers, useKmetaSubcounts, useKmetaSubscriptionRevenue, isKmetaPro } from '../../hooks/useKmetaData';
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
  const { data: subRev, available: subRevAvailable } = useKmetaSubscriptionRevenue(users, connected);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newThisWeek = users.filter(u => {
      const d = toJsDate(u.createdAt);
      return d ? d >= weekAgo : false;
    }).length;
    const proUsers = users.filter(isKmetaPro).length;

    const planCounts = { free: 0, pro: 0, cancelled: 0, other: 0 };
    users.forEach(u => {
      if (u.plan === 'free') planCounts.free++;
      else if (u.plan === 'pro') planCounts.pro++;
      else if (u.plan === 'cancelled') planCounts.cancelled++;
      else planCounts.other++;
    });

    return { totalUsers: users.length, proUsers, newThisWeek, planCounts };
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

  // Revenue = logged subscription payments + a fixed legacy baseline for the
  // pre-logging payments. Net strips WayForPay's fee and taxes.
  const realGross = subRevAvailable && subRev ? subRev.total : 0;
  const realCount = subRevAvailable && subRev ? subRev.count : 0;
  const grossRevenue = LEGACY_PRO_PAYMENTS * PRO_PRICE + realGross;
  const paymentsCount = LEGACY_PRO_PAYMENTS + realCount;
  const netRevenue = grossRevenue * WAYFORPAY_PAYOUT_RATIO * (1 - TOTAL_TAX);

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
          <div className="text-2xl font-semibold text-text-primary">{Math.round(grossRevenue).toLocaleString()} UAH</div>
          <div className="mt-2 text-xs text-text-muted">
            {paymentsCount} оплат · {LEGACY_PRO_PAYMENTS} legacy + {realCount} з логів
          </div>
        </div>
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-secondary text-sm">Net (after fees & tax)</span>
          </div>
          <div className="text-2xl font-semibold text-green">{Math.round(netRevenue).toLocaleString()} UAH</div>
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
        <h2 className="text-sm text-text-secondary mb-3">Plans</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <div>
            <div className="text-lg font-semibold text-text-primary">{stats.planCounts.free}</div>
            <div className="text-xs text-text-muted">Free</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-amber">{stats.planCounts.pro}</div>
            <div className="text-xs text-text-muted">Pro</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red">{stats.planCounts.cancelled}</div>
            <div className="text-xs text-text-muted">Cancelled</div>
          </div>
          {stats.planCounts.other > 0 && (
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.planCounts.other}</div>
              <div className="text-xs text-text-muted">Other</div>
            </div>
          )}
        </div>
      </div>

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
