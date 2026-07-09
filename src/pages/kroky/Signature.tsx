import { useMemo } from 'react';
import { Pen, DollarSign, Copy, MousePointerClick, ShoppingBag, Eye } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useKrokyUsers, useKrokyPayments } from '../../hooks/useKrokyData';
import { toDayMonthYear } from '../../lib/date';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TEMPLATE_NAMES: Record<string, string> = {
  modern: 'Modern', classic: 'Classic', minimal: 'Minimal', bold: 'Bold',
  banner: 'Banner', elegant: 'Elegant', columns: 'Columns', compact: 'Compact',
};

export function KrokySignature() {
  const { users, loading: usersLoading } = useKrokyUsers();
  const { payments, loading: paymentsLoading } = useKrokyPayments();

  const data = useMemo(() => {
    const legacyPurchased = users.filter(u => u.signaturePurchased).length;
    const templatePurchaseCount = users.reduce((s, u) => s + (u.purchasedSignatureTemplates?.length || 0), 0);
    const totalCopies = users.reduce((s, u) => s + (u.signatureCopies || 0), 0);
    const totalOpens = users.reduce((s, u) => s + (u.signatureOpened || 0), 0);
    const editorUsers = users.filter(u => (u.signatureOpened || 0) > 0).length;

    const sigPayments = payments.filter(p => p.status === 'approved' && p.templateId === 'sig_oneTime');
    const revenue = sigPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // Templates viewed (popularity)
    const viewedCount: Record<string, number> = {};
    users.forEach(u => {
      u.signatureTemplatesViewed?.forEach(t => {
        viewedCount[t] = (viewedCount[t] || 0) + 1;
      });
    });
    const viewedChart = Object.entries(viewedCount)
      .sort(([, a], [, b]) => b - a)
      .map(([id, count]) => ({ name: TEMPLATE_NAMES[id] || id, count }));

    // Templates purchased
    const purchasedCount: Record<string, number> = {};
    users.forEach(u => {
      u.purchasedSignatureTemplates?.forEach(t => {
        purchasedCount[t] = (purchasedCount[t] || 0) + 1;
      });
    });
    const purchasedTemplates = Object.entries(purchasedCount)
      .sort(([, a], [, b]) => b - a);

    return { legacyPurchased, templatePurchaseCount, totalCopies, totalOpens, editorUsers, revenue, sigPayments, viewedChart, purchasedTemplates };
  }, [users, payments]);

  if (usersLoading || paymentsLoading) return <div className="text-text-muted">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Signature Analytics</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Editor Opens" value={data.totalOpens} icon={<MousePointerClick className="w-5 h-5" />} />
        <StatCard label="Editor Users" value={data.editorUsers} icon={<Eye className="w-5 h-5" />} />
        <StatCard label="Total Copies" value={data.totalCopies} icon={<Copy className="w-5 h-5" />} />
      </div>
      {(data.legacyPurchased > 0 || data.templatePurchaseCount > 0 || data.revenue > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {data.legacyPurchased > 0 && (
            <StatCard label="Full Access (legacy)" value={data.legacyPurchased} icon={<Pen className="w-5 h-5" />} />
          )}
          {data.templatePurchaseCount > 0 && (
            <StatCard label="Template Purchases (legacy)" value={data.templatePurchaseCount} icon={<ShoppingBag className="w-5 h-5" />} />
          )}
          {data.revenue > 0 && (
            <StatCard label="Revenue (legacy)" value={`${data.revenue} UAH`} icon={<DollarSign className="w-5 h-5" />} />
          )}
        </div>
      )}

      {/* Templates viewed chart */}
      {data.viewedChart.length > 0 && (
        <div className="bg-surface-card border border-border rounded-xl p-5 mb-4">
          <h2 className="text-sm text-text-secondary mb-4">Signature Templates by Views</h2>
          <ResponsiveContainer width="100%" height={Math.max(200, data.viewedChart.length * 36)}>
            <BarChart data={data.viewedChart} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Templates purchased (legacy) */}
      {data.purchasedTemplates.length > 0 && (
        <div className="bg-surface-card border border-border rounded-xl p-5 mb-4">
          <h2 className="text-sm text-text-secondary mb-4">Signature Templates Purchased (legacy)</h2>
          <div className="space-y-2">
            {data.purchasedTemplates.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-text-primary text-sm capitalize">{TEMPLATE_NAMES[name] || name}</span>
                <span className="text-green text-sm font-medium">{count} purchases</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent signature payments (legacy) */}
      {data.sigPayments.length > 0 && (
        <div className="bg-surface-card border border-border rounded-xl p-5 mb-4">
          <h2 className="text-sm text-text-secondary mb-4">Signature Payments (legacy)</h2>
          <div className="space-y-2">
            {data.sigPayments
              .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
              .slice(0, 15)
              .map(p => (
                <div key={p.orderReference} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-text-primary text-sm">Signature</span>
                    <span className="text-text-muted text-xs ml-3">{p.uid?.slice(0, 8)}...</span>
                    <span className="text-text-muted text-xs ml-3">{toDayMonthYear(p.createdAt)}</span>
                  </div>
                  <span className="text-green text-sm font-medium">{p.amount} UAH</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top users by copies */}
      <div className="bg-surface-card border border-border rounded-xl p-5">
        <h2 className="text-sm text-text-secondary mb-4">Top Users by Copies</h2>
        {users.filter(u => (u.signatureCopies || 0) > 0).length === 0 ? (
          <p className="text-text-muted text-sm">No data</p>
        ) : (
          <div className="space-y-2">
            {users
              .filter(u => (u.signatureCopies || 0) > 0)
              .sort((a, b) => (b.signatureCopies || 0) - (a.signatureCopies || 0))
              .slice(0, 10)
              .map(u => (
                <div key={u.uid} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-text-primary text-sm">{u.email || u.uid.slice(0, 12)}</span>
                  <span className="text-accent text-sm font-medium">{u.signatureCopies} copies</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
