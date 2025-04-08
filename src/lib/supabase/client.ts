import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

let supabaseClient: ReturnType<typeof createClientComponentClient<Database>>;

export function getSupabaseClient() {
    if (!supabaseClient) {
        supabaseClient = createClientComponentClient<Database>();
    }
    return supabaseClient;
}

// For testing purposes only
export function resetSupabaseClient() {
    supabaseClient = createClientComponentClient<Database>();
} 