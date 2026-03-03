import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Cliente de Uso Interno e Administrativo EXCLUSIVO (Ignora RLS)
export const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseServiceRoleKey || 'placeholder-anon-key', // Fallback vazio para não crachar caso a env falte durante o setup
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
