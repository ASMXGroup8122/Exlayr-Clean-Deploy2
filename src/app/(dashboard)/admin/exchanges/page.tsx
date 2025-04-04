'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { 
    Bell, 
    FileText, 
    Megaphone,
    Plus
} from 'lucide-react';

export default function ExchangeManagement() {
    const stats = [
        { label: 'Active Listings', value: '142' },
        { label: 'Pending IPOs', value: '15' },
        { label: 'Market Cap', value: '$2.4T' },
        { label: 'Daily Volume', value: '$85M' },
    ];

    const pendingReviews = [
        {
            company: 'Tech Corp Ltd',
            sponsor: 'Goldman Sachs',
            filingType: 'Initial Filing',
            dueDate: '2024-02-15',
        },
        // Add more pending reviews as needed
    ];

    return (
        <div className="space-y-6">
            {/* Header with Add Exchange Button */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Exchange Dashboard</h1>
                <Link
                    href="/dashboard/admin/exchanges/add"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Exchange
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white rounded-lg p-6 shadow-sm">
                        <dt className="text-sm font-medium text-gray-500">
                            {stat.label}
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold">
                            {stat.value}
                        </dd>
                    </div>
                ))}
            </div>

            {/* Pending Reviews Table */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                    <h2 className="text-lg font-medium">Pending Reviews</h2>
                    <div className="mt-4">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Company
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Sponsor
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Filing Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Due Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {pendingReviews.map((review) => (
                                    <tr key={review.company}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {review.company}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {review.sponsor}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {review.filingType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {review.dueDate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <Link
                                                href="#"
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                            >
                                                Review
                                            </Link>
                                            <button
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Market Surveillance */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium">Market Surveillance</h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Monitor market activity and alerts
                    </p>
                    <button className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        <Bell className="w-5 h-5 mr-2" />
                        View Alerts
                    </button>
                </div>

                {/* Compliance Reports */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium">Compliance Reports</h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Review compliance status
                    </p>
                    <button className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        <FileText className="w-5 h-5 mr-2" />
                        View Reports
                    </button>
                </div>

                {/* Market Announcements */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium">Market Announcements</h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Manage public announcements
                    </p>
                    <button className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        <Megaphone className="w-5 h-5 mr-2" />
                        Create Announcement
                    </button>
                </div>
            </div>
        </div>
    );
} 