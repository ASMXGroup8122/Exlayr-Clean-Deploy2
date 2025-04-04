'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Check, X, User } from 'lucide-react';

type PendingRequest = {
    id: string;
    user_id: string;
    organization_id: string;
    organization_type: string;
    requested_role: string;
    status: string;
    created_at: string;
    user_email?: string;
    organization_name?: string;
};

export default function AdminUsersPage() {
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { supabaseClient } = useAuth();

    useEffect(() => {
        // No need for access check here anymore, handled by middleware
        fetchPendingRequests();
    }, []);

    const fetchPendingRequests = async () => {
        try {
            setLoading(true);
            const { data: requests, error } = await supabaseClient
                .from('organization_members')
                .select(`
                    id,
                    user_id,
                    organization_id,
                    organization_type,
                    requested_role,
                    status,
                    created_at,
                    user_email,
                    company_name,
                    first_name,
                    last_name
                `)
                .eq('status', 'pending');

            if (error) throw error;

            setPendingRequests(requests || []);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request: PendingRequest) => {
        try {
            setLoading(true);
            
            // Start a Supabase transaction to update both tables
            const { error: updateError } = await supabaseClient.rpc('approve_organization_member', {
                member_id: request.id,
                user_id: request.user_id,
                org_id: request.organization_id,
                user_requested_role: request.requested_role.toLowerCase() // Convert EMPLOYEE/ADVISOR to lowercase
            });

            if (updateError) throw updateError;

            // Send approval email
            await fetch('/api/send-status-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: 'dbw+ai@asmx.group', // Mock email
                    firstName: request.first_name,
                    lastName: request.last_name,
                    userEmail: request.user_email,
                    status: 'approved',
                    organizationType: request.organization_type,
                    role: request.requested_role
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
            
            // Update organization_members status
            const { error: updateError } = await supabaseClient
                .from('organization_members')
                .update({ 
                    status: 'rejected',
                    rejection_reason: rejectionReason 
                })
                .eq('id', request.id);

            if (updateError) throw updateError;

            // Send rejection email
            await fetch('/api/send-status-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: 'dbw+ai@asmx.group', // Mock email
                    firstName: request.first_name,
                    lastName: request.last_name,
                    userEmail: request.user_email,
                    status: 'rejected',
                    organizationType: request.organization_type,
                    role: request.requested_role,
                    rejectionReason: rejectionReason
                })
            });

            // Close modal and reset state
            setIsRejectionModalOpen(false);
            setRejectionReason('');
            setSelectedRequest(null);

            // Refresh the requests list
            await fetchPendingRequests();
        } catch (error) {
            console.error('Error rejecting request:', error);
        } finally {
            setLoading(false);
        }
    };

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
                                    Date Requested
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pendingRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                        No pending requests
                                    </td>
                                </tr>
                            ) : (
                                pendingRequests.map((request) => (
                                    <tr key={request.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <User className="h-10 w-10 text-gray-400" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {request.first_name} {request.last_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {request.user_email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {request.organization_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {request.organization_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {request.requested_role}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(request.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleApprove(request)}
                                                className="text-green-600 hover:text-green-900 mr-4"
                                                title="Approve"
                                            >
                                                <Check className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleReject(request)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Reject"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
} 