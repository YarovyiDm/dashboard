import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, collectionGroup, doc, getCountFromServer, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
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
  // Public booking page.
  publicSlug?: string;
}

export type KmetaStatus = 'free' | 'pro' | 'pro_ending' | 'cancelled';

// Effective subscription status, derived the same way the kmeta app does:
// 'cancelled' plan or a lapsed 'pro' → cancelled; 'pro' with autoRenew off →
// pro_ending; otherwise pro; anything else → free.
export function kmetaEffectiveStatus(u: KmetaUser): KmetaStatus {
  if (!u.plan || u.plan === 'free') return 'free';
  if (u.plan === 'cancelled') return 'cancelled';
  const exp = toJsDate(u.proExpiresAt);
  if (!exp || exp.getTime() <= Date.now()) return 'cancelled';
  if (u.autoRenew === false) return 'pro_ending';
  return 'pro';
}

// Currently has Pro access (active or ending, not lapsed/cancelled).
export function isKmetaPro(u: KmetaUser): boolean {
  const s = kmetaEffectiveStatus(u);
  return s === 'pro' || s === 'pro_ending';
}

export const KMETA_STATUS_LABEL: Record<KmetaStatus, string> = {
  free: 'Free',
  pro: 'Pro',
  pro_ending: 'Pro ending',
  cancelled: 'Cancelled',
};

const STATUS_TONE: Record<KmetaStatus, string> = {
  pro: 'bg-amber/15 text-amber',
  pro_ending: 'bg-blue/15 text-blue',
  cancelled: 'bg-red/15 text-red',
  free: 'bg-surface-hover text-text-muted',
};

// Pill classes for an effective status (shared by Overview, Users, detail).
export function statusBadgeClass(s: KmetaStatus): string {
  return `inline-block px-1.5 py-0.5 rounded text-xs ${STATUS_TONE[s]}`;
}

// Back-compat: a pill for the raw `plan` value.
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

// One Kmeta Pro payment (subscriptionPayments doc) = platform revenue.
export interface KmetaSubPayment {
  amount?: number;
  currency?: string;       // 'UAH' | 'EUR'
  status?: string;         // 'paid'
  createdAt?: string;
  orderReference?: string;
  productType?: string;    // 'pro'
  periodStart?: string;
  periodEnd?: string;
  isRenewal?: boolean;
  provider?: string;       // 'creem' (RO)
}

// All subscription payments across every tutor, in one collection-group read.
// Compute totals (by currency, new vs renewal, by period) from the returned list.
export function useKmetaRevenue(enabled: boolean) {
  const [payments, setPayments] = useState<KmetaSubPayment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setPayments(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDocs(collectionGroup(kmetaDb, 'subscriptionPayments'))
      .then(snap => {
        if (cancelled) return;
        setPayments(snap.docs.map(d => d.data() as KmetaSubPayment));
        setAvailable(true);
      })
      .catch(() => { if (!cancelled) { setPayments(null); setAvailable(false); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled]);

  return { payments, loading, available };
}

// One tutor's subscription payment history (newest first), for the detail page.
export function useKmetaTutorSubscriptions(uid: string | undefined, enabled: boolean) {
  const [payments, setPayments] = useState<KmetaSubPayment[] | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!enabled || !uid) {
      setPayments(null);
      return;
    }
    let cancelled = false;
    getDocs(collection(kmetaDb, 'users', uid, 'subscriptionPayments'))
      .then(snap => {
        if (cancelled) return;
        const list = snap.docs.map(d => d.data() as KmetaSubPayment);
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setPayments(list);
        setAvailable(true);
      })
      .catch(() => { if (!cancelled) { setPayments(null); setAvailable(false); } });
    return () => { cancelled = true; };
  }, [uid, enabled]);

  return { payments, available };
}

// ── Booking pages, trial requests, reports ──────────────────────────────────

export interface KmetaPublicProfile {
  slug?: string;
  uid?: string;
  enabled?: boolean;
  name?: string;
  photo?: string;
  subjects?: string[];
  bio?: string;
  city?: string;
  format?: string;
  price?: number;
  trialPrice?: number;
  currency?: string;
  socials?: Record<string, string>;
  links?: { label?: string; url?: string }[];
  updatedAt?: string;
}

export interface KmetaBookingRequest {
  slug?: string;
  slot?: string;
  status?: string;   // 'new' | 'accepted' | 'declined'
  createdAt?: string;
  decidedAt?: string;
  studentId?: string;
  source?: string;   // tag of the link the visitor came by
  subject?: string;
  locale?: string;
}

export interface KmetaPageReport {
  id?: string;
  slug?: string;
  uid?: string;
  reason?: string;   // 'fake' | 'abuse' | 'adult' | 'spam' | 'privacy' | 'cheating' | 'other'
  details?: string;
  contact?: string;
  locale?: string;
  status?: string;   // 'new' | 'reviewed' | 'dismissed' | 'actioned'
  createdAt?: string;
  pageUrl?: string;
  reviewedAt?: string;
  reviewNote?: string;
  snapshot?: KmetaPublicProfile;
}

