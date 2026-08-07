import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { mockApi } from '../services/mockApi';
import type { SessionUser } from '../types/enrollment';

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  setUser: (user: SessionUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const session = await mockApi.getSession();
    setUser(session);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await mockApi.signIn(email, password);
    setUser(session);
    return session;
  }, []);

  const signOut = useCallback(async () => {
    await mockApi.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, signIn, signOut, setUser }),
    [user, loading, refresh, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
