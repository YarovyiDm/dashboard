import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Props {
  id: string;
  name: string;
  description: string;
  stats: { label: string; value: string | number }[];
}

export function ProjectCard({ id, name, description, stats }: Props) {
  return (
    <Link
      to={`/${id}`}
      className="block bg-surface-card border border-border rounded-xl p-6 hover:bg-surface-hover hover:border-accent/30 transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-text-primary">{name}</h2>
        <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors" />
      </div>
      <p className="text-text-secondary text-sm mb-4">{description}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
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
