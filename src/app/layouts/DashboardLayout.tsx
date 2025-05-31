'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SessionLoadingState } from '@/components/LoadingState';
import Sidebar from '@/components/layout/Sidebar';
import EnhancedRouteGuard from '@/components/guards/EnhancedRouteGuard';
import NavigationHandler from '@/components/layout/NavigationHandler';

interface DashboardLayoutProps {
    children: React.ReactNode;
    allowedTypes?: string[];
}

function DashboardLayoutContent({ children, allowedTypes }: DashboardLayoutProps) {
    const { user, loading, initialized } = useAuth();
    const router = useRouter();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        // Only redirect if we're sure there's no user after reasonable time
        const redirectTimer = setTimeout(() => {
            if (initialized && !loading && !user) {
                console.log('DashboardLayout: No user found after timeout, redirecting to sign-in');
                router.replace('/sign-in');
            }
        }, 3000); // Wait 3 seconds before redirecting

        return () => clearTimeout(redirectTimer);
    }, [user, loading, initialized, router]);

    // 🔥 CRITICAL FIX: Always show the UI immediately
    // Don't block on auth state - show skeleton UI while auth loads
    const showSkeleton = !user && (!initialized || loading);

    return (
        <EnhancedRouteGuard allowedTypes={allowedTypes}>
            <NavigationHandler>
                <div className="h-screen flex overflow-hidden">
                    {/* Sidebar - show with skeleton state if no user */}
                    <Sidebar 
                        userRole={user?.account_type || 'loading'} 
                        isCollapsed={sidebarCollapsed}
                        onCollapsedChange={setSidebarCollapsed}
                    />
                    
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <main className="flex-1 bg-[#F8F9FA] flex flex-col overflow-hidden">
                            <ErrorBoundary>
                                {showSkeleton ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                                            <p className="text-gray-600">Loading dashboard...</p>
                                        </div>
                                    </div>
                                ) : (
                                    children
                                )}
                            </ErrorBoundary>
                        </main>
                    </div>
                </div>
            </NavigationHandler>
        </EnhancedRouteGuard>
    );
}

export default function DashboardLayout({ children, allowedTypes }: DashboardLayoutProps) {
    return (
        <ErrorBoundary>
            <DashboardLayoutContent allowedTypes={allowedTypes}>
                {children}
            </DashboardLayoutContent>
        </ErrorBoundary>
    );
} 
