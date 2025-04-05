import type { Database } from '@/types/supabase';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface UserMetadata {
    is_org_admin?: boolean;
    [key: string]: any;
}

export function isOrgAdmin(metadata: any): boolean {
    if (!metadata || typeof metadata !== 'object') return false;
    return (metadata as UserMetadata).is_org_admin === true;
}

export function isActiveAdmin(user: UserProfile | null): boolean {
    if (!user) return false;
    return user.account_type === 'admin' && user.status === 'active';
}

export function isActiveOrgAdmin(user: UserProfile | null): boolean {
    if (!user) return false;
    return isOrgAdmin(user.metadata) && user.status === 'active';
}

export function getDashboardPath(accountType: string): string {
    switch (accountType) {
        case 'exchange_sponsor':
            return '/dashboard/sponsor';
        case 'admin':
            return '/dashboard/admin';
        default:
            return `/dashboard/${accountType}`;
    }
}

export function shouldSkipAuth(pathname: string): boolean {
    const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/auth/callback', '/auth/error'];
    return (
        PUBLIC_PATHS.includes(pathname) ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth')
    );
}

export function getRedirectPath(user: UserProfile | null): string {
    if (!user) return '/sign-in';
    
    if (isActiveAdmin(user)) {
        return '/dashboard/admin';
    }
    
    if (isActiveOrgAdmin(user)) {
        return getDashboardPath(user.account_type);
    }
    
    if (user.status !== 'active') {
        return '/approval-pending';
    }
    
    return getDashboardPath(user.account_type);
}

export function canAccessRoute(user: UserProfile | null, allowedTypes: string[] = []): boolean {
    if (!user) return false;
    
    // Admins can access everything
    if (isActiveAdmin(user)) return true;
    
    // Org admins can access their routes
    if (isActiveOrgAdmin(user) && allowedTypes.includes(user.account_type)) return true;
    
    // Regular users need correct type and active status
    return user.status === 'active' && allowedTypes.includes(user.account_type);
} 