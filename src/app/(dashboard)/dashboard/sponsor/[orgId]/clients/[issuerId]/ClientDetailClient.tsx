'use client';

// Keep necessary imports, remove status-change related ones if not needed elsewhere
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Keep if navigation is needed
import { useAuth } from '@/contexts/AuthContext'; // Keep for user context
import { Building2, Mail, Phone, Globe, User, Calendar, FileText, CreditCard, Shield, BarChart, Download, Eye, ExternalLink } from 'lucide-react'; // Keep used icons
import { Button } from "@/components/ui/button";
// Remove Select imports if only used for status change
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Remove AlertDialog imports if only used for status change confirmation
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import type { Database } from '@/types/supabase'; // Assuming Database types are defined here
import { getSupabaseClient } from '@/lib/supabase/client'; // Keep for potential client-side actions

/**
 * Interface representing the detailed data structure for an Issuer.
 * Matches the columns fetched from the 'issuers' table.
 */
interface IssuerDetails {
    id: string;
    issuer_name: string;
    company_registration_number: string | null;
    incorporation_date: string | null;
    legal_structure: string | null;
    country: string | null;
    business_email: string | null;
    phone_number: string | null;
    business_website: string | null;
    registered_address: string | null;
    chief_executiveofficer: string | null;
    ceo_title: string | null;
    ceo_nationality: string | null;
    ceo_dob: string | null;
    ceo_shares_in_the_co: string | null;
    ceo_other_directorships: string | null;
    financial_director: string | null;
    fd_title: string | null;
    fd_nationality: string | null;
    fd_dob: string | null;
    fd_shares_in_the_co: string | null;
    fd_other_directorships: string | null;
    [key: string]: any; // Keep for dynamic director fields if structure is complex
    nominal_share_price: string | null;
    authorised_share_capital: string | null;
    shares_in_issue: string | null;
    preemption_rights: string | null;
    dividend_policy: string | null;
    dividend_date_1: string | null;
    business_overview: string | null;
    company_prospects: string | null;
    recent_performance: string | null;
    legal_advisors_name: string | null;
    legal_advisors_address: string | null;
    auditors_name: string | null;
    auditors_address: string | null;
    trustee_name: string | null;
    trustee_address: string | null;
    accountant_name: string | null;
    accountants_address: string | null;
    administrators_name: string | null;
    administrators_address: string | null;
    company_secretary: string | null;
    co_sec_address: string | null;
    exchange_sponsor: string | null;
    does_the_company_have_regulators: boolean | null;
    number_of_regulators?: string | null; // Make optional if not always present
    status: string | null;
    created_at: string;
}

/**
 * Interface representing the structure of an associated document for an Issuer.
 * Matches columns from the 'issuer_documents' table.
 */
interface IssuerDocument {
    id: string;
    issuer_id: string;
    category: string | null;
    file_name: string | null;
    file_path: string | null;
    content_type: string | null;
    file_type: string | null;
    created_at: string;
}

/**
 * Props for the ClientDetailClient component.
 */
interface ClientDetailClientProps {
    /** The initial issuer data fetched by the server component. */
    initialIssuer: IssuerDetails;
    /** The initial list of documents fetched by the server component. */
    initialDocuments: IssuerDocument[];
    /** The organization ID of the viewing sponsor. */
    orgId: string;
    /** The ID of the issuer being displayed. */
    issuerId: string;
}

/**
 * Props for the DataField utility component.
 */
interface DataFieldProps {
    /** The label to display for the data field. */
    label: string;
    /** The value to display. Null/undefined values are handled. */
    value: string | number | boolean | null | undefined;
    /** If true, the field spans two columns in the grid layout. */
    fullWidth?: boolean;
}

/**
 * A reusable component to display a label and value pair, handling empty states.
 */
const DataField = ({ label, value, fullWidth = false }: DataFieldProps) => (
    <div className={fullWidth ? 'col-span-2' : ''}>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        {/* Ensure value is treated as string or provide placeholder */}
        <dd className="mt-1 text-sm text-gray-900 break-words">
            {value !== null && value !== undefined && value !== '' ? String(value) : 'N/A'}
        </dd>
    </div>
);

