import { useMemo } from 'react';
import { Users, Crown, UserPlus, LogIn, BookOpen, Layers, GraduationCap } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useKmetaUsers, useKmetaSubcounts, isKmetaPro, type TutorCounts } from '../../hooks/useKmetaData';
import { toDayMonth, toDayMonthYear, toJsDate } from '../../lib/date';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function planBadge(plan?: string) {
  const cls: Record<string, string> = {
    pro: 'bg-amber/15 text-amber',
    cancelled: 'bg-red/15 text-red',
    free: 'bg-surface-hover text-text-muted',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${cls[plan ?? 'free'] ?? cls.free}`}>
      {plan ?? 'free'}
    </span>
  );
}

export function KmetaOverview() {
  const { users, loading, connected, connect, error } = useKmetaUsers();
  const { counts, totals, loading: countsLoading, available: countsAvailable } = useKmetaSubcounts(users);

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

  // Busiest tutors first (by student count once the subcounts land).
  const tutors = useMemo(
    () => [...users].sort((a, b) => (counts[b.uid]?.students ?? 0) - (counts[a.uid]?.students ?? 0)),
    [users, counts],
  );

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
  const cellCount = (uid: string, key: keyof TutorCounts): string | number => {
    if (!countsAvailable) return '—';
    const c = counts[uid];
    if (!c) return countsLoading ? '…' : '—';
    return c[key];
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Kmeta Overview</h1>

      {/* Users summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Active Pro" value={stats.proUsers} icon={<Crown className="w-5 h-5" />} />
        <StatCard label="New this week" value={stats.newThisWeek} icon={<UserPlus className="w-5 h-5" />} />
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

      {/* Per-tutor table */}
      <h2 className="text-lg font-semibold text-text-primary mb-4">Tutors</h2>
      <div className="bg-surface-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Tutor</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Specialization</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Students</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Groups</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Lessons</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Plan</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Pro until</th>
            </tr>
          </thead>
          <tbody>
            {tutors.map(u => (
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
                <td className="px-4 py-3 text-sm text-text-secondary">{cellCount(u.uid, 'students')}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{cellCount(u.uid, 'groups')}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{cellCount(u.uid, 'lessons')}</td>
                <td className="px-4 py-3">{planBadge(u.plan)}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {toDayMonthYear(toJsDate(u.proExpiresAt)?.toISOString() ?? null)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
