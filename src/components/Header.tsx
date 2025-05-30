'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
    const { user, signOut } = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <div className="flex items-center">
                    <h1 className="text-xl font-semibold text-gray-900">
                        Welcome, {user?.email}
                    </h1>
                    <span className="ml-2 text-sm text-gray-500">
                        Role: {user?.account_type}
                    </span>
                </div>
                
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleSignOut}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </header>
    );
} 
