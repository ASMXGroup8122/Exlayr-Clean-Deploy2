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
    timeout = 5000 // Aggressive 5-second timeout
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
        // 🔥 CRITICAL: Set authorized immediately and do auth check in background
        if (mountedRef.current) {
            setAuthCheckComplete(true);
            setIsAuthorized(true); // Default to authorized, check in background
        }

        // Do auth check in background with aggressive timeout
        if (!initialized || loading || authCheckRef.current) return;

        authCheckRef.current = true;

        // Background timeout
        timeoutRef.current = setTimeout(() => {
            if (mountedRef.current && initialized && !loading && !user) {
                console.warn('Background auth check: No user after timeout, redirecting');
                router.push(redirectTo);
            }
        }, timeout);

        const backgroundAuthCheck = () => {
            try {
                // Clear timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }

                // Only redirect if we're certain there's no user
                if (!user && initialized && !loading) {
                    console.log('EnhancedRouteGuard: Background check - no user, redirecting');
                    if (mountedRef.current) {
                        router.push(redirectTo);
                        return;
                    }
                }

                // Check user type in background
                if (user) {
                    const isAllowedType = !allowedTypes || allowedTypes.includes(user.account_type);
                    
                    if (!isAllowedType) {
                        console.log('EnhancedRouteGuard: Background check - user type not allowed', {
                            accountType: user.account_type,
                            allowedTypes,
                            pathname
                        });
                        if (mountedRef.current) {
                            router.push('/access-denied');
                            return;
                        }
                    }
                }

                // All background checks passed
                console.log('EnhancedRouteGuard: Background auth check completed successfully');

            } catch (error) {
                console.error('Error in background auth check:', error);
                // Don't redirect on background check errors
            }
        };

        // Run background check
        setTimeout(backgroundAuthCheck, 100);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [user, loading, initialized, router, allowedTypes, pathname, redirectTo, timeout]);

    // Reset auth check when user changes
    useEffect(() => {
        authCheckRef.current = false;
    }, [user?.id]);

    // 🔥 CRITICAL: Always show UI immediately - no more blocking
    return <>{children}</>;
} 
