'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Mail, Phone, Globe, User, Calendar, FileText, CreditCard, Shield, BarChart, Download, Eye, ExternalLink, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';

interface IssuerDetails {
    id: string;
    issuer_name: string;
    company_registration_number: string;
    incorporation_date: string;
    legal_structure: string;
    country: string;
    business_email: string;
    phone_number: string;
    business_website: string;
    registered_address: string;
    chief_executiveofficer: string;
    ceo_title: string;
    ceo_nationality: string;
    ceo_dob: string;
    ceo_shares_in_the_co: string;
    ceo_other_directorships: string;
    financial_director: string;
    fd_title: string;
    fd_nationality: string;
    fd_dob: string;
    fd_shares_in_the_co: string;
    fd_other_directorships: string;
    [key: string]: any; // Allow dynamic access for director fields
    nominal_share_price: string;
    authorised_share_capital: string;
    shares_in_issue: string;
    preemption_rights: string;
    dividend_policy: string;
    dividend_date_1: string;
    business_overview: string;
    company_prospects: string;
    recent_performance: string;
    legal_advisors_name: string;
    legal_advisors_address: string;
    auditors_name: string;
    auditors_address: string;
    trustee_name: string;
    trustee_address: string;
    accountant_name: string;
    accountants_address: string;
    administrators_name: string;
    administrators_address: string;
    company_secretary: string;
    co_sec_address: string;
    exchange_sponsor: string;
    does_the_company_have_regulators: boolean;
    number_of_regulators: string;
    status: string;
    created_at: string;
}

interface IssuerDocument {
    id: string;
    issuer_id: string;
    category: string;
    file_name: string;
    file_path: string;
    content_type: string;
    file_type: string;
}

interface IssuerDetailClientProps {
    initialIssuer: IssuerDetails;
    initialDocuments: IssuerDocument[];
    id: string;
}

interface DataFieldProps {
    label: string;
    value: string | number | boolean | null | undefined;
    fullWidth?: boolean;
}

const DataField = ({ label, value, fullWidth = false }: DataFieldProps) => (
    <div className={fullWidth ? 'col-span-2' : ''}>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value?.toString() || 'N/A'}</dd>
    </div>
);

