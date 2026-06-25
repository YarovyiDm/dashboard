import { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { urokDb } from '../lib/firebase';

export interface UrokUser {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  createdAt: string;
  plan?: string;
  specialization?: string;
}

const ADMIN_EMAILS = ['yarovoy.dmytro@gmail.com', 'dmytro.poplinski@gmail.com', 'dm.romaniuk2323@gmail.com'];

export function useUrokUsers() {
  const [users, setUsers] = useState<UrokUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(urokDb, 'users'))).then((snap) => {
      const all = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UrokUser));
      setUsers(all.filter(u => !ADMIN_EMAILS.includes(u.email ?? '')));
      setLoading(false);
    });
  }, []);

  return { users, loading };
}