// Rename the component
export default function ClientDetailClient({ initialIssuer, initialDocuments, orgId, issuerId }: ClientDetailClientProps) {
    // Use initialIssuer directly, no local state needed if view is read-only
    const issuer = initialIssuer;
    const documents = initialDocuments;
    const [activeTab, setActiveTab] = useState('company');
    // Remove state related to status change
    // const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    // const [pendingStatus, setPendingStatus] = useState<string | null>(null);
    // const [rejectionReason, setRejectionReason] = useState('');
    // const [loading, setLoading] = useState(false);
    // const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string; } | null>(null);
    const { user } = useAuth(); // Keep user context if needed
    const router = useRouter(); // Keep router if navigation is needed
    const supabase = getSupabaseClient(); // Keep Supabase client if needed

    /**
     * Determines the Tailwind CSS background and text color classes based on the issuer's status.
     * @param status - The status string (e.g., 'approved', 'pending').
     * @returns A string containing Tailwind classes for styling the status badge.
     */
    const getStatusColor = (status: string | null | undefined) => {
        if (!status) return 'bg-gray-100 text-gray-800';
        const colors = {
            approved: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            rejected: 'bg-red-100 text-red-800',
            archived: 'bg-blue-100 text-blue-800' // Added archived status styling
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    // Remove handleStatusChange function entirely

    // --- RENDER LOGIC --- (Adapted from IssuerDetailClient)
    return (
        <div className="space-y-4 md:space-y-6">
            {/* Responsive Header */}
            <div className="bg-white shadow rounded-lg p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        {/* Responsive Title */}
                        <h1 className="text-xl md:text-2xl font-bold">{issuer.issuer_name}</h1>
                        <div className="flex items-center gap-2 sm:gap-4 mt-2">
                            <span className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${getStatusColor(issuer.status)}`}>
                                {issuer.status?.toUpperCase() || 'UNKNOWN'}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-500">
                                Submitted: {new Date(issuer.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Responsive Tabs */}
            <div className="border-b border-gray-200">
                {/* Reduced space on mobile, maintain overflow */}
                <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {[
                        { key: 'company', label: 'Company Info' }, // Shortened label
                        { key: 'management', label: 'Management' },
                        { key: 'capital', label: 'Capital' }, // Shortened label
                        { key: 'business', label: 'Overview' }, // Shortened label
                        { key: 'legal', label: 'Legal' }, // Shortened label
                        { key: 'regulatory', label: 'Regulatory' },
                        { key: 'documents', label: 'Documents' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.key
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content - Apply responsive grid to relevant sections */}
            <div className="bg-white shadow rounded-lg p-4 md:p-6">
                {activeTab === 'company' && (
                    <div className="space-y-6 md:space-y-8">
                        {/* Basic Information Section - Responsive Grid */}
                        <div>
                            <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Basic Information</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <DataField label="Company Name" value={issuer.issuer_name} />
                                <DataField label="Registration Number" value={issuer.company_registration_number} />
                                <DataField label="Incorporation Date" value={issuer.incorporation_date ? new Date(issuer.incorporation_date).toLocaleDateString() : 'N/A'} />
                                <DataField label="Legal Structure" value={issuer.legal_structure} />
                                <DataField label="Country" value={issuer.country} />
                                <DataField label="Business Email" value={issuer.business_email} />
                                <DataField label="Phone Number" value={issuer.phone_number} />
                                <DataField label="Website" value={issuer.business_website} />
                            </dl>
                        </div>
                         {/* Address Section */}
                        <div>
                            <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Address</h3>
                            <dl>
                                <DataField label="Registered Address" value={issuer.registered_address} fullWidth={true} />
                            </dl>
                        </div>
                    </div>
                )}

                {activeTab === 'management' && (
                    <div className="space-y-6 md:space-y-8">
                        {/* CEO Section - Responsive Grid */}
                        <div>
                             <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Chief Executive Officer</h3>
                             <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <DataField label="Name" value={issuer.chief_executiveofficer} />
                                <DataField label="Title" value={issuer.ceo_title} />
                                <DataField label="Nationality" value={issuer.ceo_nationality} />
                                <DataField label="Date of Birth" value={issuer.ceo_dob ? new Date(issuer.ceo_dob).toLocaleDateString() : 'N/A'} />
                                <DataField label="Shares in Company" value={issuer.ceo_shares_in_the_co} />
                                <DataField label="Other Directorships" value={issuer.ceo_other_directorships} />
                             </dl>
                        </div>
                        {/* Financial Director Section */}
                        <div>
                             <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Financial Director</h3>
                             <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <DataField label="Name" value={issuer.financial_director} />
                                <DataField label="Title" value={issuer.fd_title} />
                                <DataField label="Nationality" value={issuer.fd_nationality} />
                                <DataField label="Date of Birth" value={issuer.fd_dob ? new Date(issuer.fd_dob).toLocaleDateString() : 'N/A'} />
                                <DataField label="Shares in Company" value={issuer.fd_shares_in_the_co} />
                                <DataField label="Other Directorships" value={issuer.fd_other_directorships} />
                            </dl>
                        </div>
                         {/* Other Directors (Example for Director 3) - Extend dynamically if needed */}
                         {issuer.director_3 && (
                            <div>
                                <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Director 3</h3>
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                    <DataField label="Name" value={issuer.director_3} />
                                    <DataField label="Title" value={issuer.d3_title} />
                                    <DataField label="Nationality" value={issuer.d3_nationality} />
                                    <DataField label="Date of Birth" value={issuer.d3_dob ? new Date(issuer.d3_dob).toLocaleDateString() : 'N/A'} />
                                    <DataField label="Shares in Company" value={issuer.d3_shares_in_the_co} />
                                    <DataField label="Other Directorships" value={issuer.d3_other_directorships} />
                                </dl>
                            </div>
                        )}
                        {/* Add similar blocks for director_4, director_5 if they exist */} 
                    </div>
                )}

                {activeTab === 'capital' && (
                     <div>
                        <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Capital Structure</h3>
                         <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                            <DataField label="Nominal Share Price" value={issuer.nominal_share_price} />
                            <DataField label="Authorised Share Capital" value={issuer.authorised_share_capital} />
                            <DataField label="Shares in Issue" value={issuer.shares_in_issue} />
                            <DataField label="Preemption Rights" value={issuer.preemption_rights} />
                            <DataField label="Dividend Policy" value={issuer.dividend_policy} />
                            <DataField label="Last Dividend Date" value={issuer.dividend_date_1 ? new Date(issuer.dividend_date_1).toLocaleDateString() : 'N/A'} />
                            {/* Add A/B/C/D class shares if needed */} 
                            <DataField label="A Class Nominal Value" value={issuer.a_class_shares_nominal_val} />
                            <DataField label="A Class Shares in Issue" value={issuer.a_class_shares_in_issue} />
                            <DataField label="B Class Nominal Value" value={issuer.b_class_shares_nominal_val} />
                            <DataField label="B Class Shares in Issue" value={issuer.b_class_shares_in_issue} />
                        </dl>
                    </div>
                )}

                {activeTab === 'business' && (
                    <div>
                        <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Business Overview</h3>
                        <div className="prose max-w-none text-sm text-gray-700">
                            <p>{issuer.business_overview || 'N/A'}</p>
                        </div>
                         <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mt-3 md:mt-4 mb-3 md:mb-4">Company Prospects</h3>
                        <div className="prose max-w-none text-sm text-gray-700">
                            <p>{issuer.company_prospects || 'N/A'}</p>
                        </div>
                         <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mt-3 md:mt-4 mb-3 md:mb-4">Recent Performance</h3>
                        <div className="prose max-w-none text-sm text-gray-700">
                            <p>{issuer.recent_performance || 'N/A'}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'legal' && (
                    <div className="space-y-6 md:space-y-8">
                         {/* Legal Advisors */}
                        <div>
                             <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Legal Advisors</h3>
                             <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <DataField label="Name" value={issuer.legal_advisors_name} />
                                <DataField label="Address" value={issuer.legal_advisors_address} fullWidth={true}/>
                            </dl>
                        </div>
                         {/* Auditors */}
                        <div>
                             <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Auditors</h3>
                             <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <DataField label="Name" value={issuer.auditors_name} />
                                <DataField label="Address" value={issuer.auditors_address} fullWidth={true}/>
                            </dl>
                        </div>
                        {/* Trustee, Accountant, Administrators, Company Secretary sections */}
                        {/* ... Add similar dl blocks for these roles ... */}
                        <div>
                             <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Company Secretary</h3>
                             <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <DataField label="Name" value={issuer.company_secretary} />
                                <DataField label="Address" value={issuer.co_sec_address} fullWidth={true}/>
                            </dl>
                        </div>
                         <div>
                             <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Exchange Sponsor</h3>
                             <DataField label="Name" value={issuer.exchange_sponsor} />
                        </div>
                    </div>
                )}

                 {activeTab === 'regulatory' && (
                    <div>
                        <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Regulatory Information</h3>
                         <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                             <DataField label="Regulated Company?" value={issuer.does_the_company_have_regulators ? 'Yes' : 'No'} />
                            {issuer.does_the_company_have_regulators && (
                                <>
                                    <DataField label="Regulator 1" value={issuer.regulator_1} />
                                    <DataField label="Regulator 2" value={issuer.regulator_2} />
                                    <DataField label="Regulator 3" value={issuer.regulator_3} />
                                    <DataField label="Regulator 4" value={issuer.regulator_4} />
                                </>
                            )}
                        </dl>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div>
                        <h3 className="text-base md:text-lg font-semibold leading-6 text-gray-900 mb-3 md:mb-4">Associated Documents</h3>
                        {documents.length > 0 ? (
                             <ul className="divide-y divide-gray-200">
                                {documents.map(doc => (
                                    <li key={doc.id} className="py-4 flex justify-between items-center">
                                        <div className="flex items-center space-x-3">
                                            <FileText className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name || 'Unnamed Document'}</p>
                                                <p className="text-sm text-gray-500">Category: {doc.category || 'Uncategorized'} - Uploaded: {new Date(doc.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        {/* Add Download/View logic if needed - requires signed URLs potentially */}
                                        {/* Example: <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1"/> Download</Button> */}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500">No documents found for this client.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Remove AlertDialog for status change confirmation */}
        </div>
    );
} 