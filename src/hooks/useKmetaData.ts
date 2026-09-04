import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, count, getAggregateFromServer, getCountFromServer, getDocs, query, sum } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { kmetaDb, kmetaAuth } from '../lib/firebase';
import { toJsDate } from '../lib/date';

export interface KmetaUser {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  // Firestore Timestamp on kmeta (kroky stores an ISO string); normalize via toJsDate.
  createdAt?: unknown;
  plan?: string;            // 'free' | 'pro' | 'cancelled'
  proExpiresAt?: string;    // ISO string; may outlive a 'cancelled' plan
  specialization?: string;
  // Subscription / settings on the tutor doc.
  lastPaymentAt?: string;
  autoRenew?: boolean;
  lessonDuration?: number;
  remindBefore10?: boolean;
  remindBefore30?: boolean;
  subscriptionOrderRef?: string;
}

// Has Pro access right now — true while the subscription hasn't lapsed, which
// also covers a 'cancelled' plan still within its paid period.
export function isKmetaPro(u: KmetaUser): boolean {
  const exp = toJsDate(u.proExpiresAt);
  return exp ? exp.getTime() > Date.now() : false;
}

// Tailwind classes for a plan pill (shared by the Overview and Users pages).
export function planBadgeClass(plan?: string): string {
  const tone: Record<string, string> = {
    pro: 'bg-amber/15 text-amber',
    cancelled: 'bg-red/15 text-red',
    free: 'bg-surface-hover text-text-muted',
  };
  return `inline-block px-1.5 py-0.5 rounded text-xs ${tone[plan ?? 'free'] ?? tone.free}`;
}

// Signed-in identity that unlocks kmeta.
const ADMIN_EMAIL = 'yarovoy.dmytro@gmail.com';
// Accounts hidden from every kmeta stat (admins + personal test accounts).
const EXCLUDED_EMAILS = [
  ADMIN_EMAIL,
  'dmytro.poplinski@gmail.com',
  'dm.romaniuk2323@gmail.com',
  'kmeta.test@gmail.com',
  'd.yarovyi@goodevas.com',
  'anichka0908204@gmail.com',
];

export function useKmetaUsers() {
  const [users, setUsers] = useState<KmetaUser[]>([]);
  const [loading, setLoading] = useState(true);
  // kmeta is a separate Firebase project with its own auth session, so we
  // sign into it independently from kroky before its Firestore lets us read.
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(kmetaAuth, (u) => {
      setConnected(!!u);
      if (!u) {
        setUsers([]);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!connected) return;
    setLoading(true);
    setError(null);
    getDocs(query(collection(kmetaDb, 'users')))
      .then((snap) => {
        const all = snap.docs.map(d => ({ uid: d.id, ...d.data() } as KmetaUser));
        setUsers(all.filter(u => !EXCLUDED_EMAILS.includes(u.email ?? '')));
      })
      .catch((e: unknown) => {
        const code = (e as { code?: string })?.code;
        setError(code === 'permission-denied'
          ? 'Немає доступу до даних kmeta — перевір Firestore rules (isAdmin).'
          : ((e as { message?: string })?.message || 'Не вдалося завантажити дані kmeta.'));
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, [connected]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const result = await signInWithPopup(kmetaAuth, new GoogleAuthProvider());
      if (result.user.email !== ADMIN_EMAIL) {
        await signOut(kmetaAuth);
        setError('Цей акаунт не має доступу до kmeta.');
      }
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError((e as { message?: string })?.message || 'Не вдалося підключити kmeta.');
      }
    }
  }, []);

  return { users, loading, connected, connect, error };
}

export interface TutorCounts {
  lessons: number;
  groups: number;
  students: number;
}

// Per-tutor subcollection counts (lessons/groups/students), fetched with
// aggregate count queries so we never download the documents themselves.
// `available` flips to false if the admin can't read subcollections yet
// (i.e. the kmeta rules haven't granted isAdmin() read on {document=**}).
export function useKmetaSubcounts(users: KmetaUser[]) {
  const [counts, setCounts] = useState<Record<string, TutorCounts>>({});
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!users.length) {
      setCounts({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const entries = await Promise.all(users.map(async (u) => {
          const [l, g, s] = await Promise.all([
            getCountFromServer(collection(kmetaDb, 'users', u.uid, 'lessons')),
            getCountFromServer(collection(kmetaDb, 'users', u.uid, 'groups')),
            getCountFromServer(collection(kmetaDb, 'users', u.uid, 'students')),
          ]);
          return [u.uid, {
            lessons: l.data().count,
            groups: g.data().count,
            students: s.data().count,
          }] as const;
        }));
        if (cancelled) return;
        setCounts(Object.fromEntries(entries));
        setAvailable(true);
      } catch {
        if (cancelled) return;
        setCounts({});
        setAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [users]);

  const totals = useMemo(() => Object.values(counts).reduce(
    (a, c) => ({ lessons: a.lessons + c.lessons, groups: a.groups + c.groups, students: a.students + c.students }),
    { lessons: 0, groups: 0, students: 0 },
  ), [counts]);

  return { counts, totals, loading, available };
}

export interface TutorFullCounts {
  students: number;
  groups: number;
  lessons: number;
  payments: number;
}

// Subcollection counts for a single tutor (used on the detail page); includes
// paymentLogs. `available` is false if the admin can't read subcollections.
export function useKmetaTutorCounts(uid: string | undefined, enabled: boolean) {
  const [counts, setCounts] = useState<TutorFullCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!enabled || !uid) {
      setCounts(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [s, g, l, p] = await Promise.all([
          getCountFromServer(collection(kmetaDb, 'users', uid, 'students')),
          getCountFromServer(collection(kmetaDb, 'users', uid, 'groups')),
          getCountFromServer(collection(kmetaDb, 'users', uid, 'lessons')),
          getCountFromServer(collection(kmetaDb, 'users', uid, 'paymentLogs')),
        ]);
        if (cancelled) return;
        setCounts({
          students: s.data().count,
          groups: g.data().count,
          lessons: l.data().count,
          payments: p.data().count,
        });
        setAvailable(true);
      } catch {
        if (cancelled) return;
        setCounts(null);
        setAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, enabled]);

  return { counts, loading, available };
}

// Platform subscription revenue — per-tutor sum + count of the
// users/{uid}/subscriptionPayments logs (kmeta's own income from Pro), via
// server-side aggregation. Empty for tutors who never paid. Distinct from
// paymentLogs (which is tutors' lesson income from students).
export function useKmetaSubscriptionRevenue(users: KmetaUser[], enabled: boolean) {
  const [data, setData] = useState<{ total: number; count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!enabled || !users.length) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const per = await Promise.all(users.map(u =>
          getAggregateFromServer(collection(kmetaDb, 'users', u.uid, 'subscriptionPayments'), {
            total: sum('amount'),
            count: count(),
          }).then(agg => ({ total: agg.data().total ?? 0, count: agg.data().count }))
        ));
        if (cancelled) return;
        setData({
          total: per.reduce((s, p) => s + (p.total || 0), 0),
          count: per.reduce((s, p) => s + p.count, 0),
        });
        setAvailable(true);
      } catch {
        if (cancelled) return;
        setData(null);
        setAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [users, enabled]);

  return { data, loading, available };
}
