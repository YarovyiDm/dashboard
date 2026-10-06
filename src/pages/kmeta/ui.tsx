import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LogIn } from 'lucide-react';
import { GOLD, stagger, fmt } from './theme';

// Shared building blocks for the kmeta section. Colors come from the
// `.theme-pine` tokens (see index.css); motion classes are k-rise / k-grow.

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts up to `value` on mount and eases between later changes. */
export function AnimatedNumber({ value, format = fmt }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(() => (reduceMotion() ? value : 0));
  const from = useRef(shown);

  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const dur = reduceMotion() ? 0 : 750;
    let raf = 0;
    const tick = (t: number) => {
      const p = dur ? Math.min(1, (t - start) / dur) : 1;
      const e = 1 - Math.pow(1 - p, 3);
      const v = a + (value - a) * e;
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{format(shown)}</>;
}

/** Renders numbers animated, and placeholders ('—', '…') as-is. */
export function Num({ v }: { v: number | string }) {
  return typeof v === 'number' ? <AnimatedNumber value={v} /> : <span className="text-text-muted">{v}</span>;
}

export function PageHeader({ title, subtitle, right, eyebrow = 'kmeta' }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; eyebrow?: string }) {
  return (
    <div className="k-rise flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6 sm:mb-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green k-live" />
          {eyebrow}
        </div>
        <h1 className="text-[26px] sm:text-3xl font-extrabold tracking-tight text-text-primary leading-tight">{title}</h1>
        {subtitle && <div className="text-sm text-text-muted mt-1">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function SectionLabel({ children, i = 0 }: { children: ReactNode; i?: number }) {
  return (
    <div className="k-rise flex items-center gap-3 mt-8 sm:mt-10 mb-3" style={stagger(i)}>
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted shrink-0">{children}</h2>
      <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

export function Panel({ title, icon, right, children, className = '', i = 0, gold = false, pad = true }: {
  title?: ReactNode; icon?: ReactNode; right?: ReactNode; children: ReactNode;
  className?: string; i?: number; gold?: boolean; pad?: boolean;
}) {
  return (
    <section className={`k-card k-rise ${gold ? 'k-card-gold' : ''} ${pad ? 'p-4 sm:p-5' : 'overflow-hidden'} ${className}`} style={stagger(i)}>
      {(title || right) && (
        <header className={`flex items-center justify-between gap-3 ${pad ? 'mb-4' : 'px-4 sm:px-5 py-3.5 border-b border-border'}`}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary min-w-0">
            {icon && <span className="text-accent shrink-0">{icon}</span>}
            <span className="truncate">{title}</span>
          </h3>
          {right && <div className="shrink-0 text-xs text-text-muted">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

const TONE: Record<string, string> = {
  gold: 'text-accent bg-accent/10 ring-accent/20',
  teal: 'text-[var(--k-teal)] bg-[var(--k-teal)]/10 ring-[var(--k-teal)]/20',
  green: 'text-green bg-green/10 ring-green/20',
  blue: 'text-blue bg-blue/10 ring-blue/20',
  red: 'text-red bg-red/10 ring-red/20',
  muted: 'text-text-secondary bg-surface-hover ring-border',
};
export type Tone = keyof typeof TONE;

export function Kpi({ label, value, icon, hint, tone = 'gold', i = 0, compact = false }: {
  label: string; value: number | string; icon?: ReactNode; hint?: ReactNode; tone?: Tone; i?: number;
  /** Hide the icon chip on phones (for 3-up rows). */
  compact?: boolean;
}) {
  return (
    <div className="k-card k-card-hover k-rise p-4 sm:p-5 flex flex-col min-w-0" style={stagger(i)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-xs sm:text-[13px] font-medium text-text-secondary leading-snug">{label}</span>
        {icon && <span className={`${compact ? 'hidden sm:grid' : 'grid'} place-items-center w-8 h-8 rounded-xl ring-1 shrink-0 [&>svg]:w-4 [&>svg]:h-4 ${TONE[tone]}`}>{icon}</span>}
      </div>
      <div className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-text-primary leading-none"><Num v={value} /></div>
      {hint && <div className="mt-2 text-[11px] sm:text-xs text-text-muted leading-snug">{hint}</div>}
    </div>
  );
}

/** One proportional bar split into colored segments, with a legend below. */
export function StackBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-surface-hover gap-[3px]">
        {total > 0 && segments.filter(s => s.value > 0).map((s, idx) => (
          <div key={s.label} className="k-grow h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(s.value / total) * 100}%`, background: s.color, ...stagger(idx) }} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-3 mt-4">
        {segments.map(s => (
          <div key={s.label} className="flex items-start gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: s.color }} />
            <div className="min-w-0">
              <div className="text-lg font-bold text-text-primary leading-tight">
                <AnimatedNumber value={s.value} />
                {total > 0 && <span className="text-xs font-medium text-text-muted ml-1.5">{Math.round((s.value / total) * 100)}%</span>}
              </div>
              <div className="text-xs text-text-muted truncate">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranked list with a soft proportional bar behind each row. */
export function BarList({ rows, color = GOLD, mono = false, empty = 'No data', head }: {
  rows: { key: string; label: ReactNode; value: number; extra?: ReactNode }[];
  color?: string; mono?: boolean; empty?: string; head?: [string, string];
}) {
  if (rows.length === 0) return <div className="text-sm text-text-muted py-2">{empty}</div>;
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <div className="space-y-1.5">
      {head && (
        <div className="flex justify-between text-[11px] uppercase tracking-wider text-text-muted px-2.5 pb-1">
          <span>{head[0]}</span><span>{head[1]}</span>
        </div>
      )}
      {rows.map((r, idx) => (
        <div key={r.key} className="relative rounded-lg overflow-hidden">
          <div
            className="k-grow absolute inset-y-0 left-0 rounded-lg"
            style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: `linear-gradient(90deg, ${color}2e, ${color}12)`, ...stagger(idx) }}
          />
          <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-sm">
            <span className={`text-text-primary truncate ${mono ? 'font-mono text-xs' : ''}`}>{r.label}</span>
            <span className="shrink-0 font-semibold text-text-primary tabular-nums">{r.extra ?? r.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Small stat used inside panels. */
export function MiniStat({ label, value, className = 'text-text-primary' }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="min-w-0">
      <div className={`text-xl font-extrabold tracking-tight leading-tight ${className}`}><Num v={value} /></div>
      <div className="text-xs text-text-muted mt-0.5">{label}</div>
    </div>
  );
}

export function ConnectGate({ title, error, onConnect, retry = false, text }: {
  title: string; error?: string | null; onConnect: () => void; retry?: boolean; text?: string;
}) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="k-card k-card-gold k-rise p-6 sm:p-8 max-w-md">
        <div className="w-12 h-12 rounded-2xl grid place-items-center bg-accent/15 text-accent mb-4 ring-1 ring-accent/25">
          <LogIn className="w-5 h-5" />
        </div>
        {!retry && (
          <p className="text-text-secondary mb-5 leading-relaxed">
            {text ?? 'kmeta — окремий Firebase-проект. Підключи його, щоб побачити дані (окрема авторизація Google, потрібна один раз).'}
          </p>
        )}
        {retry && error && <p className="text-red text-sm mb-5">{error}</p>}
        <button onClick={onConnect} className="k-btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-xl">
          <LogIn className="w-4 h-4" /> {retry ? 'Спробувати ще' : 'Підключити kmeta'}
        </button>
        {!retry && error && <p className="text-red text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
}

/** Shimmering placeholder layout shown while kmeta data loads. */
export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="k-fade">
      <div className="k-skeleton h-3 w-16 rounded-full mb-3" />
      <div className="k-skeleton h-8 w-56 rounded-lg mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="k-skeleton h-28 rounded-2xl" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="k-skeleton h-40 rounded-2xl mb-4" />)}
    </div>
  );
}

export function Avatar({ src, name, size = 36, gold = false }: { src?: string; name: string; size?: number; gold?: boolean }) {
  const ring = gold ? 'ring-2 ring-accent/70 ring-offset-2 ring-offset-surface-card' : 'ring-1 ring-border';
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" className={`rounded-full object-cover shrink-0 ${ring}`} style={{ width: size, height: size }} />
  ) : (
    <div
      className={`rounded-full grid place-items-center shrink-0 font-bold text-accent bg-gradient-to-br from-accent/25 to-[var(--k-teal)]/15 ${ring}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}
