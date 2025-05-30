'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Check, X, User } from 'lucide-react';

interface PendingRequest {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    company_name: string;
    organization_id: string;
    user_role: string;
    status: string;
    created_at: string;
}

export default function UserManagementPage() {
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchPendingRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('status', 'pending')
                .not('is_org_admin', 'eq', true);

            if (error) throw error;
            setPendingRequests(data || []);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request: PendingRequest) => {
        try {
            setLoading(true);
            
            // Update user status
            const { error: updateError } = await supabase
                .from('users')
                .update({ 
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', request.id);

            if (updateError) throw updateError;

            // Send approval email
            await fetch('/api/send-status-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: request.email,
                    firstName: request.first_name,
                    lastName: request.last_name,
                    status: 'approved',
                    role: request.user_role || 'Member'
                })
            });

            // Refresh the requests list
            await fetchPendingRequests();
        } catch (error) {
            console.error('Error approving request:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (request: PendingRequest) => {
        try {
            setLoading(true);
            
            // Update user status and remove organization association
            const { error: updateError } = await supabase
                .from('users')
                .update({ 
                    status: 'rejected',
                    organization_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', request.id);

            if (updateError) throw updateError;

            // Send rejection email
            await fetch('/api/send-status-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: request.email,
                    firstName: request.first_name,
                    lastName: request.last_name,
                    status: 'rejected'
                })
            });

            // Refresh the requests list
            await fetchPendingRequests();
        } catch (error) {
            console.error('Error rejecting request:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Pending Access Requests</h1>
            
            <div className="bg-white rounded-lg shadow">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Organization
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Requested Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pendingRequests.map((request) => (
                                <tr key={request.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <User className="h-10 w-10 text-gray-400" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {request.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {request.company_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {request.user_role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {request.user_role}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleApprove(request)}
                                            className="text-green-600 hover:text-green-900 mr-4"
                                        >
                                            <Check className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleReject(request)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
} 
