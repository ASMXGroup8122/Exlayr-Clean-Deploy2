import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

class SupabaseClientSingleton {
    private static instance: ReturnType<typeof createClientComponentClient<Database>>;
    private static isInitialized = false;

    private constructor() {
        // Private constructor to prevent direct construction calls
    }

    public static initialize() {
        if (!this.isInitialized) {
            this.instance = createClientComponentClient<Database>();
            this.isInitialized = true;
        }
    }

    public static getInstance(): ReturnType<typeof createClientComponentClient<Database>> {
        if (!this.isInitialized) {
            this.initialize();
        }
        return this.instance;
    }
}

// Initialize the singleton immediately
SupabaseClientSingleton.initialize();

// Export a function that always returns the same instance
export function getSupabaseClient() {
    return SupabaseClientSingleton.getInstance();
}

// For testing purposes only
export function resetSupabaseClient() {
    console.warn('resetSupabaseClient() is deprecated and has no effect as the client is now a true singleton');
} 