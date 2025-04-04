'use client';

import { use } from 'react';
import { 
    CreditCard, 
    Download, 
    Clock, 
    AlertCircle,
    CheckCircle2,
    DollarSign
} from 'lucide-react';

interface BillingInfo {
    plan: string;
    status: 'active' | 'overdue' | 'cancelled';
    amount: string;
    nextBilling: string;
    lastPayment: {
        amount: string;
        date: string;
        status: 'success' | 'failed' | 'pending';
    };
}

interface Invoice {
    id: string;
    date: string;
    amount: string;
    status: 'paid' | 'pending' | 'overdue';
    downloadUrl: string;
}

const mockBillingData: Record<string, BillingInfo> = {
    admin: {
        plan: 'Enterprise',
        status: 'active',
        amount: '$999/month',
        nextBilling: '2024-03-01',
        lastPayment: {
            amount: '$999',
            date: '2024-02-01',
            status: 'success'
        }
    },
    sponsors: {
        plan: 'Professional',
        status: 'active',
        amount: '$499/month',
        nextBilling: '2024-03-01',
        lastPayment: {
            amount: '$499',
            date: '2024-02-01',
            status: 'success'
        }
    },
    exchange: {
        plan: 'Enterprise Plus',
        status: 'active',
        amount: '$1499/month',
        nextBilling: '2024-03-01',
        lastPayment: {
            amount: '$1499',
            date: '2024-02-01',
            status: 'success'
        }
    },
    issuer: {
        plan: 'Standard',
        status: 'active',
        amount: '$299/month',
        nextBilling: '2024-03-01',
        lastPayment: {
            amount: '$299',
            date: '2024-02-01',
            status: 'success'
        }
    }
};

const mockInvoices: Invoice[] = [
    {
        id: 'INV-2024-001',
        date: '2024-02-01',
        amount: '$499.00',
        status: 'paid',
        downloadUrl: '#'
    },
    {
        id: 'INV-2024-002',
        date: '2024-01-01',
        amount: '$499.00',
        status: 'paid',
        downloadUrl: '#'
    }
];

export default function BillingPage({ params }: { params: Promise<{ role: string }> }) {
    const { role } = use(params);
    const billingInfo = mockBillingData[role];

    const getStatusColor = (status: string) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            overdue: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800',
            paid: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800'
        };
        return colors[status] || colors.pending;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Billing & Payments</h1>

            {/* Current Plan */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-500">Plan</div>
                        <div className="mt-1 text-xl font-semibold">{billingInfo.plan}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-500">Status</div>
                        <div className="mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(billingInfo.status)}`}>
                                {billingInfo.status.charAt(0).toUpperCase() + billingInfo.status.slice(1)}
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-500">Amount</div>
                        <div className="mt-1 text-xl font-semibold">{billingInfo.amount}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-500">Next Billing</div>
                        <div className="mt-1 text-xl font-semibold">{new Date(billingInfo.nextBilling).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Payment History</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Invoice
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Download
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {mockInvoices.map((invoice) => (
                                <tr key={invoice.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {invoice.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(invoice.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {invoice.amount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button className="text-indigo-600 hover:text-indigo-900">
                                            <Download className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Admin-only section */}
            {role === 'admin' && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">Billing Management</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-medium">Total Revenue</h3>
                            <p className="text-2xl font-bold mt-2">$45,299</p>
                            <p className="text-sm text-green-600 mt-1">+12.5% from last month</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-medium">Active Subscriptions</h3>
                            <p className="text-2xl font-bold mt-2">142</p>
                            <p className="text-sm text-green-600 mt-1">+3 new this month</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-medium">Pending Payments</h3>
                            <p className="text-2xl font-bold mt-2">5</p>
                            <p className="text-sm text-red-600 mt-1">2 overdue</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 