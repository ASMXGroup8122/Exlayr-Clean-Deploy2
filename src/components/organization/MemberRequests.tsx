'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, UserMinus, CheckCircle, XCircle, Mail } from 'lucide-react';

interface PendingMember {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    user_role: string;
    status: string;
    organization_id: string;
    created_at: string;
}

export const MemberRequests = () => {
    const { user } = useAuth();
    const [pendingRequests, setPendingRequests] = useState<PendingMember[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPendingRequests = async () => {
        try {
            const { data: orgData } = await supabase
                .from('exchange_sponsor')
                .select('id')
                .eq('admin_user_id', user?.id)
                .single();

            if (orgData) {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('organization_id', orgData.id)
                    .eq('status', 'pending')
                    .not('is_org_admin', 'eq', true);

                if (error) throw error;
                setPendingRequests(data || []);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (memberId: string, approved: boolean) => {
        try {
            if (approved) {
                const { error } = await supabase
                    .from('users')
                    .update({
                        status: 'active',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', memberId);

                if (error) throw error;

                // Send approval notification
                await fetch('/api/send-status-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'member_approved',
                        memberId
                    })
                });
            } else {
                const { error } = await supabase
                    .from('users')
                    .update({
                        status: 'rejected',
                        organization_id: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', memberId);

                if (error) throw error;

                // Send rejection notification
                await fetch('/api/send-status-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'member_rejected',
                        memberId
                    })
                });
            }

            // Refresh the list
            fetchPendingRequests();
        } catch (error) {
            console.error('Error handling request:', error);
        }
    };

    useEffect(() => {
        fetchPendingRequests();
    }, [user]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Pending Member Requests</h2>
            </div>
            <ul className="divide-y divide-gray-200">
                {pendingRequests.length === 0 ? (
                    <li className="p-4 text-center text-gray-500">
                        No pending requests
                    </li>
                ) : (
                    pendingRequests.map((request) => (
                        <li key={request.id} className="px-4 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900">
                                        {request.first_name} {request.last_name}
                                    </h4>
                                    <div className="mt-1 flex items-center text-sm text-gray-500">
                                        <Mail className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                        {request.email}
                                    </div>
                                    <div className="mt-1">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Requested Role: {request.user_role || 'Member'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleApproval(request.id, true)}
                                        className="inline-flex items-center p-2 border border-transparent rounded-full text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        <CheckCircle className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => handleApproval(request.id, false)}
                                        className="inline-flex items-center p-2 border border-transparent rounded-full text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        <XCircle className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}; 