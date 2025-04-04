import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

let client: ReturnType<typeof createClientComponentClient<Database>> | null = null;

export function getSupabaseClient() {
    if (!client) {
        client = createClientComponentClient<Database>();
    }
    return client;
} 