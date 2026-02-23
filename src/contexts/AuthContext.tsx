import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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

    // Bootstrap: use onAuthStateChange as the single source of truth.
    // Supabase v2 fires INITIAL_SESSION on subscribe, so no need for getSession().
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setSupabaseUser(session?.user ?? null);
                if (session?.user) {
                    try {
                        const p = await fetchProfile(session.user.id);
                        setProfile(p);
                    } catch (err) {
                        console.error('[AuthContext] Failed to fetch profile:', err);
                        setProfile(null);
                    }
                } else {
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
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
        await supabase.auth.signOut();
        setSession(null);
        setSupabaseUser(null);
        setProfile(null);
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
