'use client';

import DashboardLayout from '@/app/layouts/DashboardLayout';

export default function BillingPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Billing</h1>
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="space-y-4">
                        <div className="p-4 border rounded">
                            <h2 className="text-lg font-semibold">Current Plan</h2>
                            <p className="text-gray-600">Enterprise Plan</p>
                        </div>
                        <div className="p-4 border rounded">
                            <h2 className="text-lg font-semibold">Payment Method</h2>
                            <p className="text-gray-600">Add payment method</p>
                        </div>
                        <div className="p-4 border rounded">
                            <h2 className="text-lg font-semibold">Billing History</h2>
                            <p className="text-gray-600">No billing history available</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
} 
