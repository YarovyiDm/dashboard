import { Footprints } from 'lucide-react';

// Brand mark inspired by the kmeta logo: a gold ring around a gold dot.
export function KmetaMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="5" className="text-accent" />
      <path d="M16 4 a12 12 0 1 1 -11.4 15.7" fill="none" stroke="var(--color-accent)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="4.5" fill="var(--color-accent)" />
    </svg>
  );
}

// Kroky mark: footprints on a teal tile.
export function KrokyMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <span className={`grid place-items-center rounded-lg bg-[var(--k-teal)]/15 text-[var(--k-teal)] ${className}`} aria-hidden>
      <Footprints className="w-[62%] h-[62%]" />
    </span>
  );
}

// Dashboard app mark — same artwork as the favicon / PWA icon (public/logo.svg).
export function AppMark({ className = 'w-9 h-9' }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className={`shrink-0 ${className}`} />;
}
