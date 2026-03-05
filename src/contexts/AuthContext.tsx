import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types/ouvidoria';

interface AuthContextType {
    session: Session | null;
    supabaseUser: SupabaseUser | null;
    profile: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (data: SignUpData) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
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

/** Fetch profile with a hard timeout to avoid hanging forever */
async function fetchProfile(userId: string, timeoutMs = 8000): Promise<User | null> {
    return Promise.race([
        fetchProfileInner(userId),
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

    const profileRef = useRef<User | null>(null);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const clearAll = () => {
        setSession(null);
        setSupabaseUser(null);
        setProfile(null);
    };

    // ── Bootstrap: getSession → fetch profile → done ──
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                const { data: { session: s } } = await supabase.auth.getSession();
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
                    supabase.auth.signOut().catch(() => { });
                }
            } catch (err) {
                console.error('[AuthContext] Init error:', err);
                if (!cancelled) clearAll();
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        init();

        // ── Listen for SUBSEQUENT auth changes (non-blocking!) ──
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, newSession) => {
                console.debug('[AuthContext] event:', event, 'session:', !!newSession);

                // Skip INITIAL_SESSION – handled by init() above
                if (event === 'INITIAL_SESSION') return;

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
                        clearAll();
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
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
        clearAll();
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('[AuthContext] Error signing out:', error);
        }
    };

    const refreshProfile = async () => {
        if (supabaseUser) {
            const p = await fetchProfile(supabaseUser.id);
            setProfile(p);
        }
    };

    return (
        <AuthContext.Provider value={{ session, supabaseUser, profile, loading, signIn, signUp, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}
