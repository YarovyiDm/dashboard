import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { kmetaDb, kmetaAuth } from '../lib/firebase';

export interface KmetaUser {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  createdAt: string;
  plan?: string;
  specialization?: string;
}

const ADMIN_EMAIL = 'yarovoy.dmytro@gmail.com';
const ADMIN_EMAILS = [ADMIN_EMAIL, 'dmytro.poplinski@gmail.com', 'dm.romaniuk2323@gmail.com'];

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
        setUsers(all.filter(u => !ADMIN_EMAILS.includes(u.email ?? '')));
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
