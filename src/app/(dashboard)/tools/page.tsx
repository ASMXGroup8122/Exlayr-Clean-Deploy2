'use client';

import DashboardLayout from '@/app/layouts/DashboardLayout';

export default function ToolsPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Tools</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-2">Document Generator</h2>
                        <p className="text-gray-600">Create standardized documents</p>
                    </div>
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-2">Data Import</h2>
                        <p className="text-gray-600">Import data from external sources</p>
                    </div>
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-2">Analytics</h2>
                        <p className="text-gray-600">View detailed analytics</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
} 