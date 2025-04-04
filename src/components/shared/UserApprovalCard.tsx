'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export interface UserApprovalCardProps {
    userId: string;
    name: string;
    email: string;
    role: 'employee' | 'advisor';
    requestDate: string;
    onApprove: (userId: string) => void;
    onReject: (userId: string) => void;
    loading?: boolean;
}

export function UserApprovalCard({
    userId,
    name,
    email,
    role,
    requestDate,
    onApprove,
    onReject,
    loading = false
}: UserApprovalCardProps) {
    const timeAgo = formatDistanceToNow(new Date(requestDate), { addSuffix: true });

    return (
        <Card className="bg-white">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-900">
                    {name}
                </CardTitle>
                <CardDescription>
                    {email} • Requested {timeAgo}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Role:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                    </span>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
                <Button
                    variant="outline"
                    onClick={() => onReject(userId)}
                    disabled={loading}
                >
                    Reject
                </Button>
                <Button
                    onClick={() => onApprove(userId)}
                    disabled={loading}
                >
                    Approve
                </Button>
            </CardFooter>
        </Card>
    );
} 