'use client';

import { Building2, Users, Clock, FileText, Plus } from 'lucide-react';
import Link from 'next/link';

export default function SponsorDashboard() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Sponsor Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">My Listings</h2>
                    <p className="text-gray-600">Manage your listings</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">Analytics</h2>
                    <p className="text-gray-600">View performance metrics</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">Settings</h2>
                    <p className="text-gray-600">Configure your preferences</p>
                </div>
            </div>
        </div>
    );
}
