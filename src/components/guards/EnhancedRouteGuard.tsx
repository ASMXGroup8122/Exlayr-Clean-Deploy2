'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { LoadingState } from '@/components/LoadingState';

interface EnhancedRouteGuardProps {
    children: React.ReactNode;
    allowedTypes?: string[];
    redirectTo?: string;
    timeout?: number; // Default 45 seconds for auth checks
}

export default function EnhancedRouteGuard({ 
    children, 
    allowedTypes,
    redirectTo = '/sign-in',
    timeout = 15000 // Reasonable 15-second timeout
}: EnhancedRouteGuardProps) {
    const { user, loading, initialized } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [authCheckComplete, setAuthCheckComplete] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);
    const authCheckRef = useRef(false);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // Only run auth check once when initialized and not loading
        if (!initialized || loading || authCheckRef.current) return;

        authCheckRef.current = true;

        // Set up timeout to prevent hanging
        timeoutRef.current = setTimeout(() => {
            if (mountedRef.current && !authCheckComplete) {
                console.warn('Auth check timed out after', timeout, 'ms');
                console.log('Current auth state:', { initialized, loading, user: !!user });
                
                // If we have basic auth info, proceed anyway
                if (initialized && !loading) {
                    console.log('Auth is initialized, proceeding despite timeout');
                    if (mountedRef.current) {
                        setAuthCheckComplete(true);
                        // Allow access if we have a user, even if timeout occurred
                        setIsAuthorized(!!user);
                    }
                } else {
                    console.log('Auth not ready, redirecting to sign-in');
                    if (mountedRef.current) {
                        router.push(redirectTo);
                    }
                }
            }
        }, timeout);

        const checkAuth = () => {
            try {
                // Clear timeout since we're proceeding with auth check
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }

                // If we reach here but still don't have initialized auth after timeout, redirect
                if (!initialized) {
                    console.log('EnhancedRouteGuard: Auth not initialized, redirecting to sign-in');
                    if (mountedRef.current) {
                        router.push(redirectTo);
                        return;
                    }
                }

                if (!user) {
                    console.log('EnhancedRouteGuard: No user found, redirecting to sign-in');
                    if (mountedRef.current) {
                        router.push(redirectTo);
                        return;
                    }
                }

                // Check if user type is allowed (if allowedTypes is provided)
                const isAllowedType = !allowedTypes || (user && allowedTypes.includes(user.account_type));
                
                if (!isAllowedType) {
                    console.log('EnhancedRouteGuard: User type not allowed', {
                        accountType: user?.account_type,
                        allowedTypes,
                        pathname
                    });
                    if (mountedRef.current) {
                        router.push('/access-denied');
                        return;
                    }
                }

                // All checks passed
                if (mountedRef.current) {
                    setIsAuthorized(true);
                    setAuthCheckComplete(true);
                }

            } catch (error) {
                console.error('Error in auth check:', error);
                if (mountedRef.current) {
                    router.push(redirectTo);
                }
            }
        };

        checkAuth();

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [user, loading, initialized, router, allowedTypes, pathname, redirectTo, timeout]);

    // Reset auth check when user changes
    useEffect(() => {
        authCheckRef.current = false;
        setAuthCheckComplete(false);
        setIsAuthorized(false);
    }, [user?.id]);

    // Show loading state while checking auth or during initialization
    if (!initialized || loading || !authCheckComplete) {
        return (
            <LoadingState 
                message="Checking authentication..." 
                fullScreen={true} 
            />
        );
    }

    // Only render children when authorized
    return isAuthorized ? <>{children}</> : null;
} 
