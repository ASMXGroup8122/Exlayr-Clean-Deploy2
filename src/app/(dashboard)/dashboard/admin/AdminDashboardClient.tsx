'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminDashboardClientProps {
    initialData: any; // Type this properly based on your user type
}

export default function AdminDashboardClient({ initialData }: AdminDashboardClientProps) {
    const { user } = useAuth();

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <pre className="mt-4 p-4 bg-gray-100 rounded">
                {JSON.stringify(user || initialData, null, 2)}
            </pre>
        </div>
    );
} 