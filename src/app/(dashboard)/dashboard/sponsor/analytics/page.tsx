'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { 
    BarChart, 
    Bar, 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Calendar, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

// Mock data
const monthlyData = [
    { month: 'Jan', listings: 4, revenue: 12000, clients: 3 },
    { month: 'Feb', listings: 6, revenue: 18000, clients: 4 },
    { month: 'Mar', listings: 8, revenue: 24000, clients: 5 },
    { month: 'Apr', listings: 7, revenue: 21000, clients: 5 },
    { month: 'May', listings: 9, revenue: 27000, clients: 6 },
    { month: 'Jun', listings: 11, revenue: 33000, clients: 7 }
];

const listingsByStatus = [
    { name: 'Active', value: 12, color: '#10B981' },
    { name: 'Pending', value: 5, color: '#F59E0B' },
    { name: 'Draft', value: 3, color: '#6B7280' }
];

const listingsByMarket = [
    { name: 'Main Market', value: 8, color: '#3B82F6' },
    { name: 'Growth Market', value: 7, color: '#8B5CF6' },
    { name: 'SME Market', value: 5, color: '#EC4899' }
];

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState('6m');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Analytics</h1>
                    <p className="text-gray-500 mt-1">Monitor your performance metrics</p>
                </div>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="border rounded-md px-4 py-2"
                >
                    <option value="1m">Last Month</option>
                    <option value="3m">Last 3 Months</option>
                    <option value="6m">Last 6 Months</option>
                    <option value="1y">Last Year</option>
                </select>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <Activity className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Listings</p>
                            <p className="text-2xl font-semibold">20</p>
                            <p className="text-sm text-green-600">+15% vs last period</p>
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
                            <p className="text-2xl font-semibold">7</p>
                            <p className="text-sm text-green-600">+40% vs last period</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Success Rate</p>
                            <p className="text-2xl font-semibold">92%</p>
                            <p className="text-sm text-green-600">+5% vs last period</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Revenue</p>
                            <p className="text-2xl font-semibold">$135,000</p>
                            <p className="text-sm text-green-600">+25% vs last period</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Listings Trend */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium mb-4">Listings Trend</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="listings" 
                                    stroke="#3B82F6" 
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Analysis */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium mb-4">Revenue Analysis</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="revenue" fill="#10B981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Listings by Status */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium mb-4">Listings by Status</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={listingsByStatus}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                >
                                    {listingsByStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Listings by Market */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium mb-4">Listings by Market</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={listingsByMarket}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                >
                                    {listingsByMarket.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
} 