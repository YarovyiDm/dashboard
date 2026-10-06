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
