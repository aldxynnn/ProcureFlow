'use client';
import { api, tokenStore, type User } from './api';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AuthContextValue = { user: User | null; loading: boolean; login: (email: string, password: string, slug: string) => Promise<void>; logout: () => Promise<void>; };
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { api.refresh().then(d => { tokenStore.set(d.accessToken); setUser(d.user); }).catch(() => {}).finally(() => setLoading(false)); }, []);
  const value = useMemo<AuthContextValue>(() => ({ user, loading, login: async (email, password, slug) => { const d = await api.login({ email, password, organizationSlug: slug }); tokenStore.set(d.accessToken); setUser(d.user); }, logout: async () => { await api.logout(); tokenStore.set(null); setUser(null); } }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
