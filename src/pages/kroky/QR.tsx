import { useMemo } from 'react';
import { MousePointerClick, Download, Users, Palette } from 'lucide-react';
import { useKrokyUsers } from '../../hooks/useKrokyData';
import { PageHeader, Panel, Kpi, BarList, LoadingSkeleton } from '../../components/ui';

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
    const styleCount: Record<string, number> = {};
    users.forEach(u => u.qrStylesViewed?.forEach(st => { styleCount[st] = (styleCount[st] || 0) + 1; }));
    const styles = Object.entries(styleCount).sort(([, a], [, b]) => b - a);
    return { totalOpens, editorUsers, totalDownloads, styles };
  }, [users]);

  if (loading) return <LoadingSkeleton rows={1} />;

  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="kroky" title="QR Code" subtitle="Генератор QR-кодів" />
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Kpi i={0} compact label="Editor opens" value={data.totalOpens} icon={<MousePointerClick />} tone="teal" />
        <Kpi i={1} compact label="Editor users" value={data.editorUsers} icon={<Users />} tone="blue" />
        <Kpi i={2} compact label="Downloads" value={data.totalDownloads} icon={<Download />} tone="gold" />
      </div>
      <Panel i={3} className="mt-3 sm:mt-4" title="Styles by views" icon={<Palette className="w-4 h-4" />} right="users who viewed">
        <BarList empty="Немає даних" rows={data.styles.map(([id, n]) => ({ key: id, label: STYLE_NAMES[id] || id, value: n }))} />
      </Panel>
    </div>
  );
}
