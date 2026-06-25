import { useMemo } from 'react';
import { Users, DollarSign, Crown, UserPlus } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useKrokyUsers, useKrokyPayments } from '../../hooks/useKrokyData';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function KrokyOverview() {
  const { users, loading: usersLoading } = useKrokyUsers();
  const { payments, loading: paymentsLoading } = useKrokyPayments();

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const approved = payments.filter(p => p.status === 'approved');
    const totalRevenue = approved.reduce((s, p) => s + Number(p.amount || 0), 0);
    const activePro = users.filter(u => u.isPro && u.proExpiresAt && new Date(u.proExpiresAt) > now).length;
    const newThisWeek = users.filter(u => u.createdAt && new Date(u.createdAt) >= weekAgo).length;

    const proPayments = approved.filter(p => p.templateId === 'pro' || p.productType === 'pro');
    const proRevenue = proPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalProPurchases = proPayments.length;
    const proBuyers = new Set(proPayments.map(p => p.uid)).size;
    const conversionRate = users.length > 0
      ? ((proBuyers / users.length) * 100).toFixed(1)
      : '0';

    const legacyPayments = approved.filter(p => p.templateId !== 'pro' && p.productType !== 'pro' && p.templateId !== 'sig_oneTime' && p.productType !== 'signature_one_time');
    const legacyRevenue = legacyPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    const ukPayments = approved.filter(p => !p.locale || p.locale === 'uk');
    const plPayments = approved.filter(p => p.locale === 'pl');

    const countryStats = (list: typeof approved) => ({
      count: list.length,
      revenue: list.reduce((s, p) => s + Number(p.amount || 0), 0),
      currency: list[0]?.currency || 'UAH',
      buyers: new Set(list.map(p => p.uid)).size,
    });

    return {
      totalUsers: users.length,
      totalRevenue,
      activePro,
      newThisWeek,
      proRevenue,
      legacyRevenue,
      totalProPurchases,
      proBuyers,
      conversionRate,
      uk: countryStats(ukPayments),
      pl: countryStats(plPayments),
    };
  }, [users, payments]);

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

  if (usersLoading || paymentsLoading) {
    return <div className="text-text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Kroky Overview</h1>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Revenue" value={`${stats.totalRevenue} UAH`} icon={<DollarSign className="w-5 h-5" />} />
        <StatCard label="Active Pro" value={stats.activePro} icon={<Crown className="w-5 h-5" />} />
        <StatCard label="New this week" value={stats.newThisWeek} icon={<UserPlus className="w-5 h-5" />} />
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

      {/* Revenue breakdown */}
      <div className="bg-surface-card border border-border rounded-xl p-5 mb-8">
        <h2 className="text-sm text-text-secondary mb-3">Revenue Breakdown</h2>
        <div className="flex gap-8">
          <div>
            <div className="text-lg font-semibold text-text-primary">{stats.proRevenue} UAH</div>
            <div className="text-xs text-text-muted">Pro subscriptions</div>
          </div>
          {stats.legacyRevenue > 0 && (
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.legacyRevenue} UAH</div>
              <div className="text-xs text-text-muted">Legacy (templates/signatures)</div>
            </div>
          )}
        </div>
      </div>

      {/* User → Pro conversion */}
      <div className="bg-surface-card border border-border rounded-xl p-5 mb-8">
        <h2 className="text-sm text-text-secondary mb-3">User → Pro Conversion</h2>
        <div className="flex gap-8">
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
        </div>
      </div>

      {/* Payments by country */}
      <h2 className="text-lg font-semibold text-text-primary mb-4">Payments by Country</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🇺🇦</span>
            <h3 className="text-lg font-semibold text-text-primary">Ukraine</h3>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.uk.revenue} UAH</div>
              <div className="text-xs text-text-muted">Revenue</div>
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
          <div className="flex gap-6">
            <div>
              <div className="text-lg font-semibold text-text-primary">{stats.pl.revenue} PLN</div>
              <div className="text-xs text-text-muted">Revenue</div>
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
      </div>
    </div>
  );
}
