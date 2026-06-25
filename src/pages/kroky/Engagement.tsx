import { useMemo } from 'react';
import { Briefcase, Users, Eye, Clock } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useKrokyUsers, useKrokyPayments } from '../../hooks/useKrokyData';
import { getTotalPaywallViews, TRIGGER_LABELS, ALL_TRIGGERS } from '../../lib/krokyFields';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, XAxis, YAxis } from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

export function KrokyEngagement() {
  const { users, loading } = useKrokyUsers();
  const { payments, loading: paymentsLoading } = useKrokyPayments();

  const data = useMemo(() => {
    const paywallViews = users.reduce((s, u) => s + getTotalPaywallViews(u), 0);
    const totalVisits = users.reduce((s, u) => s + (u.visitCount || 0), 0);
    const proPayments = payments.filter(p => p.status === 'approved' && (p.templateId === 'pro' || p.productType === 'pro'));
    const totalProPurchases = proPayments.length;
    const conversionRate = paywallViews > 0
      ? ((totalProPurchases / paywallViews) * 100).toFixed(1)
      : '0';

    // Paywall breakdown by trigger
    const triggerCounts = ALL_TRIGGERS.reduce((acc, t) => {
      acc[t] = users.reduce((s, u) => s + (u.stats?.paywallViewsByTrigger?.[t] || 0), 0);
      return acc;
    }, {} as Record<string, number>);
    const paywallBreakdown = ALL_TRIGGERS
      .map(t => ({ name: TRIGGER_LABELS[t], count: triggerCounts[t] }))
      .filter(d => d.count > 0);
    const avgTimeMin = users.length
      ? (users.reduce((s, u) => s + (u.totalTimeOnSiteSec || 0), 0) / users.length / 60).toFixed(1)
      : '0';

    // Device distribution
    const devices: Record<string, number> = {};
    users.forEach(u => {
      if (u.acquisition?.deviceType) {
        devices[u.acquisition.deviceType] = (devices[u.acquisition.deviceType] || 0) + 1;
      }
    });
    const deviceData = Object.entries(devices).map(([name, value]) => ({ name, value }));

    // Landing pages
    const landingPages: Record<string, number> = {};
    users.forEach(u => {
      if (u.acquisition?.landingPage) {
        landingPages[u.acquisition.landingPage] = (landingPages[u.acquisition.landingPage] || 0) + 1;
      }
    });
    const topLandingPages = Object.entries(landingPages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Traffic sources — check utm_source first, then extract from referrer URL params, then referrer domain
    const sources: Record<string, number> = {};
    users.forEach(u => {
      let src = 'direct';
      if (u.acquisition?.utmSource) {
        src = u.acquisition.utmSource;
      } else if (u.acquisition?.referrer) {
        try {
          const url = new URL(u.acquisition.referrer);
          const utmFromRef = url.searchParams.get('utm_source');
          const host = url.hostname.replace(/^www\./, '');
          if (utmFromRef) {
            src = utmFromRef;
          } else if (host && host !== 'kroky.com.ua') {
            src = host;
          }
        } catch { /* invalid URL */ }
      }
      sources[src] = (sources[src] || 0) + 1;
    });
    const topSources = Object.entries(sources)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return { paywallViews, totalVisits, avgTimeMin, deviceData, topLandingPages, topSources, paywallBreakdown, conversionRate, totalProPurchases };
  }, [users, payments]);

  if (loading || paymentsLoading) return <div className="text-text-muted">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Engagement & Acquisition</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={users.length} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Total Visits" value={data.totalVisits} icon={<Briefcase className="w-5 h-5" />} />
        <StatCard label="Paywall Views" value={data.paywallViews} icon={<Eye className="w-5 h-5" />} />
        <StatCard label="Avg Time (min)" value={data.avgTimeMin} icon={<Clock className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Device distribution */}
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h2 className="text-sm text-text-secondary mb-4">Device Distribution</h2>
          {data.deviceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {data.deviceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8, color: '#f1f5f9' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-sm">No data</p>
          )}
        </div>

        {/* Top sources */}
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h2 className="text-sm text-text-secondary mb-4">Traffic Sources</h2>
          <div className="space-y-2">
            {data.topSources.length > 0 ? data.topSources.map(([source, count]) => (
              <div key={source} className="flex items-center justify-between py-1.5">
                <span className="text-text-primary text-sm truncate max-w-[70%]">{source}</span>
                <span className="text-accent text-sm font-medium">{count}</span>
              </div>
            )) : <p className="text-text-muted text-sm">No data</p>}
          </div>
        </div>
      </div>

      {/* Paywall breakdown by trigger */}
      {data.paywallBreakdown.length > 0 && (
        <div className="bg-surface-card border border-border rounded-xl p-5 mb-4">
          <h2 className="text-sm text-text-secondary mb-4 flex items-center justify-between">
            <span>Paywall Views by Trigger</span>
            <span className="text-xs">
              Total <span className="text-text-primary font-medium">{data.paywallViews}</span>
              <span className="mx-2">·</span>
              Conversion <span className="text-accent font-medium">{data.conversionRate}%</span>
              <span className="text-text-muted ml-1">({data.totalProPurchases} Pro)</span>
            </span>
          </h2>
          <ResponsiveContainer width="100%" height={Math.max(180, data.paywallBreakdown.length * 42)}>
            <BarChart data={data.paywallBreakdown} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={130} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top landing pages */}
      <div className="bg-surface-card border border-border rounded-xl p-5">
        <h2 className="text-sm text-text-secondary mb-4">Top Landing Pages</h2>
        <div className="space-y-2">
          {data.topLandingPages.length > 0 ? data.topLandingPages.map(([page, count]) => (
            <div key={page} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-text-primary text-sm font-mono">{page}</span>
              <span className="text-accent text-sm font-medium">{count} users</span>
            </div>
          )) : <p className="text-text-muted text-sm">No data</p>}
        </div>
      </div>
    </div>
  );
}
