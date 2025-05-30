'use client';

import { useEffect } from 'react';
import { useExchangeManagement } from '@/contexts/ExchangeManagementContext';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCheck, UserX } from 'lucide-react';

interface ApprovalQueueProps {
    exchangeId: string;
}

export function ApprovalQueue({ exchangeId }: ApprovalQueueProps) {
    const {
        pendingApprovals,
        isLoading,
        error,
        fetchPendingApprovals,
        approveMember,
        rejectMember
    } = useExchangeManagement();

    useEffect(() => {
        fetchPendingApprovals(exchangeId);
    }, [exchangeId, fetchPendingApprovals]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-500">
                Error loading approvals: {error.message}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Pending Approvals</h2>
                <Button
                    variant="outline"
                    onClick={() => fetchPendingApprovals(exchangeId)}
                >
                    Refresh
                </Button>
            </div>

            {pendingApprovals.length === 0 ? (
                <Card>
                    <CardContent className="p-6">
                        <p className="text-center text-gray-500">
                            No pending approvals
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {pendingApprovals.map((approval) => (
                        <Card key={approval.userId}>
                            <CardHeader>
                                <CardTitle>
                                    {approval.firstName} {approval.lastName}
                                </CardTitle>
                                <CardDescription>{approval.email}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            Requested: {new Date(approval.requestDate).toLocaleDateString()}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Role: {approval.role}
                                        </p>
                                    </div>
                                    <div className="space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => approveMember(exchangeId, approval.userId)}
                                            className="text-green-600 hover:text-green-700"
                                        >
                                            <UserCheck className="mr-2 h-4 w-4" />
                                            Approve
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => rejectMember(exchangeId, approval.userId)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <UserX className="mr-2 h-4 w-4" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
} 
