'use client';

import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { 
    Users, 
    Building2, 
    Settings, 
    BarChart, 
    FileText,
    Brain,
    CreditCard,
    Globe,
    User,
    Clock,
    BarChartHorizontal,
    LayoutDashboard
} from 'lucide-react';
import RouteGuard from '@/components/guards/RouteGuard';

// Define StatCard component directly in this file
interface StatCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    change?: {
        value: number;
        isPositive: boolean;
    };
}

function StatCard({ title, value, icon, change }: StatCardProps) {
    return (
        <div className="bg-white rounded-lg shadow p-4 transition-all duration-200 hover:shadow-md">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    
                    {change && (
                        <div className="flex items-center mt-1">
                            <span className={`text-xs ${change.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {change.isPositive ? '↑' : '↓'} {Math.abs(change.value)}%
                            </span>
                            <span className="text-xs text-gray-500 ml-1">from last period</span>
                        </div>
                    )}
                </div>
                
                {icon && (
                    <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}

const WrappedAdminDashboard = () => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        console.log('AdminDashboard mount:', { user, loading });
        
        if (!loading) {
            if (!user) {
                console.log('No user found, redirecting to sign-in');
                router.replace('/sign-in');
            } else if (user.account_type !== 'admin') {
                console.log('Non-admin user detected:', user.account_type);
                router.replace('/sign-in');
            } else {
                console.log('Admin user confirmed:', user);
            }
        }
    }, [user, loading, router]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user || user.account_type !== 'admin') {
        return null; // Router will handle redirect
    }

    const stats = [
        { label: 'Total Listings', value: '24' },
        { label: 'Pending Approvals', value: '8' },
        { label: 'Active Sponsors', value: '12' },
        { label: 'Total Users', value: '156' },
        { label: 'Active Exchanges', value: '5' },
        { label: 'Pending Exchanges', value: '3' },
    ];

    const recentListings = [
        {
            company: 'Tech Corp Ltd',
            sponsor: 'Goldman Sachs',
            type: 'Direct Listing',
            status: 'Pending Review',
            submitted: '2024-01-15',
            exchange: 'NYSE'
        },
        {
            company: 'Innovation Inc',
            sponsor: 'Morgan Stanley',
            status: 'Pending Review',
            submitted: '2024-01-14',
        },
        // Add more listings as needed
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Listings" 
                    value="24" 
                    icon={<LayoutDashboard className="w-5 h-5" />}
                />
                <StatCard 
                    title="Pending Approvals" 
                    value="8" 
                    icon={<FileText className="w-5 h-5" />}
                />
                <StatCard 
                    title="Active Sponsors" 
                    value="12" 
                    icon={<Building2 className="w-5 h-5" />}
                />
                <StatCard 
                    title="Total Users" 
                    value="156" 
                    icon={<Users className="w-5 h-5" />}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Active Exchanges" 
                    value="5" 
                    icon={<BarChartHorizontal className="w-5 h-5" />}
                />
                <StatCard 
                    title="Pending Exchanges" 
                    value="3" 
                    icon={<BarChartHorizontal className="w-5 h-5" />}
                />
            </div>

            {/* Recent Listings */}
            <div className="bg-white rounded-lg shadow">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-medium">Recent Listings</h2>
                    <Link href="/dashboard/admin/listings" className="text-blue-600 hover:text-blue-800 text-sm">
                        View all
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Company
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sponsor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Submitted
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Exchange
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentListings.map((listing) => (
                                <tr key={listing.company}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {listing.company}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {listing.sponsor}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                            {listing.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {listing.submitted}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {listing.exchange}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <Link
                                            href={`/dashboard/admin/listings/${listing.company}`}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            Review
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Knowledge Vault and Analytics sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-lg font-medium">Knowledge Vault</h2>
                        <Link href="/dashboard/admin/knowledge" className="text-blue-600 hover:text-blue-800 text-sm">
                            View all
                        </Link>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 mt-1">
                                <Brain className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium">Latest AI Updates</h3>
                                <p className="text-xs text-gray-500">Updated 2 hours ago</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function AdminDashboard() {
    return (
        <RouteGuard allowedTypes={['admin']}>
            <WrappedAdminDashboard />
        </RouteGuard>
    );
} 
