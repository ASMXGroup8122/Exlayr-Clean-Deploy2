'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, ArrowRight, CheckCircle, AlertCircle, Clock } from 'lucide-react';

type DueDiligenceStats = {
    total: number;
    completed: number;
    pending: number;
    flagged: number;
};

export default function PersonnelDueDiligenceCard({ orgId }: { orgId: string }) {
    // This would be replaced with real data from your API/database
    const [stats] = useState<DueDiligenceStats>({
        total: 12,
        completed: 8,
        pending: 3,
        flagged: 1
    });

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Personnel Due Diligence
                            </h3>
                            <p className="text-sm text-gray-500">
                                AI-powered background checks and analysis
                            </p>
                        </div>
                    </div>
                    <Link
                        href={`/dashboard/sponsor/${orgId}/personnel-due-diligence`}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium">
                        View All
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                </div>
            </div>
            {/* Card Content */}
            <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Total Checks */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-600">Total Checks</div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</div>
                    </div>

                    {/* Completed */}
                    <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-gray-600">Completed</span>
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.completed}</div>
                    </div>

                    {/* Pending */}
                    <div className="p-4 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-600">Pending</span>
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.pending}</div>
                    </div>

                    {/* Flagged */}
                    <div className="p-4 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-gray-600">Flagged</span>
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.flagged}</div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h4>
                    <div className="space-y-3">
                        {/* These would be replaced with real data */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <div>
                                    <div className="text-sm font-medium text-gray-900">John Smith</div>
                                    <div className="text-xs text-gray-500">Background check completed</div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500">2h ago</div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                                <div>
                                    <div className="text-sm font-medium text-gray-900">Sarah Johnson</div>
                                    <div className="text-xs text-gray-500">Potential risk identified</div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500">5h ago</div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Clock className="h-4 w-4 text-yellow-500" />
                                <div>
                                    <div className="text-sm font-medium text-gray-900">Michael Brown</div>
                                    <div className="text-xs text-gray-500">Analysis in progress</div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500">1d ago</div>
                        </div>
                    </div>
                </div>

                {/* Quick Action */}
                <div className="mt-6">
                    <Link
                        href={`/dashboard/sponsor/${orgId}/personnel-due-diligence`}
                        className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Start New Check
                    </Link>
                </div>
            </div>
        </div>
    );
} 
