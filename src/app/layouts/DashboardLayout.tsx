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
                    {children}
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