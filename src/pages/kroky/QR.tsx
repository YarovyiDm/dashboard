import { useMemo } from 'react';
import { MousePointerClick, Download, Users, Eye } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useKrokyUsers } from '../../hooks/useKrokyData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const STYLE_NAMES: Record<string, string> = {
  classic: 'Classic', rounded: 'Rounded', dots: 'Dots',
  classy: 'Classy', 'classy-rounded': 'Classy Rounded', 'extra-rounded': 'Extra Rounded',
};

export function KrokyQR() {
  const { users, loading } = useKrokyUsers();

  const data = useMemo(() => {
    const totalOpens = users.reduce((s, u) => s + (u.qrOpened || 0), 0);
    const editorUsers = users.filter(u => (u.qrOpened || 0) > 0).length;
    const totalDownloads = users.reduce((s, u) => s + (u.qrDownloads || 0), 0);
    const downloadUsers = users.filter(u => (u.qrDownloads || 0) > 0).length;

    // Styles viewed popularity
    const styleCount: Record<string, number> = {};
    users.forEach(u => {
      u.qrStylesViewed?.forEach(s => {
        styleCount[s] = (styleCount[s] || 0) + 1;
      });
    });
    const stylesChart = Object.entries(styleCount)
      .sort(([, a], [, b]) => b - a)
      .map(([id, count]) => ({ name: STYLE_NAMES[id] || id, count }));

    return { totalOpens, editorUsers, totalDownloads, downloadUsers, stylesChart };
  }, [users]);

  if (loading) return <div className="text-text-muted">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">QR Code Analytics</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Editor Opens" value={data.totalOpens} icon={<MousePointerClick className="w-5 h-5" />} />
        <StatCard label="Editor Users" value={data.editorUsers} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Downloads" value={data.totalDownloads} icon={<Download className="w-5 h-5" />} />
        <StatCard label="Download Users" value={data.downloadUsers} icon={<Eye className="w-5 h-5" />} />
      </div>

      {/* Styles chart */}
      {data.stylesChart.length > 0 && (
        <div className="bg-surface-card border border-border rounded-xl p-5 mb-4">
          <h2 className="text-sm text-text-secondary mb-4">QR Styles by Views</h2>
          <ResponsiveContainer width="100%" height={Math.max(180, data.stylesChart.length * 36)}>
            <BarChart data={data.stylesChart} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top users */}
      <div className="bg-surface-card border border-border rounded-xl p-5">
        <h2 className="text-sm text-text-secondary mb-4">Top Users by Downloads</h2>
        {users.filter(u => (u.qrDownloads || 0) > 0).length === 0 ? (
          <p className="text-text-muted text-sm">No downloads yet</p>
        ) : (
          <div className="space-y-2">
            {users
              .filter(u => (u.qrDownloads || 0) > 0)
              .sort((a, b) => (b.qrDownloads || 0) - (a.qrDownloads || 0))
              .slice(0, 10)
              .map(u => (
                <div key={u.uid} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-text-primary text-sm">{u.email || u.uid.slice(0, 12)}</span>
                  <div className="flex gap-4">
                    <span className="text-text-muted text-xs">{u.qrOpened || 0} opens</span>
                    <span className="text-green text-sm font-medium">{u.qrDownloads} downloads</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
