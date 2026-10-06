import { useMemo } from 'react';
import { MousePointerClick, Eye, Clock, Percent, Smartphone, Share2, Lock } from 'lucide-react';
import { useKrokyUsers, useKrokyPayments } from '../../hooks/useKrokyData';
import { getTotalPaywallViews, TRIGGER_LABELS, ALL_TRIGGERS } from '../../lib/krokyFields';
import { PageHeader, Panel, Kpi, BarList, StackBar, LoadingSkeleton } from '../../components/ui';
import { GOLD, TEAL } from '../../lib/theme';
import type { UserProfile } from '../../types';

const DEVICE_COLORS: Record<string, string> = { mobile: GOLD, desktop: TEAL, tablet: '#5cb8ff' };

// utm_source first, then utm_source inside the referrer URL, then the referrer host.
function sourceOf(u: UserProfile): string {
  if (u.acquisition?.utmSource) return u.acquisition.utmSource;
  if (u.acquisition?.referrer) {
    try {
      const url = new URL(u.acquisition.referrer);
      const utm = url.searchParams.get('utm_source');
      const host = url.hostname.replace(/^www\./, '');
      if (utm) return utm;
      if (host && host !== 'kroky.com.ua') return host;
    } catch { /* invalid URL */ }
  }
  return 'direct';
}

export function KrokyEngagement() {
  const { users, loading } = useKrokyUsers();
  const { payments, loading: paymentsLoading } = useKrokyPayments();

  const data = useMemo(() => {
    const paywallViews = users.reduce((s, u) => s + getTotalPaywallViews(u), 0);
    const totalVisits = users.reduce((s, u) => s + (u.visitCount || 0), 0);
    const proPurchases = payments.filter(p => p.status === 'approved' && (p.templateId === 'pro' || p.productType === 'pro')).length;
    const conversion = paywallViews > 0 ? ((proPurchases / paywallViews) * 100).toFixed(1) : '0';
    const avgTimeMin = users.length
      ? (users.reduce((s, u) => s + (u.totalTimeOnSiteSec || 0), 0) / users.length / 60).toFixed(1)
      : '0';

    const triggers = ALL_TRIGGERS
      .map(t => ({ t, count: users.reduce((s, u) => s + (u.stats?.paywallViewsByTrigger?.[t] || 0), 0) }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);

    const devices: Record<string, number> = {};
    users.forEach(u => { const d = u.acquisition?.deviceType; if (d) devices[d] = (devices[d] || 0) + 1; });

    const sources: Record<string, number> = {};
    users.forEach(u => { const src = sourceOf(u); sources[src] = (sources[src] || 0) + 1; });
    const topSources = Object.entries(sources).sort(([, a], [, b]) => b - a).slice(0, 8);

    return { paywallViews, totalVisits, proPurchases, conversion, avgTimeMin, triggers, devices, topSources };
  }, [users, payments]);

  if (loading || paymentsLoading) return <LoadingSkeleton rows={2} />;

  return (
    <div className="max-w-6xl">
      <PageHeader eyebrow="kroky" title="Engagement" subtitle="Трафік, пристрої та paywall" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi i={0} label="Visits" value={data.totalVisits} icon={<MousePointerClick />} tone="teal" />
        <Kpi i={1} label="Avg time (min)" value={data.avgTimeMin} icon={<Clock />} tone="blue" />
        <Kpi i={2} label="Paywall views" value={data.paywallViews} icon={<Eye />} tone="muted" />
        <Kpi i={3} label="Paywall → Pro" value={`${data.conversion}%`} icon={<Percent />} tone="gold" hint={`${data.proPurchases} Pro-покупок`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
        <Panel i={4} title="Traffic sources" icon={<Share2 className="w-4 h-4" />} right="users">
          <BarList color={TEAL} rows={data.topSources.map(([src, n]) => ({ key: src, label: src, value: n }))} />
        </Panel>
        <div className="space-y-3 sm:space-y-4">
          <Panel i={5} title="Devices" icon={<Smartphone className="w-4 h-4" />}>
            <StackBar segments={Object.entries(data.devices).sort(([, a], [, b]) => b - a).map(([d, n]) => ({
              label: d, value: n, color: DEVICE_COLORS[d] ?? '#3a5257',
            }))} />
          </Panel>
          <Panel i={6} title="Paywall by trigger" icon={<Lock className="w-4 h-4" />}>
            <BarList empty="Немає даних" rows={data.triggers.map(d => ({ key: d.t, label: TRIGGER_LABELS[d.t], value: d.count }))} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
