'use client';

import DashboardLayout from '@/app/layouts/DashboardLayout';

export default function ChatbotPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">AI Assistant</h1>
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                            <div className="bg-gray-100 p-4 rounded-lg">
                                <p className="text-gray-700">How can I help you today?</p>
                            </div>
                            <div className="mt-4">
                                <input
                                    type="text"
                                    placeholder="Type your message..."
                                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
} 
