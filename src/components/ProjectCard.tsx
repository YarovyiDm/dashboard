import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { AnimatedNumber } from './ui';
import { stagger } from '../lib/theme';

interface Props {
  id: string;
  name: string;
  description: string;
  mark: ReactNode;
  /** Project accent, used for the glow and the stat highlight. */
  accent: string;
  stats: { label: string; value: number | string; suffix?: string }[];
  i?: number;
}

export function ProjectCard({ id, name, description, mark, accent, stats, i = 0 }: Props) {
  return (
    <Link
      to={`/${id}`}
      className="k-card k-card-hover k-rise group relative flex flex-col overflow-hidden p-5 sm:p-7 active:scale-[0.99]"
      style={stagger(i)}
    >
      {/* Accent glow in the corner, brightens on hover. */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-25 group-hover:opacity-45 transition-opacity duration-500"
        style={{ background: accent }}
      />

      <div className="relative flex items-start gap-4">
        <div
          className="grid place-items-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0"
          style={{ background: `${accent}1a`, boxShadow: `inset 0 0 0 1px ${accent}33` }}
        >
          {mark}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-primary leading-tight">{name}</h2>
          <p className="text-sm text-text-muted mt-1 leading-snug">{description}</p>
        </div>
        <span className="grid place-items-center w-10 h-10 rounded-full border border-border text-text-muted shrink-0 transition-all duration-300 group-hover:bg-accent group-hover:border-accent group-hover:text-[#1d1503] group-hover:rotate-45">
          <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-45" />
        </span>
      </div>

      <div className="relative grid gap-3 mt-auto pt-6 sm:pt-7" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
        {stats.map((s, idx) => (
          <div key={s.label} className="min-w-0 rounded-xl bg-surface/60 border border-border/70 px-3 py-3 sm:px-4">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none truncate" style={{ color: idx === 0 ? undefined : accent }}>
              {typeof s.value === 'number' ? <AnimatedNumber value={s.value} /> : <span className="text-text-muted">{s.value}</span>}
              {s.suffix && <span className="text-xs font-bold ml-1 opacity-70">{s.suffix}</span>}
            </div>
            <div className="text-[11px] sm:text-xs text-text-muted mt-1.5 uppercase tracking-wider truncate">{s.label}</div>
          </div>
        ))}
      </div>
    </Link>
  );
}
