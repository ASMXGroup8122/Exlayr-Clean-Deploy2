'use client';

import { mockDocuments, mockTimeline } from '@/lib/mock-data';
import { Document } from '@/types';

export default function IssuerDashboard() {
    const currentStage = mockTimeline.find(stage => stage.status === 'in_progress');
    const documents = mockDocuments;

    const getStatusColor = (status: Document['status']) => {
        const colors = {
            submitted: 'bg-green-100 text-green-800',
            in_review: 'bg-yellow-100 text-yellow-800',
            required: 'bg-red-100 text-red-800',
            pending: 'bg-gray-100 text-gray-800',
            rejected: 'bg-red-100 text-red-800'
        };
        return colors[status] || colors.pending;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Issuer Dashboard</h1>
            
            {/* IPO Status */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">IPO Status</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Current Stage</p>
                            <p className="text-lg font-semibold">Due Diligence</p>
                        </div>
                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            In Progress
                        </span>
                    </div>
                    <div className="relative">
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                            <div className="w-2/3 shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center text-sm">
                        <div className="text-blue-600 font-medium">Initial Filing ✓</div>
                        <div className="text-blue-600 font-medium">Documentation ✓</div>
                        <div className="text-yellow-600 font-medium">Due Diligence</div>
                        <div className="text-gray-400">Final Approval</div>
                    </div>
                </div>
            </div>

            {/* Required Documents */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Required Documents</h2>
                <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Document
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Due Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        Financial Statements
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Submitted
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    2024-01-15
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <button className="text-indigo-600 hover:text-indigo-900">
                                        View
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        Prospectus Draft
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                        In Review
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    2024-02-01
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <button className="text-indigo-600 hover:text-indigo-900">
                                        Edit
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        Corporate Governance
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                        Required
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    2024-02-15
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <button className="text-indigo-600 hover:text-indigo-900">
                                        Upload
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Submit Documents</h3>
                    <p className="text-gray-500 mb-4">Upload required documentation</p>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                        Upload Files
                    </button>
                </div>
                
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Schedule Meeting</h3>
                    <p className="text-gray-500 mb-4">Book time with your sponsor</p>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                        Schedule
                    </button>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">View Requirements</h3>
                    <p className="text-gray-500 mb-4">Check listing requirements</p>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                        View Checklist
                    </button>
                </div>
            </div>
        </div>
    );
} 
