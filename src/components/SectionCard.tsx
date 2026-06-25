import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  to: string;
  title: string;
  icon: ReactNode;
  stats: { label: string; value: string | number }[];
}

export function SectionCard({ to, title, icon, stats }: Props) {
  return (
    <Link
      to={to}
      className="block bg-surface-card border border-border rounded-xl p-5 hover:bg-surface-hover hover:border-accent/30 transition-all group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-accent">{icon}</span>
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors" />
      </div>
      <div className="flex gap-6">
        {stats.map(s => (
          <div key={s.label}>
            <div className="text-lg font-semibold text-text-primary">{s.value}</div>
            <div className="text-xs text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </Link>
  );
}
