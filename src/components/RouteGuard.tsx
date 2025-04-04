'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RouteGuardProps {
    children: React.ReactNode;
    allowedTypes: ('admin' | 'exchange_sponsor' | 'exchange' | 'issuer')[];
}

export default function RouteGuard({ children, allowedTypes }: RouteGuardProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || !allowedTypes.includes(user.account_type))) {
            const redirectPath = getDashboardPath(user?.account_type || '');
            router.replace(redirectPath || '/dashboard');
        }
    }, [user, loading, allowedTypes, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (!user || !allowedTypes.includes(user.account_type)) {
        return null; // Router will handle redirect
    }

    return <>{children}</>;
}

function getDashboardPath(accountType: string) {
    switch (accountType) {
        case 'exchange_sponsor':
            return '/dashboard/sponsor';
        case 'admin':
            return '/dashboard/admin';
        case 'exchange':
        case 'issuer':
            return `/dashboard/${accountType}`;
        default:
            return '';
    }
} 