'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';

export default function AuthDebug() {
    const { user, loading, initialized } = useAuth();
    const renderCount = useRef(0);
    const timeRef = useRef(Date.now());
    
    renderCount.current += 1;
    const timeSinceMount = Date.now() - timeRef.current;

    useEffect(() => {
        console.log('AuthDebug - Auth state changed:', {
            user: user ? { id: user.id, email: user.email, account_type: user.account_type } : null,
            loading,
            initialized,
            timeSinceMount
        });
    }, [user, loading, initialized, timeSinceMount]);

    return (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg text-xs max-w-sm">
            <h3 className="font-bold mb-2">Auth Debug</h3>
            <div className="space-y-1">
                <p><strong>Renders:</strong> {renderCount.current}</p>
                <p><strong>Time:</strong> {timeSinceMount}ms</p>
                <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                <p><strong>Initialized:</strong> {initialized ? 'Yes' : 'No'}</p>
                <p><strong>User:</strong> {user ? user.email : 'None'}</p>
                <p><strong>Account Type:</strong> {user?.account_type || 'N/A'}</p>
                {!initialized && timeSinceMount > 15000 && (
                    <p className="text-red-600 font-bold">⚠️ Auth hanging!</p>
                )}
            </div>
        </div>
    );
} 
