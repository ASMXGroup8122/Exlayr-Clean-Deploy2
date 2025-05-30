'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function getRedirectPath(accountType: string) {
    switch (accountType) {
        case 'exchange_sponsor':
            return '/dashboard/sponsor';
        case 'admin':
            return '/dashboard/admin';
        case 'exchange':
        case 'issuer':
            return `/dashboard/${accountType}`;
        default:
            return '/dashboard';
    }
}

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            const path = getRedirectPath(user.account_type);
            router.push(path);
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <p>Redirecting to your dashboard...</p>
            </div>
        </div>
    );
} 
