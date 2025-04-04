'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
    BarChart3,
    Calendar,
    Users,
    Brain,
    PlusCircle,
    DollarSign,
    ArrowRight,
    Bell,
    Building2,
    Clock,
    FileText,
    Plus
} from 'lucide-react';

// Mock data
const recentListings = [
    {
        companyName: 'TechCorp Solutions',
        status: 'Draft',
        exchange: 'NYSE',
        nextKeyDate: '2024-02-15',
        keyDateDescription: 'Financial Statement Due'
    },
    {
        companyName: 'Green Energy Ltd',
        status: 'Pending',
        exchange: 'LSE',
        nextKeyDate: '2024-02-20',
        keyDateDescription: 'Board Meeting'
    },
    {
        companyName: 'Digital Innovations Inc',
        status: 'Live',
        exchange: 'NASDAQ',
        nextKeyDate: '2024-03-01',
        keyDateDescription: 'Annual Report'
    }
];

const getStatusColor = (status: string) => {
    const colors = {
        Draft: 'bg-gray-100 text-gray-800',
        Pending: 'bg-yellow-100 text-yellow-800',
        Live: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || colors.Draft;
};

const portalCards = [
    {
        title: 'Reminders & Key Dates',
        description: '3 upcoming deadlines this week',
        href: '/calendar',
        icon: Calendar,
        bgColor: 'bg-blue-50'
    },
    {
        title: 'Volume / Analytics',
        description: 'Monthly volume up 15%',
        href: '/analytics',
        icon: BarChart3,
        bgColor: 'bg-green-50'
    },
    {
        title: 'User Management',
        description: 'Manage team members and permissions',
        href: '/users',
        icon: Users,
        bgColor: 'bg-purple-50'
    },
    {
        title: 'AI Knowledge Vault',
        description: 'New regulatory guidelines available',
        href: '/knowledge-vault',
        icon: Brain,
        bgColor: 'bg-yellow-50'
    },
    {
        title: 'New Issuer Listing',
        description: 'Start a new listing application',
        href: '/new-listing',
        icon: Plus,
        bgColor: 'bg-indigo-50'
    },
    {
        title: 'Personnel Due Diligence',
        description: 'AI-powered background checks and analysis',
        href: '/personnel-due-diligence',
        icon: Users,
        bgColor: 'bg-pink-50'
    }
];

export default function SponsorDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const orgId = params?.orgId as string;

    useEffect(() => {
        if (!user || user.account_type !== 'exchange_sponsor') {
            router.replace('/sign-in');
        }
    }, [user, router]);

    return (
        <div className="space-y-6">
            {/* Listings Snapshot */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Recent Listings</h3>
                    <Link 
                        href={`/dashboard/sponsor/${orgId}/listings`}
                        className="text-sm text-blue-600 hover:text-blue-500 flex items-center"
                    >
                        View all
                        <ArrowRight className="ml-1 h-4 w-4" />
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
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Exchange
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Next Key Date
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentListings.map((listing) => (
                                <tr key={listing.companyName}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {listing.companyName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(listing.status)}`}>
                                            {listing.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {listing.exchange}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{listing.nextKeyDate}</div>
                                        <div className="text-sm text-gray-500">{listing.keyDateDescription}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Portal Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {portalCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link
                            key={card.title}
                            href={`/dashboard/sponsor/${orgId}${card.href}`}
                            className={`${card.bgColor} p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow`}
                        >
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Icon className="h-6 w-6 text-gray-600" />
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        {card.title}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {card.description}
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