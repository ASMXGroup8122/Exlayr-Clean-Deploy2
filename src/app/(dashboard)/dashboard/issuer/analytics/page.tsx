'use client';

import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { MessageSquare, TrendingUp, Users, Volume2 } from 'lucide-react';

// Mock data for share price movements
const mockSharePriceData = [
    { time: '9:00', price: 125 },
    { time: '10:00', price: 128 },
    { time: '11:00', price: 127 },
    { time: '12:00', price: 132 },
    { time: '13:00', price: 135 },
    { time: '14:00', price: 134 },
    { time: '15:00', price: 137 },
    { time: '16:00', price: 140 },
];

// Mock data for trading volume
const mockVolumeData = [
    { day: 'Mon', volume: 250000 },
    { day: 'Tue', volume: 320000 },
    { day: 'Wed', volume: 280000 },
    { day: 'Thu', volume: 450000 },
    { day: 'Fri', volume: 380000 },
];

// Mock investor comments and sentiment
const mockInvestorComments = [
    {
        id: 1,
        comment: "Strong Q3 results, showing good growth potential",
        sentiment: "positive",
        timestamp: "2024-02-15T10:30:00",
        platform: "ASMX Network"
    },
    {
        id: 2,
        comment: "Concerned about the new market expansion plans",
        sentiment: "negative",
        timestamp: "2024-02-15T11:15:00",
        platform: "ASMX Network"
    },
    {
        id: 3,
        comment: "Management team's presentation was very informative",
        sentiment: "positive",
        timestamp: "2024-02-15T14:20:00",
        platform: "ASMX Network"
    }
];

// Mock news impact data
const mockNewsImpacts = [
    {
        id: 1,
        event: "Q3 Results Announcement",
        date: "2024-02-10",
        priceChange: "+5.2%",
        volumeChange: "+120%",
        sentiment: "positive"
    },
    {
        id: 2,
        event: "New Product Launch",
        date: "2024-02-05",
        priceChange: "+3.8%",
        volumeChange: "+85%",
        sentiment: "positive"
    },
    {
        id: 3,
        event: "Executive Resignation",
        date: "2024-01-28",
        priceChange: "-2.5%",
        volumeChange: "+95%",
        sentiment: "negative"
    }
];

export default function IssuerAnalyticsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Market Analytics</h1>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Current Share Price</p>
                            <p className="text-xl font-semibold">140.00p</p>
                            <p className="text-sm text-green-600">+2.2% today</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 text-green-600">
                            <Volume2 className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Daily Volume</p>
                            <p className="text-xl font-semibold">380,000</p>
                            <p className="text-sm text-green-600">+15% vs avg</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Investors</p>
                            <p className="text-xl font-semibold">1,245</p>
                            <p className="text-sm text-green-600">+23 this week</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <MessageSquare className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Investor Sentiment</p>
                            <p className="text-xl font-semibold">Positive</p>
                            <p className="text-sm text-green-600">72% positive</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">Share Price Movement</h2>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mockSharePriceData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="price" 
                                    stroke="#3b82f6" 
                                    name="Share Price (p)"
                                    fill="#3b82f6"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">Trading Volume</h2>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockVolumeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar 
                                    dataKey="volume" 
                                    fill="#3b82f6" 
                                    name="Trading Volume"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ASMX Network Comments */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">ASMX Network Activity</h2>
                <div className="space-y-4">
                    {mockInvestorComments.map((comment) => (
                        <div key={comment.id} className="border-b pb-4">
                            <div className="flex justify-between items-start">
                                <p className={`text-sm ${
                                    comment.sentiment === 'positive' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {comment.comment}
                                </p>
                                <span className="text-xs text-gray-500">
                                    {new Date(comment.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{comment.platform}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* News Impact Analysis */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">News Impact Analysis</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Event
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Price Impact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Volume Impact
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {mockNewsImpacts.map((impact) => (
                                <tr key={impact.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {impact.event}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {impact.date}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            impact.priceChange.startsWith('+') 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {impact.priceChange}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                                        {impact.volumeChange}
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
