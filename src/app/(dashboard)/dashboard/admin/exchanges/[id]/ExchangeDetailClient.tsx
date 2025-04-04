'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentsSection } from '@/components/exchange/DocumentsSection';
import type { Exchange } from '@/lib/supabase-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { MemberStatus, ExchangeStatus } from '@/types/exchange';
import { 
    Building2, 
    Mail, 
    Phone, 
    MapPin, 
    Globe, 
    Scale,
    ArrowLeft,
    AlertCircle,
    Users
} from 'lucide-react';

interface ExchangeMember {
    id: string;
    user_id: string;
    exchange_id: string;
    role: 'admin' | 'member';
    status: MemberStatus;
    created_at: string;
    email: string;
    full_name: string;
}

interface ExchangeDetailClientProps {
    initialExchange: Exchange;
    initialDocuments: any[];
    initialMembers: ExchangeMember[];
    id: string;
}

export function ExchangeDetailClient({ 
    initialExchange,
    initialDocuments,
    initialMembers,
    id
}: ExchangeDetailClientProps) {
    const router = useRouter();
    const [exchange, setExchange] = useState<Exchange | null>(initialExchange);
    const [documents, setDocuments] = useState(initialDocuments);
    const [members, setMembers] = useState<ExchangeMember[]>(initialMembers);
    const [error] = useState<string | null>(null);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const MAX_REJECTION_REASON_LENGTH = 200;

    const handleBack = () => {
        router.back();
    };

    const handleDocumentUpdate = (updatedDocs: any[]) => {
        setDocuments(updatedDocs);
    };

    const handleStatusChange = async (newStatus: ExchangeStatus) => {
        if (newStatus === 'suspended') {
            setShowRejectDialog(true);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/exchanges/status', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    exchangeId: id,
                    newStatus,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update exchange status');
            }

            setExchange(prev => prev ? { ...prev, status: newStatus } : null);
            
            toast({
                title: "Status Updated",
                description: `Exchange has been ${newStatus === 'active' ? 'approved' : 'suspended'}.`,
            });
        } catch (error) {
            console.error('Failed to update status:', error);
            toast({
                title: "Error",
                description: "Failed to update status. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/exchanges/reject', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    exchangeId: id,
                    reason: rejectReason
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to reject exchange');
            }

            setExchange(prev => prev ? { 
                ...prev, 
                status: 'suspended',
                rejection_reason: rejectReason 
            } : null);
            
            setShowRejectDialog(false);
            setRejectReason('');
            
            toast({
                title: "Exchange Rejected",
                description: "The exchange has been rejected and notification email has been sent.",
            });
        } catch (error) {
            console.error('Failed to reject exchange:', error);
            toast({
                title: "Error",
                description: "Failed to reject exchange. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMemberStatusChange = async (memberId: string, newStatus: MemberStatus) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/exchanges/members/status', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    memberId,
                    newStatus,
                    exchangeId: id,
                }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('API error details:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorData
                });
                throw new Error(`Failed to update member status: ${errorData}`);
            }

            setMembers(prev => prev.map(member => 
                member.id === memberId ? { ...member, status: newStatus } : member
            ));

            toast({
                title: "Member Status Updated",
                description: `Member has been ${newStatus === 'active' ? 'approved' : 'suspended'}.`,
            });
        } catch (error) {
            console.error('Failed to update member status:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update member status. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusOptions = () => {
        switch (exchange?.status) {
            case 'pending':
                return [
                    { value: 'active', label: 'Approve' },
                    { value: 'suspended', label: 'Reject' }
                ];
            case 'active':
                return [
                    { value: 'active', label: 'Active' },
                    { value: 'suspended', label: 'Suspend' }
                ];
            case 'suspended':
                return [
                    { value: 'suspended', label: 'Suspended' },
                    { value: 'active', label: 'Reactivate' }
                ];
            default:
                return [];
        }
    };

    if (!exchange) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {'Exchange not found'}
                </div>
                <button
                    onClick={handleBack}
                    className="mt-4 flex items-center text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Exchanges
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Exchanges
            </button>

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">{exchange.exchange_name}</h1>
                <div className="flex items-center gap-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                        exchange.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : exchange.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}>
                        {exchange.status}
                    </span>
                    <Select
                        value={exchange.status}
                        onValueChange={(value) => handleStatusChange(value as ExchangeStatus)}
                    >
                        <SelectTrigger className="w-[140px] bg-white border-gray-300 hover:bg-gray-50">
                            <SelectValue placeholder="Change status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            {getStatusOptions().map(option => (
                                <SelectItem 
                                    key={option.value} 
                                    value={option.value}
                                    className="cursor-pointer hover:bg-gray-100"
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {exchange.status === 'suspended' && exchange.rejection_reason && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <h3 className="text-sm font-medium text-red-800">Rejection Reason:</h3>
                    <p className="mt-1 text-sm text-red-600">{exchange.rejection_reason}</p>
                </div>
            )}

            {/* Exchange Members Section */}
            <div className="bg-white p-6 rounded-lg shadow space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-gray-400" />
                        Exchange Members
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                                    Name
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                    Email
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                    Role
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                    Status
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                    Joined
                                </th>
                                <th scope="col" className="relative py-3.5 pl-3 pr-4">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {members.map((member) => (
                                <tr key={member.id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                                        {member.full_name}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {member.email}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                            member.role === 'admin' 
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                            member.status === 'active' 
                                                ? 'bg-green-100 text-green-800'
                                                : member.status === 'pending'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {new Date(member.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                                        {member.status === 'pending' && (
                                            <div className="flex items-center justify-end space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleMemberStatusChange(member.id, 'active' as MemberStatus)}
                                                    disabled={isSubmitting}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleMemberStatusChange(member.id, 'suspended' as MemberStatus)}
                                                    disabled={isSubmitting}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                        {member.status === 'active' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleMemberStatusChange(member.id, 'suspended' as MemberStatus)}
                                                disabled={isSubmitting}
                                            >
                                                Suspend
                                            </Button>
                                        )}
                                        {member.status === 'suspended' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleMemberStatusChange(member.id, 'active' as MemberStatus)}
                                                disabled={isSubmitting}
                                            >
                                                Reactivate
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                        <div className="flex items-start space-x-3">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Jurisdiction</p>
                                <p className="text-sm text-gray-900">{exchange.jurisdiction}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Scale className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Regulator</p>
                                <p className="text-sm text-gray-900">{exchange.regulator}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow space-y-6">
                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
                        <div className="flex items-start space-x-3">
                            <Mail className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Email</p>
                                <p className="text-sm text-gray-900">{exchange.contact_emails}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Phone className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Phone</p>
                                <p className="text-sm text-gray-900">{exchange.phone_number}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Globe className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Website</p>
                                <a 
                                    href={exchange.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    {exchange.website}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Documents Section */}
                <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-lg shadow space-y-6">
                    <DocumentsSection 
                        exchangeId={id}
                        documents={documents}
                        onDocumentUpdate={handleDocumentUpdate}
                    />
                </div>
            </div>

            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="bg-white">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-xl font-semibold">
                            Reject Exchange Application
                        </DialogTitle>
                        <p className="text-sm text-gray-500">
                            This will notify the exchange about the rejection.
                        </p>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                            Please provide a reason for rejection:
                        </label>
                        <Textarea
                            value={rejectReason}
                            onChange={(e) => {
                                if (e.target.value.length <= MAX_REJECTION_REASON_LENGTH) {
                                    setRejectReason(e.target.value);
                                }
                            }}
                            placeholder="Enter rejection reason..."
                            className="min-h-[100px] resize-none"
                            maxLength={MAX_REJECTION_REASON_LENGTH}
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            {rejectReason.length}/{MAX_REJECTION_REASON_LENGTH} characters
                        </p>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowRejectDialog(false);
                                setRejectReason('');
                            }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!rejectReason.trim() || isSubmitting}
                        >
                            {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 