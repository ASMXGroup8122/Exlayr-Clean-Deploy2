'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
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

// Import NEW AI components
import AiActionCards from '@/components/ai/AiActionCards';
import AiChatInputBar from '@/components/ai/AiChatInputBar';

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

    // State for the AI interface
    const [intent, setIntent] = useState<string | null>(null);

    // Log intent whenever it changes
    useEffect(() => {
        console.log(`[SponsorDashboardPage] Intent state changed to: ${intent}`);
    }, [intent]);

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F9FA]">
            {/* Main Content */}
            <div className="flex-1 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                    <div className="bg-white p-2 sm:p-3 md:p-4 rounded-lg shadow-sm border border-[#DADCE0]">
                        <div className="flex items-center">
                            <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-blue-50">
                                <Building2 className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-blue-600" />
                            </div>
                            <div className="ml-1.5 sm:ml-2 md:ml-3 min-w-0">
                                <p className="text-[10px] sm:text-xs md:text-sm text-[#5f6368] truncate">Active Listings</p>
                                <p className="text-sm sm:text-base md:text-lg font-semibold text-[#202124]">12</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-2 sm:p-3 md:p-4 rounded-lg shadow-sm border border-[#DADCE0]">
                        <div className="flex items-center">
                            <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-green-50">
                                <Users className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-green-600" />
                            </div>
                            <div className="ml-1.5 sm:ml-2 md:ml-3 min-w-0">
                                <p className="text-[10px] sm:text-xs md:text-sm text-[#5f6368] truncate">Total Clients</p>
                                <p className="text-sm sm:text-base md:text-lg font-semibold text-[#202124]">8</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-2 sm:p-3 md:p-4 rounded-lg shadow-sm border border-[#DADCE0]">
                        <div className="flex items-center">
                            <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-purple-50">
                                <Bell className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-purple-600" />
                            </div>
                            <div className="ml-1.5 sm:ml-2 md:ml-3 min-w-0">
                                <p className="text-[10px] sm:text-xs md:text-sm text-[#5f6368] truncate">Pending Tasks</p>
                                <p className="text-sm sm:text-base md:text-lg font-semibold text-[#202124]">5</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-2 sm:p-3 md:p-4 rounded-lg shadow-sm border border-[#DADCE0]">
                        <div className="flex items-center">
                            <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-yellow-50">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-yellow-600" />
                            </div>
                            <div className="ml-1.5 sm:ml-2 md:ml-3 min-w-0">
                                <p className="text-[10px] sm:text-xs md:text-sm text-[#5f6368] truncate">Due Today</p>
                                <p className="text-sm sm:text-base md:text-lg font-semibold text-[#202124]">3</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Listings */}
                <div className="bg-white rounded-lg shadow-sm border border-[#DADCE0] overflow-hidden">
                    <div className="p-3 border-b border-[#DADCE0]">
                        <h2 className="text-base sm:text-lg font-medium text-[#202124]">Recent Listings</h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#DADCE0]">
                            <thead className="bg-[#F8F9FA]">
                                <tr>
                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-[#5f6368] uppercase whitespace-nowrap">
                                        Company
                                    </th>
                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-[#5f6368] uppercase whitespace-nowrap">
                                        Status
                                    </th>
                                    {/* Hide on mobile, show on sm+ */}
                                    <th scope="col" className="hidden sm:table-cell px-3 py-2 text-left text-xs font-medium text-[#5f6368] uppercase whitespace-nowrap">
                                        Exchange
                                    </th>
                                    {/* Hide on mobile, show on sm+ */}
                                    <th scope="col" className="hidden sm:table-cell px-3 py-2 text-left text-xs font-medium text-[#5f6368] uppercase whitespace-nowrap">
                                        Next Key Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-[#DADCE0]">
                                {recentListings.map((listing, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="text-xs text-[#202124] truncate" title={listing.companyName}>{listing.companyName}</div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                                                {listing.status}
                                            </span>
                                        </td>
                                        {/* Hide on mobile, show on sm+ */}
                                        <td className="hidden sm:table-cell px-3 py-2 whitespace-nowrap">
                                            <div className="text-xs text-[#5f6368] truncate" title={listing.exchange}>{listing.exchange}</div>
                                        </td>
                                        {/* Hide on mobile, show on sm+ */}
                                        <td className="hidden sm:table-cell px-3 py-2 whitespace-nowrap">
                                            <div className="text-xs text-[#202124] truncate" title={listing.nextKeyDate}>{listing.nextKeyDate}</div>
                                            <div className="text-xs text-[#5f6368] truncate" title={listing.keyDateDescription}>{listing.keyDateDescription}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* AI Interface Area */}
                <div className="w-full max-w-3xl mx-auto space-y-4">
                    <AiActionCards intent={intent} orgId={orgId} />
                    <AiChatInputBar onIntentChange={setIntent} />
                </div>
            </div>
        </div>
    );
} 