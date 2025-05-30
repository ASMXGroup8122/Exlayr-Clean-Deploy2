'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SessionLoadingState } from '@/components/LoadingState';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
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
        if (initialized && !loading && !user) {
            console.log('DashboardLayout: No user found, redirecting to sign-in');
            router.replace('/sign-in');
        }
    }, [user, loading, initialized, router]);

    // Don't render anything until auth is initialized
    if (!initialized) {
        return <SessionLoadingState />;
    }

    // Show loading while auth is still in progress
    if (loading) {
        return <SessionLoadingState />;
    }

    // Don't render if no user (will redirect in useEffect)
    if (!user) {
        return null;
    }

    return (
        <EnhancedRouteGuard allowedTypes={allowedTypes}>
            <NavigationHandler>
                <div className="h-screen flex overflow-hidden">
                    {/* Sidebar */}
                    <Sidebar 
                        userRole={user.account_type} 
                        isCollapsed={sidebarCollapsed}
                        onCollapsedChange={setSidebarCollapsed}
                    />
                    
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <main className="flex-1 bg-[#F8F9FA] flex flex-col overflow-hidden">
                            <ErrorBoundary>
                                {children}
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
