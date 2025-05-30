'use client';

import { useAuth } from '@/contexts/AuthContext';
import AuthDebug from '@/components/AuthDebug';
import SimpleErrorTest from '@/components/SimpleErrorTest';
import { useEffect, useRef } from 'react';

export default function AuthTestPage() {
    const { user, loading, initialized } = useAuth();
    const startTime = useRef(Date.now());
    const timeSinceStart = Date.now() - startTime.current;

    useEffect(() => {
        console.log('AuthTestPage - Auth state:', {
            user: user ? { id: user.id, email: user.email, account_type: user.account_type } : null,
            loading,
            initialized,
            timeSinceStart
        });
    }, [user, loading, initialized, timeSinceStart]);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold mb-6">Auth Test Page</h1>
                
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded">
                        <h2 className="font-semibold mb-2">Auth State</h2>
                        <p><strong>Time since start:</strong> {timeSinceStart}ms</p>
                        <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                        <p><strong>Initialized:</strong> {initialized ? 'Yes' : 'No'}</p>
                    </div>

                    {user ? (
                        <div className="p-4 bg-green-50 rounded">
                            <h2 className="font-semibold mb-2">User Information</h2>
                            <p><strong>ID:</strong> {user.id}</p>
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>Account Type:</strong> {user.account_type}</p>
                            <p><strong>Organization ID:</strong> {user.organization_id || 'None'}</p>
                            <p><strong>Status:</strong> {user.status}</p>
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-50 rounded">
                            <h2 className="font-semibold mb-2">No User</h2>
                            <p>No user data available</p>
                            {!loading && initialized && (
                                <p className="text-red-600">Auth completed but no user found</p>
                            )}
                        </div>
                    )}

                    {!initialized && timeSinceStart > 15000 && (
                        <div className="p-4 bg-red-50 rounded">
                            <h2 className="font-semibold mb-2 text-red-700">Auth Hanging!</h2>
                            <p className="text-red-600">Auth has been initializing for over 15 seconds</p>
                        </div>
                    )}

                    <div className="p-4 bg-gray-50 rounded">
                        <h2 className="font-semibold mb-2">Navigation Links</h2>
                        <div className="space-y-2">
                            <a href="/sign-in" className="block text-blue-600 hover:underline">Go to Sign In</a>
                            <a href="/dashboard/sponsor" className="block text-blue-600 hover:underline">Go to Sponsor Dashboard</a>
                            <a href="/dashboard/admin" className="block text-blue-600 hover:underline">Go to Admin Dashboard</a>
                        </div>
                    </div>

                    <SimpleErrorTest />
                </div>
            </div>

            <AuthDebug />
        </div>
    );
} 
