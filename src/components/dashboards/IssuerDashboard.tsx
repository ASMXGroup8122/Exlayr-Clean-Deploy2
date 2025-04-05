'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { DashboardCard } from '@/components/shared/DashboardCard';
import { MetricsSection } from '@/components/shared/MetricsSection';
import { usePermissions } from '@/hooks/usePermissions';
import { FileText, Users, BookOpen, Settings } from 'lucide-react';
import { FeaturePermission } from '@/lib/permissions';
import { getSupabaseClient } from '@/lib/supabase/client';

interface IssuerStats {
    total_documents: number;
    pending_documents: number;
    total_users: number;
    pending_users: number;
}

export default function IssuerDashboard() {
    const [stats, setStats] = useState<IssuerStats>({
        total_documents: 0,
        pending_documents: 0,
        total_users: 0,
        pending_users: 0
    });
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = getSupabaseClient();
    const { hasPermission } = usePermissions();

    useEffect(() => {
        async function fetchStats() {
            try {
                const { data: documents } = await supabase
                    .from('documents')
                    .select('status', { count: 'exact' });

                const { data: users } = await supabase
                    .from('users')
                    .select('status', { count: 'exact' });

                setStats({
                    total_documents: documents?.length || 0,
                    pending_documents: documents?.filter(d => d.status === 'pending').length || 0,
                    total_users: users?.length || 0,
                    pending_users: users?.filter(u => u.status === 'pending').length || 0
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    const statistics = [
        { id: 'doc-total', label: 'Total Documents', value: stats.total_documents.toString() },
        { id: 'doc-pending', label: 'Pending Documents', value: stats.pending_documents.toString() },
        { id: 'users-total', label: 'Total Users', value: stats.total_users.toString() },
        { id: 'users-pending', label: 'Pending Users', value: stats.pending_users.toString() }
    ];

    const features = [
        {
            title: 'Document Management',
            description: 'Upload and manage your documents',
            icon: <FileText className="h-6 w-6 text-gray-600" />,
            href: '/dashboard/documents',
            disabled: !hasPermission('view_documents')
        },
        {
            title: 'User Management',
            description: 'Manage team members and permissions',
            icon: <Users className="h-6 w-6 text-gray-600" />,
            href: '/dashboard/users',
            disabled: !hasPermission('manage_users')
        },
        {
            title: 'Knowledge Base',
            description: 'Access guides and resources',
            icon: <BookOpen className="h-6 w-6 text-gray-600" />,
            href: '/dashboard/knowledge-base',
            disabled: !hasPermission('view_knowledge_base'),
            hasAI: true
        },
        {
            title: 'Settings',
            description: 'Configure your issuer settings',
            icon: <Settings className="h-6 w-6 text-gray-600" />,
            href: '/dashboard/settings',
            disabled: !hasPermission('manage_settings')
        }
    ];

    return (
        <DashboardLayout
            title="Issuer Dashboard"
            stats={statistics}
        >
            <div className="space-y-6">
                <MetricsSection
                    title="Overview"
                    description="Your issuer activity and metrics"
                    statistics={statistics}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature) => (
                        <DashboardCard
                            key={feature.title}
                            {...feature}
                        />
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
