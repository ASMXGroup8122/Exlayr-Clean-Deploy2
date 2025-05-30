'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface DashboardLayoutProps {
    title: string;
    children: ReactNode;
    stats?: Array<{
        label: string;
        value: string;
    }>;
}

export function DashboardLayout({ title, children, stats }: DashboardLayoutProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <h1 className="text-2xl font-bold">{title}</h1>
            
            {/* Stats Grid (if provided) */}
            {stats && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <Card key={stat.label} className="bg-white overflow-hidden">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    {stat.label}
                                </dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                    {stat.value}
                                </dd>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            
            {/* Main Content */}
            <div className="space-y-6">
                {children}
            </div>
        </div>
    );
} 
