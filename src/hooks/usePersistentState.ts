import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * useState that survives reloads by mirroring the value into localStorage.
 * `valid` guards against stale or hand-edited values (e.g. a removed filter
 * option) — anything it rejects falls back to `initial`.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  valid: (v: unknown) => v is T = (v): v is T => typeof v === typeof initial,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed: unknown = JSON.parse(raw);
      return valid(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full / blocked */ }
  }, [key, value]);

  return [value, setValue];
}

/** Validator for a value restricted to a fixed set of string options. */
export function oneOf<T extends string>(options: readonly T[]) {
  return (v: unknown): v is T => typeof v === 'string' && (options as readonly string[]).includes(v);
}
