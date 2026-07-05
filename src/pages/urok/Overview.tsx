import { useMemo } from 'react';
import { Users, Crown, UserPlus } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useUrokUsers } from '../../hooks/useUrokData';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function UrokOverview() {
  const { users, loading } = useUrokUsers();

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newThisWeek = users.filter(u => u.createdAt && new Date(u.createdAt) >= weekAgo).length;
    const proUsers = users.filter(u => u.plan === 'pro').length;

    return {
      totalUsers: users.length,
      proUsers,
      newThisWeek,
    };
  }, [users]);

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    users.forEach(u => {
      if (u.createdAt) {
        const day = new Date(u.createdAt).toISOString().slice(0, 10);
        if (day in days) days[day]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({ date: date.slice(5), count }));
  }, [users]);

  if (loading) {
    return <div className="text-text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Urok Overview</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Pro Users" value={stats.proUsers} icon={<Crown className="w-5 h-5" />} />
        <StatCard label="New this week" value={stats.newThisWeek} icon={<UserPlus className="w-5 h-5" />} />
      </div>

      <div className="bg-surface-card border border-border rounded-xl p-5">
        <h2 className="text-sm text-text-secondary mb-4">New Registrations (30 days)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCountUrok" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8, color: '#f1f5f9' }}
            />
            <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#colorCountUrok)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
