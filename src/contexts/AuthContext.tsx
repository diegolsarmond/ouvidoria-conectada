import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types/ouvidoria';
import { logAudit } from '@/lib/api';

interface AuthContextType {
    session: Session | null;
    supabaseUser: SupabaseUser | null;
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

/** Check if error is a network error */
function isNetworkError(error: any): boolean {
    if (!error) return false;
    const message = (error.message || '').toLowerCase();
    const code = (error.code || '').toLowerCase();
    return (
        message.includes('failed to fetch') ||
        message.includes('network') ||
        message.includes('err_network') ||
        message.includes('net::') ||
        code === 'network_error' ||
        code === 'fetch_error'
    );
}

/** Retry with exponential backoff */
async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0 || !isNetworkError(error)) {
            throw error;
        }
        console.warn(`[AuthContext] Network error, retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(fn, retries - 1, delay * 2);
    }
}

/** Fetch profile with a hard timeout to avoid hanging forever */
async function fetchProfile(userId: string, timeoutMs = 8000): Promise<User | null> {
    return Promise.race([
        withRetry(() => fetchProfileInner(userId), 3, 1000),
        new Promise<never>((_, reject) => setTimeout(() => {
            console.warn('[AuthContext] fetchProfile timed out');
            reject(new Error('Timeout ao buscar perfil'));
        }, timeoutMs)),
    ]);
}

async function fetchProfileInner(userId: string): Promise<User | null> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('[AuthContext] fetchProfileInner error:', error);
            throw error;
        }
        if (!data) return null;

        const { data: uo } = await supabase
            .from('user_organs')
            .select('organ_id')
            .eq('user_id', userId);

        return {
            id: data.id,
            name: data.name,
            cpf: data.cpf,
            email: data.email,
            registration: data.registration,
            role: data.role,
            status: data.status,
            organs: (uo ?? []).map((r: any) => r.organ_id),
            primaryOrganId: data.primary_organ_id ?? undefined,
            avatar: data.avatar ?? undefined,
        };
    } catch (err) {
        console.error('[AuthContext] fetchProfileInner catch block:', err);
        throw err;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [networkError, setNetworkError] = useState(false);

    const profileRef = useRef<User | null>(null);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const clearAll = () => {
        setSession(null);
        setSupabaseUser(null);
        setProfile(null);
        setNetworkError(false);
    };

    const clearNetworkError = () => setNetworkError(false);

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
                    !currentProfile ||
                    currentProfile.id !== newSession.user.id;

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
            // Registrar tentativa de login malsucedida
            logAudit({
                action: 'login_failure',
                entityType: 'auth',
                description: `Tentativa de login falhou para o email: ${email}`,
                newValues: { email, reason: error.message },
            });
            throw error;
        }
        // Registrar login bem-sucedido (após buscar o perfil)
        if (data.user) {
            const { data: profileData } = await supabase
                .from('users')
                .select('name, role')
                .eq('id', data.user.id)
                .maybeSingle();
            logAudit({
                action: 'login',
                entityType: 'auth',
                entityId: data.user.id,
                entityName: profileData?.name ?? email,
                userId: data.user.id,
                userName: profileData?.name ?? email,
                userRole: profileData?.role ?? undefined,
                description: `Login realizado por ${profileData?.name ?? email}`,
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
            .from('users')
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
        clearAll();
        try {
            // Use 'global' scope to sign out from all tabs/devices
            await supabase.auth.signOut({ scope: 'global' });
            // Also clear our custom storage key
            localStorage.removeItem('ouvidoria-auth-token');
        } catch (error) {
            console.error('[AuthContext] Error signing out:', error);
            // Force clear local storage even if API call fails
            localStorage.removeItem('ouvidoria-auth-token');
        }
    };

    const refreshProfile = async () => {
        if (supabaseUser) {
            const p = await fetchProfile(supabaseUser.id);
            setProfile(p);
        }
    };

    return (
        <AuthContext.Provider value={{ session, supabaseUser, profile, loading, networkError, signIn, signUp, signOut, refreshProfile, clearNetworkError }}>
            {children}
        </AuthContext.Provider>
    );
}
