import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MousePointerClick, FilePlus, Users, AlertTriangle } from 'lucide-react';
import { useKrokyUsers } from '../../hooks/useKrokyData';
import { PageHeader, Panel, Kpi, BarList, LoadingSkeleton } from '../../components/ui';

export function KrokyTracker() {
  const { users, loading } = useKrokyUsers();

  const data = useMemo(() => {
    const trackerUsers = users.filter(u => (u.trackerOpened || 0) > 0).length;
    const totalOpens = users.reduce((s, u) => s + (u.trackerOpened || 0), 0);
    const totalApplications = users.reduce((s, u) => s + (u.applicationsCreated || 0), 0);
    const totalLimitReached = users.reduce((s, u) => s + (u.stats?.trackerLimitReached || 0), 0);
    // Users who keep hitting the free limit — the strongest Pro signal here.
    const topLimitUsers = users
      .filter(u => (u.stats?.trackerLimitReached || 0) > 0)
      .sort((a, b) => (b.stats?.trackerLimitReached || 0) - (a.stats?.trackerLimitReached || 0))
      .slice(0, 10);
    return { trackerUsers, totalOpens, totalApplications, totalLimitReached, topLimitUsers };
  }, [users]);

  if (loading) return <LoadingSkeleton rows={1} />;

  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="kroky" title="Job Tracker" subtitle="Трекер відгуків на вакансії" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi i={0} label="Tracker users" value={data.trackerUsers} icon={<Users />} tone="teal" />
        <Kpi i={1} label="Opens" value={data.totalOpens} icon={<MousePointerClick />} tone="blue" />
        <Kpi i={2} label="Applications" value={data.totalApplications} icon={<FilePlus />} tone="green"
          hint={data.trackerUsers ? `${(data.totalApplications / data.trackerUsers).toFixed(1)} на користувача` : undefined} />
        <Kpi i={3} label="Limit hits (5/5)" value={data.totalLimitReached} icon={<AlertTriangle />} tone="gold" />
      </div>
      <Panel i={4} className="mt-3 sm:mt-4" title="Top limit hits" icon={<AlertTriangle className="w-4 h-4" />} right="conversion signal">
        <BarList
          empty="Ще ніхто не впирався в ліміт"
          rows={data.topLimitUsers.map(u => ({
            key: u.uid,
            value: u.stats?.trackerLimitReached || 0,
            label: <Link to={`/kroky/users/${u.uid}`} className="hover:text-accent transition-colors">{u.email || u.uid.slice(0, 12)}</Link>,
            extra: <>{u.stats?.trackerLimitReached} <span className="text-text-muted text-xs font-medium">· {u.applicationsCreated || 0} apps</span></>,
          }))}
        />
      </Panel>
    </div>
  );
}
