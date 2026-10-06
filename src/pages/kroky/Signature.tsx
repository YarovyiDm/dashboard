import { useMemo } from 'react';
import { Copy, MousePointerClick, Eye, LayoutTemplate } from 'lucide-react';
import { useKrokyUsers } from '../../hooks/useKrokyData';
import { PageHeader, Panel, Kpi, BarList, LoadingSkeleton } from '../../components/ui';
import { TEAL } from '../../lib/theme';

const TEMPLATE_NAMES: Record<string, string> = {
  modern: 'Modern', classic: 'Classic', minimal: 'Minimal', bold: 'Bold',
  banner: 'Banner', elegant: 'Elegant', columns: 'Columns', compact: 'Compact',
};

export function KrokySignature() {
  const { users, loading } = useKrokyUsers();

  const data = useMemo(() => {
    const totalOpens = users.reduce((s, u) => s + (u.signatureOpened || 0), 0);
    const editorUsers = users.filter(u => (u.signatureOpened || 0) > 0).length;
    const totalCopies = users.reduce((s, u) => s + (u.signatureCopies || 0), 0);
    const viewedCount: Record<string, number> = {};
    users.forEach(u => u.signatureTemplatesViewed?.forEach(t => { viewedCount[t] = (viewedCount[t] || 0) + 1; }));
    const viewed = Object.entries(viewedCount).sort(([, a], [, b]) => b - a);
    return { totalOpens, editorUsers, totalCopies, viewed };
  }, [users]);

  if (loading) return <LoadingSkeleton rows={1} />;

  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="kroky" title="Signature" subtitle="Конструктор email-підписів" />
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Kpi i={0} compact label="Editor opens" value={data.totalOpens} icon={<MousePointerClick />} tone="teal" />
        <Kpi i={1} compact label="Editor users" value={data.editorUsers} icon={<Eye />} tone="blue" />
        <Kpi i={2} compact label="Copies" value={data.totalCopies} icon={<Copy />} tone="gold" />
      </div>
      <Panel i={3} className="mt-3 sm:mt-4" title="Templates by views" icon={<LayoutTemplate className="w-4 h-4" />} right="users who viewed">
        <BarList color={TEAL} empty="Немає даних" rows={data.viewed.map(([id, n]) => ({ key: id, label: TEMPLATE_NAMES[id] || id, value: n }))} />
      </Panel>
    </div>
  );
}
