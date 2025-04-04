'use client';

import { use } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function RoleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ role: string }>;
}) {
    const { role } = use(params);
    const { user } = useAuth();
    
    // Verify role access
    if (user?.role !== role) {
        return <div>Access Denied</div>;
    }

    // Just return children, main layout is handled by (dashboard)/layout.tsx
    return children;
} 