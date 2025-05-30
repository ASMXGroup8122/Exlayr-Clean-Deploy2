'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/LoadingState';

interface NavigationHandlerProps {
    children: React.ReactNode;
    timeout?: number;
}

export default function NavigationHandler({ 
    children, 
    timeout = 15000 // Reasonable 15-second timeout
}: NavigationHandlerProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { loading: authLoading, initialized } = useAuth();
    const [navigationLoading, setNavigationLoading] = useState(false);
    const [currentPath, setCurrentPath] = useState(pathname);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);
    const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (navigationTimerRef.current) {
                clearTimeout(navigationTimerRef.current);
            }
        };
    }, []);

    // Handle navigation changes
    useEffect(() => {
        if (pathname !== currentPath) {
            console.log('Navigation detected:', { from: currentPath, to: pathname });
            
            if (mountedRef.current) {
                setNavigationLoading(true);
                
                // Clear any existing timers
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                if (navigationTimerRef.current) {
                    clearTimeout(navigationTimerRef.current);
                }
                
                // Set timeout to prevent hanging
                timeoutRef.current = setTimeout(() => {
                    if (mountedRef.current) {
                        console.warn('Navigation timeout reached, forcing completion');
                        setNavigationLoading(false);
                        setCurrentPath(pathname);
                    }
                }, timeout);

                // Simulate navigation completion
                navigationTimerRef.current = setTimeout(() => {
                    if (mountedRef.current) {
                        setNavigationLoading(false);
                        setCurrentPath(pathname);
                        
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }
                    }
                }, 1000); // Give 1 second for navigation to settle
            }
        }
    }, [pathname, currentPath, timeout]);

    // Handle auth loading completion
    useEffect(() => {
        if (initialized && !authLoading && navigationLoading) {
            const timer = setTimeout(() => {
                if (mountedRef.current) {
                    setNavigationLoading(false);
                }
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [initialized, authLoading, navigationLoading]);

    // Show loading state during navigation or auth
    if (navigationLoading || (!initialized && authLoading)) {
        return (
            <LoadingState 
                message={navigationLoading ? "Loading page..." : "Checking authentication..."} 
                fullScreen={true} 
            />
        );
    }

    return <>{children}</>;
} 
