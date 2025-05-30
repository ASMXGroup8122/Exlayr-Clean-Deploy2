'use client';

import { use } from 'react';
import { CreditCard, Download, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface BillingOverview {
    totalRevenue: string;
    activeSubscriptions: number;
    pendingPayments: number;
    overduePayments: number;
}

interface Subscription {
    id: string;
    organization: string;
    plan: string;
    amount: string;
    status: 'active' | 'pending' | 'overdue';
    nextBilling: string;
    lastPayment: string;
}

const mockBillingOverview: BillingOverview = {
    totalRevenue: '$45,299',
    activeSubscriptions: 142,
    pendingPayments: 3,
    overduePayments: 2
};

const mockSubscriptions: Subscription[] = [
    {
        id: 'SUB-001',
        organization: 'Goldman Sachs',
        plan: 'Enterprise',
        amount: '$999/month',
        status: 'active',
        nextBilling: '2024-03-01',
        lastPayment: '2024-02-01'
    },
    {
        id: 'SUB-002',
        organization: 'Morgan Stanley',
        plan: 'Professional',
        amount: '$499/month',
        status: 'active',
        nextBilling: '2024-03-01',
        lastPayment: '2024-02-01'
    },
    {
        id: 'SUB-003',
        organization: 'ASMX Exchange',
        plan: 'Enterprise Plus',
        amount: '$1,499/month',
        status: 'pending',
        nextBilling: '2024-03-01',
        lastPayment: '2024-02-01'
    }
];

export default function BillingManagementPage() {
    const getStatusColor = (status: string) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            overdue: 'bg-red-100 text-red-800'
        };
        return colors[status as keyof typeof colors] || colors.pending;
    };

    const getStatusIcon = (status: string) => {
        const icons = {
            active: <CheckCircle2 className="w-5 h-5 text-green-600" />,
            pending: <Clock className="w-5 h-5 text-yellow-600" />,
            overdue: <AlertCircle className="w-5 h-5 text-red-600" />
        };
        return icons[status as keyof typeof icons] || icons.pending;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Billing Management</h1>

            {/* Billing Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 text-green-600">
                            <CreditCard className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                            <p className="text-2xl font-semibold">{mockBillingOverview.totalRevenue}</p>
                            <p className="text-sm text-green-600">+12.5% from last month</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
                            <p className="text-2xl font-semibold">{mockBillingOverview.activeSubscriptions}</p>
                            <p className="text-sm text-green-600">+3 new this month</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Pending Payments</p>
                            <p className="text-2xl font-semibold">{mockBillingOverview.pendingPayments}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-red-100 text-red-600">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Overdue Payments</p>
                            <p className="text-2xl font-semibold">{mockBillingOverview.overduePayments}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subscriptions List */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Active Subscriptions</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Organization
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Plan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Next Billing
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {mockSubscriptions.map((subscription) => (
                                <tr key={subscription.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {subscription.organization}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {subscription.plan}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {subscription.amount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getStatusColor(subscription.status)}`}>
                                            {getStatusIcon(subscription.status)}
                                            <span className="ml-1">
                                                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(subscription.nextBilling).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button className="text-indigo-600 hover:text-indigo-900">
                                            Manage
                                        </button>
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
