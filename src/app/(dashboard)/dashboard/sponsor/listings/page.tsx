'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Download, Eye, Edit, Trash2 } from 'lucide-react';

interface Listing {
    id: string;
    companyName: string;
    status: 'active' | 'pending' | 'draft';
    exchange: string;
    lastUpdated: string;
    type: string;
    market: string;
}

const mockListings: Listing[] = [
    {
        id: '1',
        companyName: 'Tech Corp Ltd',
        status: 'active',
        exchange: 'ASMX London',
        lastUpdated: '2024-02-15',
        type: 'Equity',
        market: 'Main Market'
    },
    {
        id: '2',
        companyName: 'Green Energy PLC',
        status: 'pending',
        exchange: 'ASMX Dubai',
        lastUpdated: '2024-02-14',
        type: 'Bond',
        market: 'Growth Market'
    }
];

export default function ListingsPage() {
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const getStatusColor = (status: string) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            draft: 'bg-gray-100 text-gray-800'
        };
        return colors[status as keyof typeof colors] || colors.pending;
    };

    const filteredListings = mockListings.filter(listing => {
        const matchesStatus = filterStatus === 'all' || listing.status === filterStatus;
        const matchesSearch = listing.companyName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Manage Listings</h1>
                <Link 
                    href="/dashboard/sponsor/listings/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Listing
                </Link>
            </div>

            {/* Filters and Search */}
            <div className="flex justify-between items-center space-x-4">
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Search listings..."
                        className="pl-10 pr-4 py-2 w-full border rounded-md"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center space-x-4">
                    <select
                        className="border rounded-md px-4 py-2"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="draft">Draft</option>
                    </select>
                    <button className="inline-flex items-center px-4 py-2 border rounded-md hover:bg-gray-50">
                        <Filter className="w-5 h-5 mr-2" />
                        More Filters
                    </button>
                    <button className="inline-flex items-center px-4 py-2 border rounded-md hover:bg-gray-50">
                        <Download className="w-5 h-5 mr-2" />
                        Export
                    </button>
                </div>
            </div>

            {/* Listings Table */}
            <div className="bg-white shadow rounded-lg">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Company
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Market
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Exchange
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Updated
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredListings.map((listing) => (
                                <tr key={listing.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {listing.companyName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {listing.type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {listing.market}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {listing.exchange}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(listing.status)}`}>
                                            {listing.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(listing.lastUpdated).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex space-x-3">
                                            <button className="text-blue-600 hover:text-blue-900">
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button className="text-indigo-600 hover:text-indigo-900">
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button className="text-red-600 hover:text-red-900">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
} 