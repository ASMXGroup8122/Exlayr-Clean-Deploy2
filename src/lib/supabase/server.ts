import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/supabase';

// Create a Supabase client for server-side operations with proper cookie handling
export async function createServerSupabaseClient() {
    return await createClient();
}

// Helper function to get the current session with proper cookie handling
export async function getServerSession() {
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Error getting server session:', error);
        return null;
    }
    
    return session;
}

// Helper function to get the current user profile with proper cookie handling
export async function getServerUserProfile() {
    const session = await getServerSession();
    if (!session) return null;

    const supabase = await createServerSupabaseClient();
    const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error) {
        console.error('Error getting user profile:', error);
        return null;
    }

    return profile;
} 