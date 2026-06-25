import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className = '' }: Props) {
  return (
    <div className={`bg-surface-card border border-border rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-secondary text-sm">{label}</span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold text-text-primary">{value}</div>
      {trend && (
        <div className="mt-2 text-xs">
          <span className={trend.value >= 0 ? 'text-green' : 'text-red'}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-text-muted ml-1">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
