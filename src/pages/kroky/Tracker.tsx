import { useMemo } from 'react';
import { Briefcase, MousePointerClick, FilePlus, Users, AlertTriangle } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useKrokyUsers } from '../../hooks/useKrokyData';

export function KrokyTracker() {
  const { users, loading } = useKrokyUsers();

  const data = useMemo(() => {
    const trackerUsers = users.filter(u => (u.trackerOpened || 0) > 0);
    const totalOpens = users.reduce((s, u) => s + (u.trackerOpened || 0), 0);
    const totalApplications = users.reduce((s, u) => s + (u.applicationsCreated || 0), 0);
    const totalLimitReached = users.reduce((s, u) => s + (u.stats?.trackerLimitReached || 0), 0);
    const avgAppsPerUser = trackerUsers.length
      ? (trackerUsers.reduce((s, u) => s + (u.applicationsCreated || 0), 0) / trackerUsers.length).toFixed(1)
      : '0';

    // Top tracker users
    const topUsers = users
      .filter(u => (u.applicationsCreated || 0) > 0)
      .sort((a, b) => (b.applicationsCreated || 0) - (a.applicationsCreated || 0))
      .slice(0, 15);

    // Top users by limit hits — strong conversion signal
    const topLimitUsers = users
      .filter(u => (u.stats?.trackerLimitReached || 0) > 0)
      .sort((a, b) => (b.stats?.trackerLimitReached || 0) - (a.stats?.trackerLimitReached || 0))
      .slice(0, 10);

    return { trackerUsers: trackerUsers.length, totalOpens, totalApplications, totalLimitReached, avgAppsPerUser, topUsers, topLimitUsers };
  }, [users]);

  if (loading) return <div className="text-text-muted">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Job Tracker Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Tracker Users" value={data.trackerUsers} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Tracker Opens" value={data.totalOpens} icon={<MousePointerClick className="w-5 h-5" />} />
        <StatCard label="Applications Created" value={data.totalApplications} icon={<FilePlus className="w-5 h-5" />} />
        <StatCard label="Avg Apps / User" value={data.avgAppsPerUser} icon={<Briefcase className="w-5 h-5" />} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Limit Reached (5/5)" value={data.totalLimitReached} icon={<AlertTriangle className="w-5 h-5" />} />
      </div>

      {/* Top users by limit hits — strong conversion signal */}
      {data.topLimitUsers.length > 0 && (
        <div className="bg-surface-card border border-border rounded-xl p-5 mb-4">
          <h2 className="text-sm text-text-secondary mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber" /> Top Users by Limit Hits
            <span className="text-xs text-text-muted ml-2">(conversion signal)</span>
          </h2>
          <div className="space-y-2">
            {data.topLimitUsers.map(u => (
              <div key={u.uid} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-text-primary text-sm">{u.email || u.uid.slice(0, 12)}</span>
                <div className="flex gap-4">
                  <span className="text-text-muted text-xs">{u.applicationsCreated || 0} apps</span>
                  <span className="text-amber text-sm font-medium">{u.stats?.trackerLimitReached} hits</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top tracker users */}
      <div className="bg-surface-card border border-border rounded-xl p-5">
        <h2 className="text-sm text-text-secondary mb-4">Top Users by Applications</h2>
        {data.topUsers.length === 0 ? (
          <p className="text-text-muted text-sm">No tracker usage yet</p>
        ) : (
          <div className="space-y-2">
            {data.topUsers.map(u => (
              <div key={u.uid} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-text-primary text-sm">{u.email || u.uid.slice(0, 12)}</span>
                <div className="flex gap-4">
                  <span className="text-text-muted text-xs">{u.trackerOpened || 0} opens</span>
                  <span className="text-accent text-sm font-medium">{u.applicationsCreated} apps</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
