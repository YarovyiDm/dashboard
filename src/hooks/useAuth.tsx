import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { krokyAuth } from '../lib/firebase';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(krokyAuth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = async () => {
    await signInWithPopup(krokyAuth, new GoogleAuthProvider());
  };

  const logout = async () => {
    await signOut(krokyAuth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