// All public booking pages (one per tutor who created one). `enabled` = published.
export function useKmetaPublicProfiles(enabled: boolean) {
  const [profiles, setProfiles] = useState<KmetaPublicProfile[] | null>(null);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    if (!enabled) { setProfiles(null); return; }
    let cancelled = false;
    getDocs(collection(kmetaDb, 'publicProfiles'))
      .then(snap => { if (!cancelled) { setProfiles(snap.docs.map(d => ({ slug: d.id, ...d.data() } as KmetaPublicProfile))); setAvailable(true); } })
      .catch(() => { if (!cancelled) { setProfiles(null); setAvailable(false); } });
    return () => { cancelled = true; };
  }, [enabled]);
  return { profiles, available };
}

// All trial requests across tutors (collection-group).
export function useKmetaBookingRequests(enabled: boolean) {
  const [requests, setRequests] = useState<KmetaBookingRequest[] | null>(null);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    if (!enabled) { setRequests(null); return; }
    let cancelled = false;
    getDocs(collectionGroup(kmetaDb, 'bookingRequests'))
      .then(snap => { if (!cancelled) { setRequests(snap.docs.map(d => d.data() as KmetaBookingRequest)); setAvailable(true); } })
      .catch(() => { if (!cancelled) { setRequests(null); setAvailable(false); } });
    return () => { cancelled = true; };
  }, [enabled]);
  return { requests, available };
}

// All page reports across tutors (collection-group).
export function useKmetaPageReports(enabled: boolean) {
  const [reports, setReports] = useState<KmetaPageReport[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) { setReports(null); return; }
    let cancelled = false;
    setLoading(true);
    getDocs(collectionGroup(kmetaDb, 'pageReports'))
      .then(snap => { if (!cancelled) { setReports(snap.docs.map(d => d.data() as KmetaPageReport)); setAvailable(true); } })
      .catch(() => { if (!cancelled) { setReports(null); setAvailable(false); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled]);
  return { reports, available, loading };
}

// Count of trial students that converted (needs a collection-group index on
// students.trial.outcome; `available` is false until that index exists).
export function useKmetaConvertedTrials(enabled: boolean) {
  const [count, setCount] = useState<number | null>(null);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    if (!enabled) { setCount(null); return; }
    let cancelled = false;
    getCountFromServer(query(collectionGroup(kmetaDb, 'students'), where('trial.outcome', '==', 'converted')))
      .then(agg => { if (!cancelled) { setCount(agg.data().count); setAvailable(true); } })
      .catch(() => { if (!cancelled) { setCount(null); setAvailable(false); } });
    return () => { cancelled = true; };
  }, [enabled]);
  return { count, available };
}

// ── Per-tutor (detail page) ─────────────────────────────────────────────────

// One tutor's public booking page (publicProfiles/{slug}).
export function useKmetaTutorPublicProfile(slug: string | undefined, enabled: boolean) {
  const [profile, setProfile] = useState<KmetaPublicProfile | null>(null);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    if (!enabled || !slug) { setProfile(null); return; }
    let cancelled = false;
    getDoc(doc(kmetaDb, 'publicProfiles', slug))
      .then(snap => {
        if (cancelled) return;
        setProfile(snap.exists() ? ({ slug: snap.id, ...snap.data() } as KmetaPublicProfile) : null);
        setAvailable(true);
      })
      .catch(() => { if (!cancelled) { setProfile(null); setAvailable(false); } });
    return () => { cancelled = true; };
  }, [slug, enabled]);
  return { profile, available };
}

// One tutor's trial requests (newest first).
export function useKmetaTutorBookingRequests(uid: string | undefined, enabled: boolean) {
  const [requests, setRequests] = useState<KmetaBookingRequest[] | null>(null);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    if (!enabled || !uid) { setRequests(null); return; }
    let cancelled = false;
    getDocs(collection(kmetaDb, 'users', uid, 'bookingRequests'))
      .then(snap => {
        if (cancelled) return;
        const l = snap.docs.map(d => d.data() as KmetaBookingRequest);
        l.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setRequests(l);
        setAvailable(true);
      })
      .catch(() => { if (!cancelled) { setRequests(null); setAvailable(false); } });
    return () => { cancelled = true; };
  }, [uid, enabled]);
  return { requests, available };
}

// One tutor's page reports (newest first) + the single allowed write: status.
export function useKmetaTutorReports(uid: string | undefined, enabled: boolean) {
  const [reports, setReports] = useState<KmetaPageReport[] | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!enabled || !uid) { setReports(null); return; }
    let cancelled = false;
    getDocs(collection(kmetaDb, 'users', uid, 'pageReports'))
      .then(snap => {
        if (cancelled) return;
        const l = snap.docs.map(d => ({ id: d.id, ...d.data() } as KmetaPageReport));
        l.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setReports(l);
        setAvailable(true);
      })
      .catch(() => { if (!cancelled) { setReports(null); setAvailable(false); } });
    return () => { cancelled = true; };
  }, [uid, enabled]);

  const setStatus = useCallback(async (reportId: string, status: string, reviewNote?: string) => {
    if (!uid) return;
    const payload: { status: string; reviewedAt: string; reviewNote?: string } =
      { status, reviewedAt: new Date().toISOString() };
    if (reviewNote !== undefined) payload.reviewNote = reviewNote;
    await updateDoc(doc(kmetaDb, 'users', uid, 'pageReports', reportId), payload);
    setReports(prev => prev ? prev.map(r => (r.id === reportId ? { ...r, ...payload } : r)) : prev);
  }, [uid]);

  return { reports, available, setStatus };
}
