import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { cache } from 'react';

// Create a cached server component client to prevent multiple instances
export const createServerClient = cache(() => {
    return createServerComponentClient<Database>({ cookies });
});

// Get the current session, cached per request
export const getServerSession = cache(async () => {
    const supabase = createServerClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Error getting server session:', error);
        return null;
    }
    
    return session;
});

// Get the current user profile with role information, cached per request
export const getServerUserProfile = cache(async () => {
    const session = await getServerSession();
    if (!session) return null;

    const supabase = createServerClient();
    const { data: profile, error } = await supabase
        .from('users')
        .select('*, organizations:organization_id(*)')
        .eq('id', session.user.id)
        .single();

    if (error) {
        console.error('Error getting user profile:', error);
        return null;
    }

    return profile;
});

// Validate organization status for non-admin users
export const validateOrganizationAccess = cache(async (profile: any) => {
    if (!profile) return false;
    
    // Admins always have access
    if (profile.account_type === 'admin') {
        return profile.status === 'active';
    }

    // Organization admins have access if they're active
    if (profile.metadata?.is_org_admin === true) {
        return profile.status === 'active';
    }

    // Regular users need both personal and organization status checks
    if (!profile.organization_id || profile.status !== 'active') {
        return false;
    }

    const supabase = createServerClient();
    const tableName = profile.account_type === 'issuer' ? 'issuers' :
                     profile.account_type === 'exchange_sponsor' ? 'exchange_sponsor' :
                     'exchange';

    const { data: org, error } = await supabase
        .from(tableName)
        .select('status')
        .eq('id', profile.organization_id)
        .single();

    if (error || !org) {
        console.error('Error validating organization:', error);
        return false;
    }

    return org.status === 'active';
});

// Helper to check if user has required role/permissions
export const validateUserRole = cache(async (requiredRoles?: string[]) => {
    const profile = await getServerUserProfile();
    if (!profile) return false;

    // No role requirements = access allowed
    if (!requiredRoles || requiredRoles.length === 0) {
        return await validateOrganizationAccess(profile);
    }

    // Check if user's account type is in required roles
    if (!requiredRoles.includes(profile.account_type)) {
        return false;
    }

    return await validateOrganizationAccess(profile);
}); 