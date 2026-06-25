import { useMemo } from 'react';
import { Download, FileText, DollarSign, Star, Globe, Palette } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useKrokyUsers, useKrokyPayments } from '../../hooks/useKrokyData';
import { getWatermarkedExports, getCleanExports, ALL_LANGS, LANG_LABELS } from '../../lib/krokyFields';
import type { ExportLang } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const TEMPLATE_NAMES: Record<string, string> = {
  classic: 'Classic', modern: 'Modern', creative: 'Creative', minimal: 'Minimal',
  executive: 'Executive', tech: 'Tech', bold: 'Bold', startup: 'Startup',
  timeline: 'Timeline', academic: 'Academic', qa: 'QA', design: 'Design/UX',
  finance: 'Finance', twocol: 'Two Column', photo: 'Photo', infographic: 'Infographic',
  cover: 'Cover Letter', medical: 'Medical', teacher: 'Teacher', lawyer: 'Lawyer',
  marketing: 'Marketing', manager: 'Manager', darkminimal: 'Dark Minimal',
};

export function KrokyResume() {
  const { users, loading: usersLoading } = useKrokyUsers();
  const { payments, loading: paymentsLoading } = useKrokyPayments();

  const data = useMemo(() => {
    const watermarkedExports = users.reduce((s, u) => s + getWatermarkedExports(u), 0);
    const cleanExports = users.reduce((s, u) => s + getCleanExports(u), 0);

    // Template popularity
    const templateCount: Record<string, number> = {};
    users.forEach(u => {
      u.stats?.templatesOpened?.forEach(t => {
        templateCount[t] = (templateCount[t] || 0) + 1;
      });
    });
    const topTemplates = Object.entries(templateCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({ name: TEMPLATE_NAMES[id] || id, count }));

    // Legacy revenue from individual template purchases (pre-Pro model)
    const templatePayments = payments.filter(p => p.status === 'approved' && p.templateId !== 'pro' && p.templateId !== 'sig_oneTime' && p.productType !== 'pro' && p.productType !== 'signature_one_time');
    const templateRevenue = templatePayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    const totalPurchased = users.reduce((s, u) => s + (u.purchasedTemplates?.length || 0), 0);

    // Lang demand — aggregate stats.exportsByLang across all users
    const langTotals = ALL_LANGS.reduce((acc, lang) => {
      acc[lang] = users.reduce((s, u) => s + (u.stats?.exportsByLang?.[lang] || 0), 0);
      return acc;
    }, {} as Record<ExportLang, number>);
    const langTotalSum = Object.values(langTotals).reduce((s, v) => s + v, 0);
    const langChart = ALL_LANGS
      .map(lang => ({ name: LANG_LABELS[lang], code: lang, count: langTotals[lang] }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);

    // Theme insights — % of exports using a custom theme
    let customExports = 0;
    let defaultExports = 0;
    users.forEach(u => {
      customExports += u.stats?.exportsByThemeUsage?.custom ?? 0;
      defaultExports += u.stats?.exportsByThemeUsage?.default ?? 0;
    });
    const themeUsageTotal = customExports + defaultExports;
    const customSharePct = themeUsageTotal > 0
      ? Math.round((customExports / themeUsageTotal) * 100)
      : 0;
    const themeUsageData = themeUsageTotal > 0
      ? [
          { name: 'Default', value: defaultExports },
          { name: 'Custom', value: customExports },
        ]
      : [];

    // Top themes by usage
    const themeCount: Record<string, number> = {};
    users.forEach(u => {
      const byTheme = u.stats?.exportsByTheme;
      if (!byTheme) return;
      Object.entries(byTheme).forEach(([id, count]) => {
        themeCount[id] = (themeCount[id] || 0) + (count || 0);
      });
    });
    const topThemes = Object.entries(themeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({ name: id, count }));

    return {
      watermarkedExports,
      cleanExports,
      topTemplates,
      templateRevenue,
      templatePayments: templatePayments.length,
      totalPurchased,
      langChart,
      langTotalSum,
      customSharePct,
      themeUsageData,
      topThemes,
    };
  }, [users, payments]);

  if (usersLoading || paymentsLoading) return <div className="text-text-muted">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Resume Analytics</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Watermarked exports" value={data.watermarkedExports} icon={<Download className="w-5 h-5" />} />
        <StatCard label="Clean exports (Pro)" value={data.cleanExports} icon={<Download className="w-5 h-5" />} />
        {data.totalPurchased > 0 && (
          <StatCard label="Templates Purchased (legacy)" value={data.totalPurchased} icon={<FileText className="w-5 h-5" />} />
        )}
        {data.templateRevenue > 0 && (
          <StatCard label="Template Revenue (legacy)" value={`${data.templateRevenue} UAH`} icon={<DollarSign className="w-5 h-5" />} />
        )}
      </div>

      {/* Lang demand */}
      {data.langChart.length > 0 && (
        <div className="bg-surface-card border border-border rounded-xl p-5 mb-8">
          <h2 className="text-sm text-text-secondary mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" /> PDF Exports by Language
            </span>
            <span className="text-xs text-text-muted">
              Total <span className="text-text-primary font-medium">{data.langTotalSum}</span>
            </span>
          </h2>
          <ResponsiveContainer width="100%" height={Math.max(180, data.langChart.length * 42)}>
            <BarChart data={data.langChart} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Theme insights */}
      {data.themeUsageData.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-card border border-border rounded-xl p-5">
            <h2 className="text-sm text-text-secondary mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4" /> Theme Customization
              </span>
              <span className="text-xs">
                Custom <span className="text-accent font-medium">{data.customSharePct}%</span>
              </span>
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.themeUsageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  <Cell fill="#64748b" />
                  <Cell fill="#6366f1" />
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8, color: '#f1f5f9' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {data.topThemes.length > 0 && (
            <div className="bg-surface-card border border-border rounded-xl p-5">
              <h2 className="text-sm text-text-secondary mb-4">Top Themes by Exports</h2>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {data.topThemes.map(t => (
                  <div key={t.name} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-text-primary text-sm font-mono">{t.name}</span>
                    <span className="text-accent text-sm font-medium">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top templates chart */}
      <div className="bg-surface-card border border-border rounded-xl p-5 mb-8">
        <h2 className="text-sm text-text-secondary mb-4 flex items-center gap-2">
          <Star className="w-4 h-4" /> Top Templates by Opens
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.topTemplates} layout="vertical">
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
            <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8, color: '#f1f5f9' }} />
            <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent template purchases (legacy) */}
      {data.templatePayments > 0 && (
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h2 className="text-sm text-text-secondary mb-4">Template Purchases (legacy)</h2>
          <div className="space-y-2">
            {payments
              .filter(p => p.status === 'approved' && p.templateId !== 'pro' && p.templateId !== 'sig_oneTime' && p.productType !== 'pro' && p.productType !== 'signature_one_time')
              .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
              .slice(0, 15)
              .map(p => (
                <div key={p.orderReference} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-text-primary text-sm">{TEMPLATE_NAMES[p.templateId] || p.templateId}</span>
                    <span className="text-text-muted text-xs ml-3">{p.createdAt?.slice(0, 10)}</span>
                  </div>
                  <span className="text-green text-sm font-medium">{p.amount} UAH</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
