'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Database } from '@/types/supabase';
import NotificationCenter from '@/components/notifications/NotificationCenter';

type UserProfile = Database['public']['Tables']['users']['Row'];

export default function Header() {
    const { user, signOut } = useAuth();
    const [profileOpen, setProfileOpen] = useState(false);

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <h2 className="text-2xl font-bold">
                                {user?.account_type === 'admin' ? 'Welcome, Admin' : 
                                 user?.account_type === 'exchange_sponsor' ? `Welcome, ${user.first_name}` :
                                 'Welcome'}
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {/* Notifications */}
                        <NotificationCenter />

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center space-x-3 hover:bg-gray-100 rounded-full py-2 px-3"
                            >
                                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                    {user?.first_name?.[0] || 'U'}
                                </div>
                                <div className="text-sm text-left hidden sm:block">
                                    <p className="font-medium text-gray-700">{user?.first_name} {user?.last_name}</p>
                                    <p className="text-gray-500">{user?.email}</p>
                                </div>
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                            </button>

                            {profileOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 border border-gray-200">
                                    <Link
                                        href="/profile"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Your Profile
                                    </Link>
                                    <Link
                                        href="/settings"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Settings
                                    </Link>
                                    <button
                                        onClick={signOut}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
} 