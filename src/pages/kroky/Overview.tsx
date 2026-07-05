import { useMemo } from 'react';
import { Users, DollarSign, Crown, UserPlus } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useKrokyUsers, useKrokyPayments } from '../../hooks/useKrokyData';
import { useExchangeRates, type Rates } from '../../hooks/useExchangeRates';
import { paymentNetUah, paymentNetIn, round2, TAX_RATE } from '../../lib/revenue';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function KrokyOverview() {
  const { users, loading: usersLoading } = useKrokyUsers();
  const { payments, loading: paymentsLoading } = useKrokyPayments();
  const { rates, loading: ratesLoading } = useExchangeRates();

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const approved = payments.filter(p => p.status === 'approved');
    // Net of Creem fees, USD/PLN converted to UAH at the current NBU rate.
    const totalRevenue = round2(approved.reduce((s, p) => s + paymentNetUah(p, rates), 0));
    const netProfit = round2(totalRevenue * (1 - TAX_RATE));
    const activePro = users.filter(u => u.isPro && u.proExpiresAt && new Date(u.proExpiresAt) > now).length;
    const newThisWeek = users.filter(u => u.createdAt && new Date(u.createdAt) >= weekAgo).length;

    const proPayments = approved.filter(p => p.templateId === 'pro' || p.productType === 'pro');
    const totalProPurchases = proPayments.length;
    const proBuyers = new Set(proPayments.map(p => p.uid)).size;
    const conversionRate = users.length > 0
      ? ((proBuyers / users.length) * 100).toFixed(1)
      : '0';

    // Pro buyers whose first purchase came more than a week after they registered
    // (counts every Pro buyer, active or not).
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const userByUid = new Map(users.map(u => [u.uid, u]));
    const firstProAt = new Map<string, number>();
    proPayments.forEach(p => {
      const t = new Date(p.purchasedAt || p.createdAt).getTime();
      const prev = firstProAt.get(p.uid);
      if (prev === undefined || t < prev) firstProAt.set(p.uid, t);
    });
    const slowConverterEmails: string[] = [];
    firstProAt.forEach((purchasedAt, uid) => {
      const u = userByUid.get(uid);
      if (!u || !u.createdAt) return;
      if (purchasedAt - new Date(u.createdAt).getTime() > WEEK_MS) {
        slowConverterEmails.push(u.email || uid);
      }
    });

    const ukPayments = approved.filter(p => !p.locale || p.locale === 'uk');
    const plPayments = approved.filter(p => p.locale === 'pl');
    const enPayments = approved.filter(p => p.locale === 'en');

    // Revenue shown in each block's own currency, net of Creem fees.
    // After-tax is always reported in UAH.
    const countryStats = (list: typeof approved, currency: keyof Rates) => {
      const revenue = round2(list.reduce((s, p) => s + paymentNetIn(p, currency, rates), 0));
      const revenueUah = list.reduce((s, p) => s + paymentNetUah(p, rates), 0);
      return {
        count: list.length,
        revenue,
        afterTaxUah: round2(revenueUah * (1 - TAX_RATE)),
        buyers: new Set(list.map(p => p.uid)).size,
      };
    };

    return {
      totalUsers: users.length,
      totalRevenue,
      netProfit,
      activePro,
      newThisWeek,
      totalProPurchases,
      proBuyers,
      slowConverters: slowConverterEmails.length,
      slowConverterEmails,
      conversionRate,
      uk: countryStats(ukPayments, 'UAH'),
      pl: countryStats(plPayments, 'USD'),
      en: countryStats(enPayments, 'USD'),
    };
  }, [users, payments, rates]);

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    users.forEach(u => {
      if (u.createdAt) {
        const day = u.createdAt.slice(0, 10);
        if (day in days) days[day]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({ date: date.slice(5), count }));
  }, [users]);

  if (usersLoading || paymentsLoading || ratesLoading) {
    return <div className="text-text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Kroky Overview</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Active Pro" value={stats.activePro} icon={<Crown className="w-5 h-5" />} />
        <StatCard label="New this week" value={stats.newThisWeek} icon={<UserPlus className="w-5 h-5" />} />
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-secondary text-sm">Total Revenue</span>
            <span className="text-text-muted"><DollarSign className="w-5 h-5" /></span>
          </div>
          <div className="text-2xl font-semibold text-text-primary">
            {Math.round(stats.totalRevenue).toLocaleString()} UAH
          </div>
          <div className="mt-2 text-xs text-text-muted">
            Net of Creem fees · USD→UAH @ {rates.USD.toFixed(2)} (NBU)
          </div>
        </div>
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-secondary text-sm">Net Profit</span>
          </div>
          <div className="text-2xl font-semibold text-green">
            {Math.round(stats.netProfit).toLocaleString()} UAH
          </div>
          <div className="mt-2 text-xs text-text-muted">After 5% tax</div>
        </div>
      </div>

      {/* Registrations chart */}
      <div className="bg-surface-card border border-border rounded-xl p-5 mb-8">
        <h2 className="text-sm text-text-secondary mb-4">New Registrations (30 days)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8, color: '#f1f5f9' }}
            />
            <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#colorCount)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Payments by country */}
      <h2 className="text-lg font-semibold text-text-primary mb-4">Payments by Country</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🇺🇦</span>
            <h3 className="text-lg font-semibold text-text-primary">Ukraine</h3>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.uk.revenue} UAH</div>
              <div className="text-xs text-text-muted">Revenue</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green">{stats.uk.afterTaxUah} UAH</div>
              <div className="text-xs text-text-muted">After 5% tax</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.uk.count}</div>
              <div className="text-xs text-text-muted">Payments</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.uk.buyers}</div>
              <div className="text-xs text-text-muted">Buyers</div>
            </div>
          </div>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🇵🇱</span>
            <h3 className="text-lg font-semibold text-text-primary">Poland</h3>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.pl.revenue} USD</div>
              <div className="text-xs text-text-muted">Revenue</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green">{stats.pl.afterTaxUah} UAH</div>
              <div className="text-xs text-text-muted">After 5% tax</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.pl.count}</div>
              <div className="text-xs text-text-muted">Payments</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.pl.buyers}</div>
              <div className="text-xs text-text-muted">Buyers</div>
            </div>
          </div>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🌍</span>
            <h3 className="text-lg font-semibold text-text-primary">Rest of World</h3>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.en.revenue} USD</div>
              <div className="text-xs text-text-muted">Revenue</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green">{stats.en.afterTaxUah} UAH</div>
              <div className="text-xs text-text-muted">After 5% tax</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.en.count}</div>
              <div className="text-xs text-text-muted">Payments</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.en.buyers}</div>
              <div className="text-xs text-text-muted">Buyers</div>
            </div>
          </div>
        </div>
      </div>

      {/* User → Pro conversion */}
      <div className="bg-surface-card border border-border rounded-xl p-5 mb-8">
        <h2 className="text-sm text-text-secondary mb-3">User → Pro Conversion</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <div>
            <div className="text-lg font-semibold text-text-primary">{stats.totalUsers}</div>
            <div className="text-xs text-text-muted">Total users</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-text-primary">{stats.proBuyers}</div>
            <div className="text-xs text-text-muted">Pro buyers</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-text-primary">{stats.totalProPurchases}</div>
            <div className="text-xs text-text-muted">Pro purchases</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-accent">{stats.conversionRate}%</div>
            <div className="text-xs text-text-muted">Conversion rate</div>
          </div>
          <div className="relative group">
            <div className="text-lg font-semibold text-text-primary cursor-help">{stats.slowConverters}</div>
            <div className="text-xs text-text-muted cursor-help">Bought &gt;1 week after signup</div>
            {stats.slowConverterEmails.length > 0 && (
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 bg-surface-hover border border-border rounded-lg p-3 shadow-lg max-h-64 max-w-[calc(100vw-2rem)] overflow-auto">
                <div className="text-xs text-text-muted mb-1">Users ({stats.slowConverterEmails.length})</div>
                {stats.slowConverterEmails.map(email => (
                  <div key={email} className="text-xs text-text-primary whitespace-nowrap">{email}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
