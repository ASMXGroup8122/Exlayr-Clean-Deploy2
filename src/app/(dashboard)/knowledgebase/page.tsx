'use client';

import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/app/layouts/DashboardLayout';
import { Brain, FileText, HelpCircle, BookOpen } from 'lucide-react';

export default function KnowledgebasePage() {
    const { user } = useAuth();

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header Section */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">AI Knowledge Vault</h1>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Add source
                    </button>
                </div>

                {/* Sources Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Sources */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Sources</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer">
                                <FileText className="w-5 h-5 text-gray-600" />
                                <span>Whitepaper_Agents.pdf</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer">
                                <FileText className="w-5 h-5 text-gray-600" />
                                <span>Technical_Documentation.pdf</span>
                            </div>
                        </div>
                    </div>

                    {/* Middle Panel - Chat */}
                    <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
                        <div className="h-[500px] flex flex-col">
                            {/* Chat Header */}
                            <div className="border-b pb-4 mb-4">
                                <h2 className="text-lg font-semibold">AI Assistant</h2>
                                <p className="text-sm text-gray-600">Ask questions about your documents</p>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-grow overflow-y-auto mb-4 space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-600">
                                        Welcome! I can help you understand your documents and answer any questions you have.
                                    </p>
                                </div>
                            </div>

                            {/* Input Area */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ask a question..."
                                    className="flex-grow p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Panel - Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                            <BookOpen className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-semibold">Study Guide</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Generate summaries and key points</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                            <HelpCircle className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-semibold">FAQ</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Common questions and answers</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                            <Brain className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-semibold">AI Analysis</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Deep insights and connections</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
} 