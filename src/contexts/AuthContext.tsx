import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { User } from '@/types/ouvidoria';
import { logAudit } from '@/lib/api';
import {
  getStoredAuth,
  setStoredAuth,
  clearStoredAuth,
  type AppSession,
  type AppUser,
  type StoredAuth,
} from '@/lib/api-client';

let apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? import.meta.env.BASE_URL ?? '';
if (apiBaseUrl.endsWith('/')) {
  apiBaseUrl = apiBaseUrl.slice(0, -1);
}
const BASE_URL = apiBaseUrl;

// ── Tipos públicos (mantidos compatíveis com o uso anterior) ──────────────────

// Session é o mesmo que StoredAuth + user, re-exportado como AppSession
export type { AppSession as Session };
export type { AppUser as SupabaseUser };

interface AuthContextType {
  session: AppSession | null;
  supabaseUser: AppUser | null;
  profile: User | null;
  loading: boolean;
  networkError: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearNetworkError: () => void;
}

export interface SignUpData {
  name: string;
  cpf: string;
  email: string;
  registration: string;
  role: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('network') || msg.includes('net::');
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0 || !isNetworkError(error)) throw error;
    await new Promise(r => setTimeout(r, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

async function fetchProfileById(userId: string, accessToken: string, timeoutMs = 8000): Promise<User | null> {
  return Promise.race([
    withRetry(async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Profile fetch failed');
      const users: any[] = await res.json();
      const u = users.find((x: any) => x.id === userId);
      if (!u) return null;
      return {
        id: u.id,
        name: u.name,
        cpf: u.cpf,
        email: u.email,
        registration: u.registration,
        role: u.role,
        status: u.status,
        organs: u.organ_ids ?? [],
        primaryOrganId: u.primary_organ_id ?? undefined,
        avatar: u.avatar ?? undefined,
      } as User;
    }, 3, 1000),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout ao buscar perfil')), timeoutMs)
    ),
  ]);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  const profileRef = useRef<User | null>(null);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const clearAll = () => {
    setSession(null);
    setSupabaseUser(null);
    setProfile(null);
    setNetworkError(false);
  };

  const clearNetworkError = () => setNetworkError(false);

  // ── Restore session on load ──
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const stored = getStoredAuth();
      if (!stored) {
        clearAll();
        setLoading(false);
        return;
      }

      // Check if access token is still valid (with 60s margin)
      const tokenExpired = Date.now() / 1000 >= stored.expires_at - 60;
      let currentToken = stored.access_token;
      let currentStored = stored;

      if (tokenExpired) {
        try {
          const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: stored.refresh_token }),
          });
          if (!res.ok) {
            clearStoredAuth();
            clearAll();
            setLoading(false);
            return;
          }
          const data = await res.json();
          currentStored = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
          setStoredAuth(currentStored);
          currentToken = data.access_token;
        } catch (err) {
          if (isNetworkError(err)) {
            setNetworkError(true);
            setLoading(false);
            return;
          }
          clearStoredAuth();
          clearAll();
          setLoading(false);
          return;
        }
      }

      try {
        const res = await fetch(`${BASE_URL}/api/auth/session`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (!res.ok) {
          clearStoredAuth();
          clearAll();
          setLoading(false);
          return;
        }
        const { user } = await res.json();
        if (cancelled) return;

        const p = await fetchProfileById(user.id, currentToken);
        if (cancelled) return;

        if (p) {
          const appSession: AppSession = { ...currentStored, user };
          setSession(appSession);
          setSupabaseUser(user);
          setProfile(p);
        } else {
          clearStoredAuth();
          clearAll();
        }
      } catch (err) {
        if (isNetworkError(err)) {
          setNetworkError(true);
        } else {
          clearStoredAuth();
          clearAll();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    // Listen for sign-out events from other tabs / token refresh failures
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ouvidoria-auth' && !e.newValue) {
        clearAll();
      }
    };
    const handleSignout = () => { clearAll(); };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth:signout', handleSignout);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:signout', handleSignout);
    };
  }, []);

  // ── signIn ──
  const signIn = async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    let data: any = {};
    try { data = await res.json(); } catch { /* resposta sem corpo JSON */ }
    if (!res.ok) {
      logAudit({
        action: 'login_failure',
        entityType: 'auth',
        description: `Tentativa de login falhou para o email: ${email}`,
        newValues: { email, reason: data.error },
      });
      throw new Error(data.error || 'Erro ao fazer login');
    }

    const stored: StoredAuth = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    };
    setStoredAuth(stored);

    const appUser: AppUser = data.user;
    const p = await fetchProfileById(appUser.id, data.access_token);
    if (!p) {
      clearStoredAuth();
      throw new Error('Perfil não encontrado. Verifique se o usuário está cadastrado no sistema.');
    }

    const appSession: AppSession = { ...stored, user: appUser };
    setSession(appSession);
    setSupabaseUser(appUser);
    setProfile(p);

    logAudit({
      action: 'login',
      entityType: 'auth',
      entityId: appUser.id,
      entityName: p.name,
      userId: appUser.id,
      userName: p.name,
      userRole: p.role,
      description: `Login realizado por ${p.name}`,
    });
  };

  // ── signUp ──
  const signUp = async (data: SignUpData) => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao cadastrar');
  };

  // ── signOut ──
  const signOut = async () => {
    const currentProfile = profileRef.current;
    if (currentProfile) {
      logAudit({
        action: 'logout',
        entityType: 'auth',
        entityId: currentProfile.id,
        entityName: currentProfile.name,
        userId: currentProfile.id,
        userName: currentProfile.name,
        userRole: currentProfile.role,
        description: `Logout realizado por ${currentProfile.name}`,
      });
    }
    const stored = getStoredAuth();
    clearAll();
    clearStoredAuth();
    if (stored) {
      fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stored.access_token}`,
        },
        body: JSON.stringify({ refresh_token: stored.refresh_token }),
      }).catch(() => {});
    }
  };

  // ── refreshProfile ──
  const refreshProfile = async () => {
    const stored = getStoredAuth();
    if (supabaseUser && stored) {
      const p = await fetchProfileById(supabaseUser.id, stored.access_token);
      setProfile(p);
    }
  };

  return (
    <AuthContext.Provider value={{
      session, supabaseUser, profile, loading, networkError,
      signIn, signUp, signOut, refreshProfile, clearNetworkError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
