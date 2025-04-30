'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SessionLoadingState } from '@/components/LoadingState';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/sign-in');
        }
    }, [user, loading, router]);

    if (loading) {
        return <SessionLoadingState />;
    }

    if (!user) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="min-h-screen flex overflow-x-hidden">
            {/* Sidebar */}
            <Sidebar 
                userRole={user.account_type} 
                isCollapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
            />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="fixed top-0 right-0 left-0 z-10 w-full">
                    <Header isCollapsed={sidebarCollapsed} />
                </div>
                <main className="bg-[#F8F9FA] pt-16 w-full">
                    <div className="px-2 sm:px-4 py-4 w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <ErrorBoundary>
            <DashboardLayoutContent>
                {children}
            </DashboardLayoutContent>
        </ErrorBoundary>
    );
} 