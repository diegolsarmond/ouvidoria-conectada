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

async function fetchProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error || !data) return null;

    // Also fetch organs
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
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Ref to always have the latest profile value inside the closure
    const profileRef = useRef<User | null>(null);
    // Guard against concurrent fetches
    const fetchingRef = useRef(false);
    // Guard against infinite session-recovery loops
    const recoveryAttemptedRef = useRef(false);

    // Keep ref in sync with state
    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    // Helper: clear everything and sign out (removes stale tokens from localStorage)
    const clearSession = async () => {
        setSession(null);
        setSupabaseUser(null);
        setProfile(null);
        try {
            await supabase.auth.signOut();
        } catch {
            // Ignore signOut errors – the goal is to wipe localStorage tokens
        }
    };

    // Bootstrap: getSession first (synchronous from storage), then listen for changes.
    useEffect(() => {
        let cancelled = false;

        const bootstrap = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                if (cancelled) return;

                if (initialSession?.user) {
                    const p = await fetchProfile(initialSession.user.id);
                    if (cancelled) return;

                    if (p) {
                        setSession(initialSession);
                        setSupabaseUser(initialSession.user);
                        setProfile(p);
                    } else {
                        // Stale session – user no longer exists in our DB
                        console.warn('[AuthContext] Profile not found on bootstrap. Clearing.');
                        await supabase.auth.signOut().catch(() => {});
                        setSession(null);
                        setSupabaseUser(null);
                        setProfile(null);
                    }
                }
            } catch (err) {
                console.error('[AuthContext] Bootstrap error:', err);
                // Clear everything to avoid stuck state
                setSession(null);
                setSupabaseUser(null);
                setProfile(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        bootstrap();

        // Listen for subsequent auth changes (sign-in, sign-out, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                console.debug('[AuthContext] event:', event, 'session:', !!newSession);

                if (event === 'INITIAL_SESSION') {
                    // Already handled by bootstrap above – skip
                    return;
                }

                if (event === 'SIGNED_OUT' || !newSession) {
                    setSession(null);
                    setSupabaseUser(null);
                    setProfile(null);
                    setLoading(false);
                    return;
                }

                // SIGNED_IN or TOKEN_REFRESHED
                const currentProfile = profileRef.current;
                const needsFetch =
                    event === 'SIGNED_IN' ||
                    !currentProfile ||
                    currentProfile.id !== newSession.user.id;

                if (needsFetch && !fetchingRef.current) {
                    fetchingRef.current = true;
                    try {
                        const p = await fetchProfile(newSession.user.id);
                        if (p) {
                            setSession(newSession);
                            setSupabaseUser(newSession.user);
                            setProfile(p);
                        } else {
                            console.warn('[AuthContext] Profile not found. Clearing session.');
                            await clearSession();
                        }
                    } catch (err) {
                        console.error('[AuthContext] Failed to fetch profile:', err);
                        await clearSession();
                    } finally {
                        fetchingRef.current = false;
                    }
                } else {
                    // Token refresh with existing profile – just update session
                    setSession(newSession);
                    setSupabaseUser(newSession.user);
                }

                setLoading(false);
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
        // 1. Create the auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: { name: data.name },
            },
        });
        if (authError) throw authError;

        const authUserId = authData.user?.id;
        if (!authUserId) throw new Error('Erro ao criar conta de autenticação.');

        // 2. Insert row in our public.users table with the same id
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

        if (profileError) throw profileError;
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('[AuthContext] Error signing out from Supabase:', error);
        } finally {
            setSession(null);
            setSupabaseUser(null);
            setProfile(null);
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
