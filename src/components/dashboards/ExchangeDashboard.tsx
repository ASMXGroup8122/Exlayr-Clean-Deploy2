'use client';

export default function ExchangeDashboard() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Exchange Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">Exchange Listings</h2>
                    <p className="text-gray-600">Manage exchange listings</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">Trading Activity</h2>
                    <p className="text-gray-600">Monitor trading metrics</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">Settings</h2>
                    <p className="text-gray-600">Configure exchange settings</p>
                </div>
            </div>
        </div>
    );
}
