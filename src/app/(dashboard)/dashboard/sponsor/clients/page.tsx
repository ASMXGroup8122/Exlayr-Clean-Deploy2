'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Download, Building2, Users, BarChart3 } from 'lucide-react';

interface Client {
    id: string;
    name: string;
    status: 'active' | 'pending';
    listings: number;
    joinedDate: string;
    industry: string;
    location: string;
    contactPerson: string;
    email: string;
}

const mockClients: Client[] = [
    {
        id: '1',
        name: 'Tech Corp Ltd',
        status: 'active',
        listings: 2,
        joinedDate: '2024-01-15',
        industry: 'Technology',
        location: 'London, UK',
        contactPerson: 'John Smith',
        email: 'john.smith@techcorp.com'
    },
    {
        id: '2',
        name: 'Green Energy PLC',
        status: 'pending',
        listings: 1,
        joinedDate: '2024-02-10',
        industry: 'Energy',
        location: 'Dubai, UAE',
        contactPerson: 'Sarah Johnson',
        email: 'sarah.j@greenenergy.com'
    }
];

export default function ClientsPage() {
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const getStatusColor = (status: string) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800'
        };
        return colors[status as keyof typeof colors] || colors.pending;
    };

    const filteredClients = mockClients.filter(client => {
        const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Issuer Clients</h1>
                <Link 
                    href="/dashboard/sponsor/clients/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Client
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Clients</p>
                            <p className="text-2xl font-semibold">{mockClients.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 text-green-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Active Clients</p>
                            <p className="text-2xl font-semibold">
                                {mockClients.filter(c => c.status === 'active').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Listings</p>
                            <p className="text-2xl font-semibold">
                                {mockClients.reduce((acc, client) => acc + client.listings, 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex justify-between items-center space-x-4">
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Search clients..."
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

            {/* Clients Table */}
            <div className="bg-white shadow rounded-lg">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Company
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Industry
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Location
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact Person
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Listings
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredClients.map((client) => (
                                <tr key={client.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {client.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {client.industry}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {client.location}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{client.contactPerson}</div>
                                        <div className="text-sm text-gray-500">{client.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(client.status)}`}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {client.listings}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex space-x-3">
                                            <Link 
                                                href={`/dashboard/sponsor/clients/${client.id}`}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                View
                                            </Link>
                                            <Link 
                                                href={`/dashboard/sponsor/clients/${client.id}/edit`}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Edit
                                            </Link>
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