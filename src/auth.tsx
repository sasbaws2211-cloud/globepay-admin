import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError, getToken, setToken, setUnauthorizedHandler } from './api';
import type { Me } from './types';

interface AuthState {
  me: Me | null;
  checking: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [checking, setChecking] = useState(true);

  const signOut = useCallback(() => {
    setToken(null);
    setMe(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Resume a session from this tab after a reload.
  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    api<Me>('/auth/me')
      .then((user) => (user.is_admin ? setMe(user) : signOut()))
      .catch(() => signOut())
      .finally(() => setChecking(false));
  }, [signOut]);

  const signIn = useCallback(async (phone: string, password: string) => {
    const { access_token } = await api<{ access_token: string }>('/auth/login', {
      method: 'POST',
      json: { phone_number: phone.trim(), password },
    });
    setToken(access_token);
    let user: Me;
    try {
      user = await api<Me>('/auth/me');
    } catch (err) {
      setToken(null);
      throw err;
    }
    if (!user.is_admin) {
      setToken(null);
      throw new ApiError('This account does not have admin access.', 403);
    }
    setMe(user);
  }, []);

  return <AuthContext.Provider value={{ me, checking, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
