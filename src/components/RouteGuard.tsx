'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/types/supabase';
import { canAccessRoute, getRedirectPath } from '@/lib/auth/helpers';

type AccountType = Database['public']['Tables']['users']['Row']['account_type'];

interface UserMetadata {
    is_org_admin?: boolean;
    [key: string]: any;
}

interface RouteGuardProps {
    children: React.ReactNode;
    allowedTypes?: AccountType[];
}

export default function RouteGuard({ children, allowedTypes = [] }: RouteGuardProps) {
    const { user, loading, initialized, refreshSession } = useAuth();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // Don't check auth until initialization is complete
        if (!initialized) return;

        // Function to check if user is authorized
        const checkAuth = async () => {
            try {
                // If still loading, wait
                if (loading) return;

                // If no user and we haven't tried refreshing yet, try once
                if (!user && !localStorage.getItem('auth_refresh_attempted')) {
                    localStorage.setItem('auth_refresh_attempted', 'true');
                    await refreshSession();
                    return; // Let the next effect run handle the result
                }

                // Clear refresh attempt flag if we have a user
                if (user) {
                    localStorage.removeItem('auth_refresh_attempted');
                }

                // If still no user after potential refresh, redirect to sign in
                if (!user) {
                    console.log('No user found, redirecting to sign in');
                    router.push('/sign-in');
                    return;
                }

                // Check if user can access the route
                if (canAccessRoute(user, allowedTypes)) {
                    setAuthorized(true);
                    return;
                }

                // Not authorized - redirect to appropriate path
                const redirectPath = getRedirectPath(user);
                console.log(`User not authorized for this route, redirecting to: ${redirectPath}`);
                router.push(redirectPath);
            } catch (error) {
                console.error('Error in auth check:', error);
                router.push('/sign-in');
            }
        };

        checkAuth();
    }, [user, loading, initialized, router, allowedTypes, refreshSession]);

    // Show loading state while checking auth or during initialization
    if (!initialized || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Show children only when authorized
    return authorized ? <>{children}</> : null;
} 