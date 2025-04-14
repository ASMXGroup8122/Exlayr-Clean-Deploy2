'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Database } from '@/types/supabase';
import NotificationCenter from '@/components/notifications/NotificationCenter';

type UserProfile = Database['public']['Tables']['users']['Row'];

export default function Header({ isCollapsed }: { isCollapsed: boolean }) {
    const { user, signOut } = useAuth();
    const [profileOpen, setProfileOpen] = useState(false);

    return (
        <header className={`bg-white shadow-sm fixed top-0 right-0 left-0 ${isCollapsed ? 'md:left-16' : 'md:left-[256px]'} transition-[left] duration-200`}>
            <div className="max-w-full mx-auto px-4">
                <div className="flex justify-end h-16">
                    {/* Notifications */}
                    <NotificationCenter />

                    {/* Profile Dropdown */}
                    <div className="relative flex items-center">
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center space-x-2 hover:bg-gray-100 rounded-full py-1.5 px-2"
                        >
                            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                                {user?.first_name?.[0] || 'U'}
                            </div>
                            <div className="text-sm text-left hidden sm:block">
                                <p className="font-medium text-gray-700">{user?.first_name} {user?.last_name}</p>
                                <p className="text-gray-500 text-xs">{user?.email}</p>
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>

                        {profileOpen && (
                            <div className="fixed right-4 top-[60px] w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                                <Link
                                    href="/profile"
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => setProfileOpen(false)}
                                >
                                    Your Profile
                                </Link>
                                <Link
                                    href="/settings"
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => setProfileOpen(false)}
                                >
                                    Settings
                                </Link>
                                <button
                                    onClick={() => {
                                        setProfileOpen(false);
                                        signOut();
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
} 