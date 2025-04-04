'use client';

export default function AdminDashboard() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">Users</h2>
                    <p className="text-gray-600">Manage system users and roles</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">Listings</h2>
                    <p className="text-gray-600">Overview of all listings</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">System Settings</h2>
                    <p className="text-gray-600">Configure system parameters</p>
                </div>
            </div>
        </div>
    );
}
