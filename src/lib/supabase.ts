import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        'As variáveis de ambiente do Supabase não estão definidas. Verifique o arquivo .env'
    );
}

// Cria e exporta o cliente do Supabase com configurações otimizadas
export const supabase = createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storageKey: 'ouvidoria-auth-token',
            storage: localStorage,
        },
        global: {
            headers: {
                'X-Client-Info': 'ouvidoria-conectada',
            },
        },
    }
);
