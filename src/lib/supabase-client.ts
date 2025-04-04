import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

let supabaseInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null;

export const getSupabaseClient = () => {
    if (!supabaseInstance) {
        supabaseInstance = createClientComponentClient<Database>();
    }
    return supabaseInstance;
};

// Reset instance (useful for testing or when needed)
export const resetSupabaseClient = () => {
    supabaseInstance = null;
}; 