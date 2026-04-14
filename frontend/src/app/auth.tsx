import React from 'react';
import type { AuthSession } from '@/lib/types';

const TOKEN_KEY = 'educollab.token';

export type AuthState = {
  token: string | null;
  session: AuthSession | null;
};

export type AuthContextValue = AuthState & {
  setSession: (s: AuthSession | null) => void;
  setToken: (t: string | null) => void;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = React.useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [session, setSessionState] = React.useState<AuthSession | null>(null);

  const setToken = (t: string | null) => {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    setTokenState(t);
  };

  const setSession = (s: AuthSession | null) => setSessionState(s);

  const logout = () => {
    setToken(null);
    setSession(null);
  };

  return <AuthContext.Provider value={{ token, session, setSession, setToken, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

