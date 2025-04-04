import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export const createSharedSupabaseClient = () => {
    return createClientComponentClient<Database>({
        options: {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    });
};

// Create a singleton instance
export const supabaseClient = createSharedSupabaseClient(); 