import { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { krokyDb } from '../lib/firebase';
import type { UserProfile, PaymentRecord } from '../types';

const ADMIN_EMAILS = ['yarovoy.dmytro@gmail.com', 'dmytro.poplinski@gmail.com', 'dm.romaniuk2323@gmail.com'];

export function useKrokyUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(krokyDb, 'users'))).then((snap) => {
      const all = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(all.filter(u => !ADMIN_EMAILS.includes(u.email ?? '')));
      setLoading(false);
    });
  }, []);

  return { users, loading };
}

export function useKrokyPayments() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(krokyDb, 'users'))),
      getDocs(query(collection(krokyDb, 'payments'))),
    ]).then(([usersSnap, paymentsSnap]) => {
      const uids = new Set(
        usersSnap.docs
          .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
          .filter(u => ADMIN_EMAILS.includes(u.email ?? ''))
          .map(u => u.uid)
      );
      const all = paymentsSnap.docs.map(d => d.data() as PaymentRecord);
      setPayments(all.filter(p => !uids.has(p.uid)));
      setLoading(false);
    });
  }, []);

  return { payments, loading };
}
