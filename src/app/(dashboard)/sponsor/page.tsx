'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User as UserIcon, UserPlus as UserPlusIcon } from 'lucide-react';

interface DashboardData {
    totalMembers: number;
    pendingMembers: number;
    // Add other metrics as needed
}

export default function SponsorDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardData>({
        totalMembers: 0,
        pendingMembers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.organization_id) return;

            try {
                // Get total members count
                const { count: totalCount } = await supabase
                    .from('users')
                    .select('*', { count: 'exact' })
                    .eq('organization_id', user.organization_id)
                    .eq('status', 'active');

                // Get pending members count
                const { count: pendingCount } = await supabase
                    .from('users')
                    .select('*', { count: 'exact' })
                    .eq('organization_id', user.organization_id)
                    .eq('status', 'pending')
                    .not('is_org_admin', 'eq', true);

                setData({
                    totalMembers: totalCount || 0,
                    pendingMembers: pendingCount || 0
                });
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Sponsor Dashboard</h1>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <UserIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Members
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.totalMembers}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <UserPlusIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Pending Members
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.pendingMembers}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 