export function IssuerDetailClient({ initialIssuer, initialDocuments, id }: IssuerDetailClientProps) {
    const [issuer, setIssuer] = useState<IssuerDetails>(initialIssuer);
    const [documents, setDocuments] = useState<IssuerDocument[]>(initialDocuments);
    const [activeTab, setActiveTab] = useState('company');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<'approved' | 'rejected' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);
    const { user } = useAuth();
    const router = useRouter();
    const supabase = createClientComponentClient();

    const getStatusColor = (status: string | undefined) => {
        if (!status) return 'bg-gray-100 text-gray-800';
        
        const colors = {
            approved: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            rejected: 'bg-red-100 text-red-800'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const handleStatusChange = async (confirmed: boolean = false) => {
        if (!confirmed || !pendingStatus) {
            setShowConfirmDialog(false);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/issuers/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: pendingStatus,
                    ...(pendingStatus === 'rejected' ? { rejection_reason: rejectionReason } : {})
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update status');
            }

            const result = await response.json();

            // Update local state
            setIssuer(prev => ({
                ...prev,
                status: pendingStatus,
                ...(pendingStatus === 'rejected' ? { rejection_reason: rejectionReason } : {}),
                ...(result.isNewAdmin ? { admin_user_id: user?.id } : {})
            }));

            setNotification({
                type: 'success',
                message: `Issuer ${pendingStatus} successfully${result.isNewAdmin ? ' and you have been set as the admin' : ''}`
            });

            // Close dialog immediately
            setShowConfirmDialog(false);
            setPendingStatus(null);
            setRejectionReason('');

            // Navigate back after notification is shown
            setTimeout(() => {
                router.push('/dashboard/admin/issuers');
            }, 1500);

        } catch (err) {
            console.error('Error updating status:', err);
            setNotification({
                type: 'error',
                message: err instanceof Error ? err.message : 'Failed to update issuer status'
            });
            setShowConfirmDialog(false);
            setPendingStatus(null);
            setRejectionReason('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">{issuer.issuer_name}</h1>
                        <div className="flex items-center gap-4 mt-2">
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(issuer.status)}`}>
                                {issuer.status?.toUpperCase() || 'UNKNOWN'}
                            </span>
                            <span className="text-sm text-gray-500">
                                Submitted: {new Date(issuer.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Select
                            onValueChange={(value: 'approved' | 'rejected') => {
                                setPendingStatus(value);
                                setShowConfirmDialog(true);
                            }}
                        >
                            <SelectTrigger className="w-[180px] bg-white hover:bg-gray-50">
                                <SelectValue placeholder="Change status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="approved">Approve</SelectItem>
                                <SelectItem value="rejected">Reject</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('company')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'company'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Company Information
                    </button>
                    <button
                        onClick={() => setActiveTab('management')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'management'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Management
                    </button>
                    <button
                        onClick={() => setActiveTab('capital')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'capital'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Capital Structure
                    </button>
                    <button
                        onClick={() => setActiveTab('business')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'business'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Business Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('legal')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'legal'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Legal & Advisors
                    </button>
                    <button
                        onClick={() => setActiveTab('regulatory')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'regulatory'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Regulatory
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'documents'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Documents
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white shadow rounded-lg p-6">
                {activeTab === 'company' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField label="Company Name" value={issuer.issuer_name} />
                                <DataField label="Registration Number" value={issuer.company_registration_number} />
                                <DataField label="Incorporation Date" value={issuer.incorporation_date} />
                                <DataField label="Legal Structure" value={issuer.legal_structure} />
                                <DataField label="Country" value={issuer.country} />
                                <DataField label="Business Email" value={issuer.business_email} />
                                <DataField label="Phone Number" value={issuer.phone_number} />
                                <DataField label="Website" value={issuer.business_website} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Address</h3>
                            <DataField label="Registered Address" value={issuer.registered_address} fullWidth />
                        </div>
                    </div>
                )}

                {activeTab === 'management' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Chief Executive Officer</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField label="Name" value={issuer.chief_executiveofficer} />
                                <DataField label="Title" value={issuer.ceo_title} />
                                <DataField label="Nationality" value={issuer.ceo_nationality} />
                                <DataField label="Date of Birth" value={issuer.ceo_dob} />
                                <DataField label="Shares in Company" value={issuer.ceo_shares_in_the_co} />
                                <DataField label="Other Directorships" value={issuer.ceo_other_directorships} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Financial Director</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField label="Name" value={issuer.financial_director} />
                                <DataField label="Title" value={issuer.fd_title} />
                                <DataField label="Nationality" value={issuer.fd_nationality} />
                                <DataField label="Date of Birth" value={issuer.fd_dob} />
                                <DataField label="Shares in Company" value={issuer.fd_shares_in_the_co} />
                                <DataField label="Other Directorships" value={issuer.fd_other_directorships} />
                            </div>
                        </div>

                        {[3, 4, 5].map(num => {
                            const director = {
                                name: issuer[`director_${num}`],
                                title: issuer[`d${num}_title`],
                                nationality: issuer[`d${num}_nationality`],
                                dob: issuer[`d${num}_dob`],
                                shares: issuer[`d${num}_shares_in_the_co`],
                                directorships: issuer[`d${num}_other_directorships`]
                            };

                            if (director.name) {
                                return (
                                    <div key={num}>
                                        <h3 className="text-lg font-medium mb-4">Director {num}</h3>
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                            <DataField label="Name" value={director.name} />
                                            <DataField label="Title" value={director.title} />
                                            <DataField label="Nationality" value={director.nationality} />
                                            <DataField label="Date of Birth" value={director.dob} />
                                            <DataField label="Shares in Company" value={director.shares} />
                                            <DataField label="Other Directorships" value={director.directorships} />
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}

                {activeTab === 'capital' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Share Structure</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField 
                                    label="Nominal Share Price" 
                                    value={issuer.nominal_share_price} 
                                />
                                <DataField 
                                    label="Authorised Share Capital" 
                                    value={issuer.authorised_share_capital} 
                                />
                                <DataField 
                                    label="Shares in Issue" 
                                    value={issuer.shares_in_issue} 
                                />
                                <DataField 
                                    label="Pre-emption Rights" 
                                    value={issuer.preemption_rights} 
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Dividend Information</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField 
                                    label="Dividend Policy" 
                                    value={issuer.dividend_policy} 
                                />
                                <DataField 
                                    label="Next Dividend Date" 
                                    value={issuer.dividend_date_1} 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'business' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Business Overview</h3>
                            <div className="prose max-w-none">
                                <div className="bg-gray-50 rounded-lg p-6">
                                    <p className="text-gray-800 whitespace-pre-wrap">{issuer.business_overview}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Company Prospects</h3>
                            <div className="prose max-w-none">
                                <div className="bg-gray-50 rounded-lg p-6">
                                    <p className="text-gray-800 whitespace-pre-wrap">{issuer.company_prospects}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Recent Performance</h3>
                            <div className="prose max-w-none">
                                <div className="bg-gray-50 rounded-lg p-6">
                                    <p className="text-gray-800 whitespace-pre-wrap">{issuer.recent_performance}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'legal' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Legal Advisors</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField label="Name" value={issuer.legal_advisors_name} />
                                <DataField label="Address" value={issuer.legal_advisors_address} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Auditors</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField label="Name" value={issuer.auditors_name} />
                                <DataField label="Address" value={issuer.auditors_address} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Trustee</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField label="Name" value={issuer.trustee_name} />
                                <DataField label="Address" value={issuer.trustee_address} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Accountants</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField label="Name" value={issuer.accountant_name} />
                                <DataField label="Address" value={issuer.accountants_address} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Administrators</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField label="Name" value={issuer.administrators_name} />
                                <DataField label="Address" value={issuer.administrators_address} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Company Secretary</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField label="Name" value={issuer.company_secretary} />
                                <DataField label="Address" value={issuer.co_sec_address} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Exchange Sponsor</h3>
                            <DataField label="Name" value={issuer.exchange_sponsor} fullWidth />
                        </div>
                    </div>
                )}

                {activeTab === 'regulatory' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Regulatory Information</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <DataField 
                                    label="Has Regulators" 
                                    value={issuer.does_the_company_have_regulators ? 'Yes' : 'No'} 
                                />
                                {issuer.does_the_company_have_regulators && (
                                    <DataField 
                                        label="Number of Regulators" 
                                        value={issuer.number_of_regulators} 
                                    />
                                )}
                            </div>
                        </div>

                        {issuer.does_the_company_have_regulators && (
                            <div>
                                <h3 className="text-lg font-medium mb-4">Regulators</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {[1, 2, 3, 4].map(num => {
                                        const regulator = issuer[`regulator_${num}`];
                                        if (regulator) {
                                            return (
                                                <div key={num} className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-gray-900">{regulator}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Documents</h3>
                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { key: 'memorandum_articles', label: 'Memorandum & Articles', required: true },
                                    { key: 'director_cvs', label: 'Director CVs', required: true },
                                    { key: 'director_contracts', label: 'Director Contracts', required: true },
                                    { key: 'material_contracts', label: 'Material Contracts', required: true },
                                    { key: 'business_plan', label: 'Business Plan', required: true },
                                    { key: 'investment_deck', label: 'Investment Deck', required: true },
                                    { key: 'accounts', label: 'Accounts', required: true },
                                    { key: 'press_releases', label: 'Press Releases', required: false }
                                ].map(doc => {
                                    const document = documents.find(d => d.category === doc.key);
                                    return (
                                        <div key={doc.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-gray-900">{doc.label}</h4>
                                                <p className="text-sm text-gray-500">
                                                    {document ? document.file_name : 'No document uploaded'}
                                                </p>
                                            </div>
                                            {document && (
                                                <a
                                                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${document.file_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingStatus === 'approved' ? 'Approve Issuer' : 'Reject Issuer'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingStatus === 'approved' 
                                ? 'Are you sure you want to approve this issuer?'
                                : 'Please provide a reason for rejecting this issuer.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {pendingStatus === 'rejected' && (
                        <div className="py-4">
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full p-2 border rounded-md"
                                rows={3}
                                placeholder="Enter rejection reason..."
                            />
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white hover:bg-gray-50">Cancel</AlertDialogCancel>
                        <Button
                            variant={pendingStatus === 'approved' ? 'default' : 'destructive'}
                            onClick={() => handleStatusChange(true)}
                            disabled={loading || (pendingStatus === 'rejected' && !rejectionReason.trim())}
                        >
                            {loading ? 'Processing...' : `Confirm ${pendingStatus === 'approved' ? 'Approval' : 'Rejection'}`}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Notification */}
            {notification && (
                <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
                    notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
} 