'use client';

import { useEffect } from 'react';
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
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <Sidebar userRole={user.account_type} />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                <div className="fixed top-0 right-0 left-64 z-10 bg-white border-b border-[#DADCE0]">
                    <Header />
                </div>
                <main className="flex-1 overflow-y-auto bg-[#F8F9FA] pt-16">
                    <div className="px-4 py-4 max-w-[95%] mx-auto">
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