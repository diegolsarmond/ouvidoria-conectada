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

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

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

<<<<<<< HEAD
/** In-flight guard – prevents concurrent fetchProfile calls for the same user */
let _fetchProfilePromise: Promise<User | null> | null = null;
let _fetchProfileUserId: string | null = null;

/** Fetch profile with a hard timeout to avoid hanging forever */
async function fetchProfile(userId: string, timeoutMs = 10000): Promise<User | null> {
    // Reuse in-flight promise if same user is already being fetched
    if (_fetchProfilePromise && _fetchProfileUserId === userId) {
        return _fetchProfilePromise;
    }

    _fetchProfileUserId = userId;
    _fetchProfilePromise = Promise.race([
        withRetry(() => fetchProfileInner(userId), 1, 500),
        new Promise<never>((_, reject) => setTimeout(() => {
            console.warn('[AuthContext] fetchProfile timed out');
            reject(new Error('Timeout ao buscar perfil'));
        }, timeoutMs)),
    ]).finally(() => {
        _fetchProfilePromise = null;
        _fetchProfileUserId = null;
    });

    return _fetchProfilePromise;
=======
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
      const organRes = await fetch(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      // organ_ids already embedded in user row from backend
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
>>>>>>> 6978cb30a91f34c6fd8b80188f832dd9694aba6a
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

<<<<<<< HEAD
    // ── Bootstrap: getSession → fetch profile → done ──
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                const { data: { session: s }, error: sessionError } = await supabase.auth.getSession();
                
                // Handle invalid refresh token error
                if (sessionError) {
                    console.warn('[AuthContext] Session error:', sessionError.message);
                    if (sessionError.message?.includes('Invalid Refresh Token') || 
                        sessionError.message?.includes('Refresh Token Not Found')) {
                        // Clear invalid session data
                        await supabase.auth.signOut({ scope: 'local' }).catch(() => { });
                    }
                    clearAll();
                    return;
                }
                
                if (cancelled) return;

                if (!s?.user) {
                    clearAll();
                    return;
                }

                const p = await fetchProfile(s.user.id);
                if (cancelled) return;

                if (p) {
                    setSession(s);
                    setSupabaseUser(s.user);
                    setProfile(p);
                } else {
                    console.warn('[AuthContext] No profile found – clearing stale session');
                    clearAll();
                    supabase.auth.signOut({ scope: 'local' }).catch(() => { });
                }
            } catch (err: any) {
                console.error('[AuthContext] Init error:', err);
                // Don't clear session on network errors - user might be offline
                if (isNetworkError(err)) {
                    console.warn('[AuthContext] Network error during init - keeping existing session if any');
                    setNetworkError(true);
                    // Keep existing session, just mark as offline
                    setLoading(false);
                    return;
                }
                if (!cancelled) clearAll();
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        init();

        // ── Listen for SUBSEQUENT auth changes (non-blocking!) ──
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                console.debug('[AuthContext] event:', event, 'session:', !!newSession);

                // Skip INITIAL_SESSION – handled by init() above
                if (event === 'INITIAL_SESSION') return;

                // Handle token refresh errors gracefully
                if (event === 'TOKEN_REFRESHED' && !newSession) {
                    console.warn('[AuthContext] Token refresh failed - signing out');
                    clearAll();
                    await supabase.auth.signOut({ scope: 'local' }).catch(() => { });
                    setLoading(false);
                    return;
                }

                if (event === 'SIGNED_OUT' || !newSession) {
                    clearAll();
                    setLoading(false);
                    return;
                }

                // For SIGNED_IN / TOKEN_REFRESHED – fire and forget (no await!)
                const currentProfile = profileRef.current;
                const needsFetch =
                    event === 'SIGNED_IN' ||
                    (event !== 'TOKEN_REFRESHED' && (!currentProfile || currentProfile.id !== newSession.user.id));

                if (needsFetch) {
                    // Fire-and-forget profile fetch
                    fetchProfile(newSession.user.id).then(p => {
                        if (p) {
                            setSession(newSession);
                            setSupabaseUser(newSession.user);
                            setProfile(p);
                        } else {
                            console.warn('[AuthContext] Profile not found after', event);
                            clearAll();
                            supabase.auth.signOut().catch(() => { });
                        }
                        setLoading(false);
                    }).catch((err) => {
                        console.error('[AuthContext] AuthStateChange fetchProfile failed:', err);
                        // Don't clear session on network errors - might be temporary
                        if (isNetworkError(err)) {
                            console.warn('[AuthContext] Network error during profile fetch - keeping session');
                            setNetworkError(true);
                            // Still update session/token even if profile fetch failed
                            setSession(newSession);
                            setSupabaseUser(newSession.user);
                        } else {
                            clearAll();
                        }
                        setLoading(false);
                    });
                } else {
                    // Just update session/token, keep profile
                    setSession(newSession);
                    setSupabaseUser(newSession.user);
                    setLoading(false);
                }
            }
        );

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            logAudit({
                action: 'login_failure',
                entityType: 'auth',
                description: `Tentativa de login falhou para o email: ${email}`,
                newValues: { email, reason: error.message },
            });
            throw error;
        }
        if (data.user && data.session) {
            // Buscar perfil diretamente para detectar erros e definir sessão imediatamente
            const p = await fetchProfile(data.user.id);
            if (!p) {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => { });
                throw new Error('Perfil não encontrado. Verifique se o usuário está cadastrado no sistema.');
            }
            setSession(data.session);
            setSupabaseUser(data.user);
            setProfile(p);
            logAudit({
                action: 'login',
                entityType: 'auth',
                entityId: data.user.id,
                entityName: p.name,
                userId: data.user.id,
                userName: p.name,
                userRole: p.role,
                description: `Login realizado por ${p.name}`,
            });
        }
    };

    const signUp = async (data: SignUpData) => {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: { data: { name: data.name } },
        });
        if (authError) throw authError;

        const authUserId = authData.user?.id;
        if (!authUserId) throw new Error('Erro ao criar conta de autenticação.');

        const { error: profileError } = await supabase
            .from('ouvidoria_users')
            .insert({
                id: authUserId,
                name: data.name,
                cpf: data.cpf,
                email: data.email,
                registration: data.registration,
                role: data.role,
                status: 'ativo',
            });

        if (profileError) {
            console.error('[AuthContext] signUp profile insertion error:', profileError);
            if (profileError.code === '23505' || profileError.code === '409') {
                throw new Error('Usuário já cadastrado com este e-mail ou CPF.');
            }
            throw profileError;
        }
    };

    const signOut = async () => {
        // Registrar logout antes de limpar o estado
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
=======
    const init = async () => {
      const stored = getStoredAuth();
      if (!stored) {
>>>>>>> 6978cb30a91f34c6fd8b80188f832dd9694aba6a
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
    const data = await res.json();
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
