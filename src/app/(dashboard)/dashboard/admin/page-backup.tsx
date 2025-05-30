'use client';

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
    User
} from 'lucide-react';

export default function AdminDashboard() {
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
    ];

    const recentListings = [
        {
            company: 'Tech Corp Ltd',
            sponsor: 'Goldman Sachs',
            status: 'Pending Review',
            submitted: '2024-01-15',
        },
        {
            company: 'Innovation Inc',
            sponsor: 'Morgan Stanley',
            status: 'Pending Review',
            submitted: '2024-01-14',
        },
        // Add more listings as needed
    ];

    const managementItems = [
        {
            title: 'User Management',
            description: 'Manage system users and permissions',
            icon: User,
            href: '/dashboard/admin/users',
            bgColor: 'bg-blue-50'
        },
        {
            title: 'Issuer Management',
            description: 'Manage and approve issuers',
            icon: Building2,
            href: '/dashboard/admin/issuers',
            bgColor: 'bg-purple-50'
        },
        {
            title: 'Listings Management',
            description: 'Manage and review all listings',
            icon: FileText,
            href: '/dashboard/admin/listings',
            bgColor: 'bg-indigo-50'
        },
        {
            title: 'Sponsor Management',
            description: 'Manage sponsor organizations',
            icon: Users,
            href: '/dashboard/admin/sponsors',
            bgColor: 'bg-pink-50'
        },
        {
            title: 'Exchange Management',
            description: 'Manage exchange settings',
            icon: Globe,
            href: '/dashboard/admin/exchanges',
            bgColor: 'bg-green-50'
        },
        {
            title: 'Billing Management',
            description: 'Manage subscriptions and payments',
            icon: CreditCard,
            href: '/dashboard/admin/billing',
            bgColor: 'bg-yellow-50'
        },
        {
            title: 'System Settings',
            description: 'Configure system parameters',
            icon: Settings,
            href: '/dashboard/admin/settings',
            bgColor: 'bg-gray-50'
        },
        {
            title: 'Analytics',
            description: 'View system analytics',
            icon: BarChart,
            href: '/dashboard/admin/analytics',
            bgColor: 'bg-red-50'
        },
        {
            title: 'AI Tools',
            description: 'Manage AI-powered tools and Knowledge Vaults',
            icon: Brain,
            href: '/dashboard/admin/knowledgebase',
            bgColor: 'bg-teal-50'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Stats Section */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <dt className="text-sm font-medium text-gray-500 truncate">
                                {stat.label}
                            </dt>
                            <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                {stat.value}
                            </dd>
                        </div>
                    </div>
                ))}
            </div>
            {/* Recent Listings Table */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Recent Listings</h3>
                    <Link 
                        href="/dashboard/admin/listings"
                        className="text-sm text-blue-600 hover:text-blue-500"
                    >
                        View all
                    </Link>
                </div>
                <div className="border-t border-gray-200">
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
            {/* Knowledge Vault Section */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Knowledge Vault</h3>
                        <Link 
                            href="/dashboard/admin/knowledge"
                            className="text-sm text-blue-600 hover:text-blue-500"
                        >
                            View all
                        </Link>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                                <Brain className="h-5 w-5 text-gray-400 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Latest AI Updates</p>
                                    <p className="text-xs text-gray-500">Updated 2 hours ago</p>
                                </div>
                            </div>
                            <Link 
                                href="/dashboard/admin/knowledge/latest"
                                className="text-sm text-blue-600 hover:text-blue-500"
                            >
                                View
                            </Link>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                                <FileText className="h-5 w-5 text-gray-400 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Documentation</p>
                                    <p className="text-xs text-gray-500">12 new documents</p>
                                </div>
                            </div>
                            <Link 
                                href="/dashboard/admin/knowledge/docs"
                                className="text-sm text-blue-600 hover:text-blue-500"
                            >
                                View
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Analytics Preview */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Analytics Overview</h3>
                        <Link 
                            href="/dashboard/admin/analytics"
                            className="text-sm text-blue-600 hover:text-blue-500"
                        >
                            Full Report
                        </Link>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                                <BarChart className="h-5 w-5 text-gray-400 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Monthly Activity</p>
                                    <p className="text-xs text-gray-500">+15% from last month</p>
                                </div>
                            </div>
                            <Link 
                                href="/dashboard/admin/analytics/monthly"
                                className="text-sm text-blue-600 hover:text-blue-500"
                            >
                                Details
                            </Link>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                                <Users className="h-5 w-5 text-gray-400 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">User Growth</p>
                                    <p className="text-xs text-gray-500">+32 new users this week</p>
                                </div>
                            </div>
                            <Link 
                                href="/dashboard/admin/analytics/users"
                                className="text-sm text-blue-600 hover:text-blue-500"
                            >
                                Details
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            {/* Management Sections */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {managementItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.title}
                            href={item.href}
                            className={`${item.bgColor} p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Icon className="h-6 w-6 text-gray-600" />
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        {item.title}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
} 
