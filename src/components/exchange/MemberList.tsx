'use client';

import { useEffect } from 'react';
import { useExchangeManagement } from '@/contexts/ExchangeManagementContext';
import { ExchangeMember, MemberRole } from '@/types/exchange';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, UserCheck, UserX } from 'lucide-react';

interface MemberListProps {
    exchangeId: string;
}

export function MemberList({ exchangeId }: MemberListProps) {
    const {
        members,
        isLoading,
        error,
        fetchMembers,
        updateMemberRole,
        approveMember,
        rejectMember
    } = useExchangeManagement();

    useEffect(() => {
        fetchMembers(exchangeId);
    }, [exchangeId, fetchMembers]);

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
                Error loading members: {error.message}
            </div>
        );
    }

    const getStatusBadge = (status: ExchangeMember['status']) => {
        const variants = {
            pending: 'bg-yellow-100 text-yellow-800',
            active: 'bg-green-100 text-green-800',
            suspended: 'bg-red-100 text-red-800'
        };

        return (
            <Badge className={variants[status]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
        await updateMemberRole(exchangeId, memberId, newRole);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Exchange Members</h2>
                <Button
                    variant="outline"
                    onClick={() => fetchMembers(exchangeId)}
                >
                    Refresh
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {members.map((member) => (
                        <TableRow key={member.id}>
                            <TableCell>
                                {member.firstName} {member.lastName}
                            </TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            {member.role}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem
                                            onClick={() => handleRoleChange(member.id, 'admin')}
                                        >
                                            Admin
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleRoleChange(member.id, 'member')}
                                        >
                                            Member
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            <TableCell>
                                {getStatusBadge(member.status)}
                            </TableCell>
                            <TableCell>
                                {new Date(member.joinedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {member.status === 'pending' && (
                                            <>
                                                <DropdownMenuItem
                                                    onClick={() => approveMember(exchangeId, member.id)}
                                                >
                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                    Approve
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => rejectMember(exchangeId, member.id)}
                                                    className="text-red-600"
                                                >
                                                    <UserX className="mr-2 h-4 w-4" />
                                                    Reject
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
} 