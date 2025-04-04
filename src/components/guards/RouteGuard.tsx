'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { hasRouteAccess } from '@/lib/permissions';

interface RouteGuardProps {
    children: React.ReactNode;
    allowedTypes?: string[];
}

export default function RouteGuard({ children, allowedTypes }: RouteGuardProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                console.log('RouteGuard: No user, redirecting to sign-in');
                router.push('/sign-in');
            } else if (pathname) {
                // Check if user type is allowed (if allowedTypes is provided)
                const isAllowedType = !allowedTypes || allowedTypes.includes(user.account_type);
                
                // Check route access based on user type and pathname
                const hasAccess = hasRouteAccess(user.account_type, pathname) && isAllowedType;
                
                if (!hasAccess) {
                    console.log('RouteGuard: Access denied', {
                        accountType: user.account_type,
                        pathname,
                        allowedTypes
                    });
                    router.push('/access-denied');
                }
            }
        }
    }, [user, loading, router, pathname, allowedTypes]);

    // Show loading state
    if (loading) {
        return <div>Loading...</div>;
    }

    // Check if user type is allowed
    const isAllowedType = !allowedTypes || (user && allowedTypes.includes(user.account_type));

    // Block render if not authorized
    if (!user || !hasRouteAccess(user.account_type, pathname || '') || !isAllowedType) {
        return null;
    }

    return <>{children}</>;
} 