import type { CSSProperties } from 'react';

// kmeta palette constants for places that need raw colors (recharts, inline styles).
export const GOLD = '#ffc552';
export const TEAL = '#2fd3c0';

/** Stagger index for k-rise / k-grow animations. */
export const stagger = (i: number): CSSProperties => ({ '--i': i } as CSSProperties);

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('uk-UA');
}
