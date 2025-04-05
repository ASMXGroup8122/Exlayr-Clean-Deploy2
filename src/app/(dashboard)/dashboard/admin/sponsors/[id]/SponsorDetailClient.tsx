'use client';

import { useState } from 'react';
import { Building2, Mail, Phone, Globe, Briefcase, Calendar, MapPin } from 'lucide-react';
import { DocumentsSection, Document } from '@/components/sponsor/DocumentsSection';
import { useApproval } from '@/contexts/ApprovalContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { getSupabaseClient } from '@/lib/supabase/client';

type SponsorDetailClientProps = {
    initialSponsor: {
        id: string;
        sponsor_name: string;
        phone_number: string;
        sponsor_email: string;
        sponsor_address: string;
        contact_name: string;
        regulated_no: string;
        regulator: string;
        specialities: string[];
        website: string;
        linkedin: string;
        instagram: string;
        created_at: string;
        status: 'pending' | 'active' | 'suspended';
        rejection_reason?: string;
    };
    initialDocuments: Document[];
    id: string;
};

export function SponsorDetailClient({ initialSponsor, initialDocuments, id }: SponsorDetailClientProps) {
    const [sponsor, setSponsor] = useState(initialSponsor);
    const [documents, setDocuments] = useState(initialDocuments);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const { updateOrganizationStatus, loading } = useApproval();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const supabase = getSupabaseClient();
    const MAX_REJECTION_REASON_LENGTH = 200;

    const getStatusColor = (status: string) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            suspended: 'bg-red-100 text-red-800'
        };
        return colors[status as keyof typeof colors] || colors.pending;
    };

    const handleDocumentUpdate = (updatedDocs: Document[]) => {
        setDocuments(updatedDocs);
    };

    const handleStatusChange = async (newStatus: 'active' | 'suspended') => {
        if (newStatus === 'suspended') {
            setShowRejectDialog(true);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('exchange_sponsor')
                .update({ 
                    status: newStatus,
                })
                .eq('id', id);

            if (error) throw error;

            setSponsor({
                ...sponsor,
                status: newStatus
            });
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        
        setIsSubmitting(true);
        try {
            const { error: updateError } = await supabase
                .from('exchange_sponsor')
                .update({ 
                    status: 'suspended',
                    rejection_reason: rejectReason
                })
                .eq('id', id);

            if (updateError) throw updateError;

            const { error: emailError } = await supabase.functions.invoke('send-email', {
                body: {
                    to: sponsor.sponsor_email,
                    subject: 'Sponsor Application Rejected',
                    content: `
                        Dear ${sponsor.contact_name},

                        Your sponsor application for ${sponsor.sponsor_name} has been rejected.

                        Reason: ${rejectReason}

                        If you have any questions, please contact support.

                        Best regards,
                        Exlayr Team
                    `
                }
            });

            if (emailError) {
                console.error('Failed to send email:', emailError);
            }

            setSponsor({
                ...sponsor,
                status: 'suspended',
                rejection_reason: rejectReason
            });
            setShowRejectDialog(false);
            setRejectReason('');
            
            toast({
                title: "Sponsor Rejected",
                description: "The sponsor has been rejected and notification email has been sent.",
            });
            
        } catch (error) {
            console.error('Failed to reject sponsor:', error);
            toast({
                title: "Error",
                description: "Failed to reject sponsor. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusOptions = () => {
        switch (sponsor.status) {
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

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-blue-600" />
                            {sponsor.sponsor_name}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Regulated by {sponsor.regulator} (No. {sponsor.regulated_no})
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(sponsor.status)}`}>
                            {sponsor.status.charAt(0).toUpperCase() + sponsor.status.slice(1)}
                        </span>
                        <Select
                            value={sponsor.status}
                            onValueChange={(value) => handleStatusChange(value as 'active' | 'suspended')}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Change status" />
                            </SelectTrigger>
                            <SelectContent>
                                {getStatusOptions().map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {sponsor.status === 'pending' && (
                    <p className="mt-2 text-sm text-gray-600">
                        Future Admin: {sponsor.contact_name}
                    </p>
                )}
                {sponsor.status === 'suspended' && sponsor.rejection_reason && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <h3 className="text-sm font-medium text-red-800">Rejection Reason:</h3>
                        <p className="mt-1 text-sm text-red-600">{sponsor.rejection_reason}</p>
                    </div>
                )}
            </div>

            {/* Contact Information */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                            <p className="text-sm font-medium text-gray-500">Email</p>
                            <p className="text-sm text-gray-900">{sponsor.sponsor_email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                            <p className="text-sm font-medium text-gray-500">Phone</p>
                            <p className="text-sm text-gray-900">{sponsor.phone_number}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-gray-400" />
                        <div>
                            <p className="text-sm font-medium text-gray-500">Website</p>
                            <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800">
                                {sponsor.website}
                            </a>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                        <div>
                            <p className="text-sm font-medium text-gray-500">Contact Person</p>
                            <p className="text-sm text-gray-900">{sponsor.contact_name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                            <p className="text-sm font-medium text-gray-500">Member Since</p>
                            <p className="text-sm text-gray-900">{new Date(sponsor.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                            <p className="text-sm font-medium text-gray-500">Address</p>
                            <p className="text-sm text-gray-900">{sponsor.sponsor_address}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Specialities */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Specialities</h2>
                <div className="flex flex-wrap gap-2">
                    {sponsor.specialities.map((speciality, index) => (
                        <span 
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                            {speciality}
                        </span>
                    ))}
                </div>
            </div>

            {/* Documents Section */}
            <DocumentsSection
                documents={documents}
                entityId={id}
                entityType="sponsor"
                onDocumentUpdate={handleDocumentUpdate}
            />

            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="bg-white">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-xl font-semibold">
                            Reject Sponsor Application
                        </DialogTitle>
                        <p className="text-sm text-gray-500">
                            This will notify {sponsor.contact_name} about the rejection.
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