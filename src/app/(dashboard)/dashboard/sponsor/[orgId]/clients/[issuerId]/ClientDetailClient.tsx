'use client';

// Keep necessary imports, remove status-change related ones if not needed elsewhere
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Keep if navigation is needed
import { useAuth } from '@/contexts/AuthContext'; // Keep for user context
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  User, 
  Calendar, 
  FileText, 
  CreditCard, 
  Shield, 
  BarChart, 
  Download, 
  Eye, 
  ExternalLink,
  ArrowLeft,
  Edit,
  Users,
  Plus,
  Target,
  Sparkles,
  Database,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Menu
} from 'lucide-react'; // Keep used icons
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSupabaseClient } from '@/lib/supabase/client'; // Keep for potential client-side actions
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
        <dt className="text-sm font-medium text-gray-500 mb-1">{label}</dt>
        <dd className="text-sm text-gray-900 break-words bg-white/50 rounded-lg p-3 border border-gray-200/50">
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
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    
    const { user } = useAuth(); // Keep user context if needed
    const router = useRouter(); // Keep router if navigation is needed
    const supabase = getSupabaseClient(); // Keep Supabase client if needed

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Auto-close sidebar on mobile
            if (mobile) {
                setSidebarOpen(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    /**
     * Determines the Tailwind CSS background and text color classes based on the issuer's status.
     * @param status - The status string (e.g., 'approved', 'pending').
     * @returns A string containing Tailwind classes for styling the status badge.
     */
    const getStatusColor = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'approved':
                return 'default';
            case 'pending':
                return 'secondary';
            case 'rejected':
                return 'destructive';
            case 'archived':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const tabs = [
        { key: 'company', label: 'Company Info', icon: Building2 },
        { key: 'management', label: 'Management', icon: Users },
        { key: 'capital', label: 'Capital', icon: CreditCard },
        { key: 'business', label: 'Overview', icon: BarChart },
        { key: 'legal', label: 'Legal', icon: Shield },
        { key: 'regulatory', label: 'Regulatory', icon: Settings },
        { key: 'documents', label: 'Documents', icon: FileText },
    ];

    // --- RENDER LOGIC --- (Adapted from IssuerDetailClient)
    return (
        <>
            <style jsx>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            
            {/* Header */}
            <div className="relative mb-6 md:mb-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                                {/* Back Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/dashboard/sponsor/${orgId}/clients`)}
                                    className="p-2 bg-white/50 border-gray-200/50 hover:bg-gray-50 rounded-lg min-w-[44px] h-11 flex-shrink-0"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                
                                <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                                    <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight">
                                        {issuer.issuer_name}
                                    </h1>
                                    <p className="text-gray-600 mt-1 text-sm sm:text-base">
                                        Registration: {issuer.company_registration_number || 'N/A'} • {issuer.country || 'Unknown'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Mobile Toggle Button */}
                            <div className="md:hidden">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    className="p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg min-w-[44px] h-11"
                                >
                                    {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        
                        {/* Status and Date */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Badge variant={getStatusColor(issuer.status)} className="text-xs sm:text-sm">
                                {issuer.status?.toUpperCase() || 'PENDING'}
                            </Badge>
                            <span className="text-xs sm:text-sm text-gray-500">
                                Created: {new Date(issuer.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 flex-1 min-h-0 relative">
                {/* Content Area */}
                <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col min-h-[600px]">
                    {/* Responsive Tabs */}
                    <div className="flex-shrink-0 border-b border-gray-200/50 bg-white/50">
                        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide p-4">
                            {tabs.map(tab => {
                                const IconComponent = tab.icon;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={cn(
                                            "flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-sm transition-all duration-300 whitespace-nowrap",
                                            activeTab === tab.key
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                        )}
                                    >
                                        <IconComponent className="h-4 w-4" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
                        {activeTab === 'company' && (
                            <div className="space-y-6 md:space-y-8">
                                {/* Basic Information Section */}
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                        Basic Information
                                    </h3>
                                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                        Address
                                    </h3>
                                    <dl>
                                        <DataField label="Registered Address" value={issuer.registered_address} fullWidth={true} />
                                    </dl>
                                </div>
                            </div>
                        )}

                        {activeTab === 'management' && (
                            <div className="space-y-6 md:space-y-8">
                                {/* CEO Section */}
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                        Chief Executive Officer
                                    </h3>
                                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                        Financial Director
                                    </h3>
                                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <DataField label="Name" value={issuer.financial_director} />
                                        <DataField label="Title" value={issuer.fd_title} />
                                        <DataField label="Nationality" value={issuer.fd_nationality} />
                                        <DataField label="Date of Birth" value={issuer.fd_dob ? new Date(issuer.fd_dob).toLocaleDateString() : 'N/A'} />
                                        <DataField label="Shares in Company" value={issuer.fd_shares_in_the_co} />
                                        <DataField label="Other Directorships" value={issuer.fd_other_directorships} />
                                    </dl>
                                </div>
                                {/* Other Directors */}
                                {issuer.director_3 && (
                                    <div>
                                        <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                            Director 3
                                        </h3>
                                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <DataField label="Name" value={issuer.director_3} />
                                            <DataField label="Title" value={issuer.d3_title} />
                                            <DataField label="Nationality" value={issuer.d3_nationality} />
                                            <DataField label="Date of Birth" value={issuer.d3_dob ? new Date(issuer.d3_dob).toLocaleDateString() : 'N/A'} />
                                            <DataField label="Shares in Company" value={issuer.d3_shares_in_the_co} />
                                            <DataField label="Other Directorships" value={issuer.d3_other_directorships} />
                                        </dl>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'capital' && (
                            <div>
                                <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                    Capital Structure
                                </h3>
                                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <DataField label="Nominal Share Price" value={issuer.nominal_share_price} />
                                    <DataField label="Authorised Share Capital" value={issuer.authorised_share_capital} />
                                    <DataField label="Shares in Issue" value={issuer.shares_in_issue} />
                                    <DataField label="Preemption Rights" value={issuer.preemption_rights} />
                                    <DataField label="Dividend Policy" value={issuer.dividend_policy} />
                                    <DataField label="Last Dividend Date" value={issuer.dividend_date_1 ? new Date(issuer.dividend_date_1).toLocaleDateString() : 'N/A'} />
                                    <DataField label="A Class Nominal Value" value={issuer.a_class_shares_nominal_val} />
                                    <DataField label="A Class Shares in Issue" value={issuer.a_class_shares_in_issue} />
                                    <DataField label="B Class Nominal Value" value={issuer.b_class_shares_nominal_val} />
                                    <DataField label="B Class Shares in Issue" value={issuer.b_class_shares_in_issue} />
                                </dl>
                            </div>
                        )}

                        {activeTab === 'business' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                        Business Overview
                                    </h3>
                                    <div className="bg-white/50 rounded-lg p-4 border border-gray-200/50">
                                        <p className="text-sm text-gray-700 leading-relaxed">{issuer.business_overview || 'N/A'}</p>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                        Company Prospects
                                    </h3>
                                    <div className="bg-white/50 rounded-lg p-4 border border-gray-200/50">
                                        <p className="text-sm text-gray-700 leading-relaxed">{issuer.company_prospects || 'N/A'}</p>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                        Recent Performance
                                    </h3>
                                    <div className="bg-white/50 rounded-lg p-4 border border-gray-200/50">
                                        <p className="text-sm text-gray-700 leading-relaxed">{issuer.recent_performance || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'legal' && (
                            <div className="space-y-6 md:space-y-8">
                                {/* Legal Advisors */}
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                        Legal Advisors
                                    </h3>
                                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <DataField label="Name" value={issuer.legal_advisors_name} />
                                        <DataField label="Address" value={issuer.legal_advisors_address} fullWidth={true}/>
                                    </dl>
                                </div>
                                {/* Auditors */}
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                        Auditors
                                    </h3>
                                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <DataField label="Name" value={issuer.auditors_name} />
                                        <DataField label="Address" value={issuer.auditors_address} fullWidth={true}/>
                                    </dl>
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                        Company Secretary
                                    </h3>
                                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <DataField label="Name" value={issuer.company_secretary} />
                                        <DataField label="Address" value={issuer.co_sec_address} fullWidth={true}/>
                                    </dl>
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                        Exchange Sponsor
                                    </h3>
                                    <DataField label="Name" value={issuer.exchange_sponsor} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'regulatory' && (
                            <div>
                                <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                    Regulatory Information
                                </h3>
                                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                    Associated Documents
                                </h3>
                                {documents.length > 0 ? (
                                    <div className="space-y-3">
                                        {documents.map(doc => (
                                            <div key={doc.id} className="bg-white/50 rounded-lg p-4 border border-gray-200/50 hover:bg-white/70 transition-all duration-300">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                        <div className="p-2 bg-blue-100 rounded-lg">
                                                            <FileText className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name || 'Unnamed Document'}</p>
                                                            <p className="text-xs text-gray-500">Category: {doc.category || 'Uncategorized'} • Uploaded: {new Date(doc.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <Button variant="outline" size="sm" className="ml-3">
                                                        <Download className="h-4 w-4 mr-1"/> 
                                                        Download
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
                                        <p className="text-gray-500">No documents have been uploaded for this client yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className={cn(
                    "bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col transition-all duration-300",
                    // Mobile: Full screen overlay
                    isMobile ? cn(
                        "fixed inset-0 z-50 m-4",
                        sidebarOpen ? "translate-x-0" : "translate-x-full"
                    ) : cn(
                        // Desktop: Sidebar
                        "min-h-[600px]",
                        sidebarOpen ? "w-80" : "w-16"
                    )
                )}>
                    {/* Sidebar Header */}
                    <div className="flex-shrink-0 p-4 border-b border-gray-200/50 flex items-center justify-between bg-white/50">
                        {sidebarOpen && (
                            <h2 className="font-semibold text-gray-900 text-lg truncate mr-2 min-w-0">Quick Actions</h2>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={cn(
                                "p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg touch-manipulation flex-shrink-0 min-w-[44px] h-11",
                                !sidebarOpen && "ml-auto"
                            )}
                        >
                            {isMobile ? (
                                <X className="h-4 w-4" />
                            ) : sidebarOpen ? (
                                <ChevronRight className="h-4 w-4" />
                            ) : (
                                <ChevronLeft className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {/* Sidebar Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                        {sidebarOpen ? (
                            <>
                                {/* CLIENT ACTIONS Section */}
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">CLIENT ACTIONS</h3>
                                    <div className="space-y-2">
                                        <Button 
                                            className="w-full justify-start bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 h-auto p-4"
                                            onClick={() => router.push(`/dashboard/sponsor/${orgId}/clients/${issuerId}/edit`)}
                                        >
                                            <div className="flex items-center space-x-3 w-full">
                                                <div className="p-2 bg-white/20 rounded-lg">
                                                    <Edit className="h-5 w-5" />
                                                </div>
                                                <div className="text-left flex-1">
                                                    <div className="font-medium">Edit Client</div>
                                                    <div className="text-xs opacity-90">Update client information</div>
                                                </div>
                                            </div>
                                        </Button>
                                        
                                        <Button 
                                            variant="outline" 
                                            className="w-full justify-start h-auto p-3 border-gray-200 hover:bg-gray-50"
                                            onClick={() => router.push(`/dashboard/sponsor/${orgId}/clients/${issuerId}/documents`)}
                                        >
                                            <FileText className="h-4 w-4 mr-3" />
                                            <div className="text-left">
                                                <div className="font-medium text-sm">Manage Documents</div>
                                                <div className="text-xs text-gray-500">Upload and organize files</div>
                                            </div>
                                        </Button>
                                        
                                        <Button variant="outline" className="w-full justify-start h-auto p-3 border-gray-200 hover:bg-gray-50">
                                            <Sparkles className="h-4 w-4 mr-3" />
                                            <div className="text-left">
                                                <div className="font-medium text-sm">Generate Document</div>
                                                <div className="text-xs text-gray-500">Create with AI</div>
                                            </div>
                                        </Button>
                                    </div>
                                </div>

                                {/* CREATE Section */}
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">CREATE</h3>
                                    <div className="space-y-2">
                                        <Link href={`/dashboard/sponsor/${orgId}/new-listing`}>
                                            <Button variant="outline" className="w-full justify-start h-auto p-3 border-gray-200 hover:bg-gray-50">
                                                <Plus className="h-4 w-4 mr-3" />
                                                <div className="text-left">
                                                    <div className="font-medium text-sm">New Listing</div>
                                                    <div className="text-xs text-gray-500">Create exchange listing</div>
                                                </div>
                                            </Button>
                                        </Link>
                                        
                                        <Button variant="outline" className="w-full justify-start h-auto p-3 border-gray-200 hover:bg-gray-50">
                                            <Target className="h-4 w-4 mr-3" />
                                            <div className="text-left">
                                                <div className="font-medium text-sm">Create Token</div>
                                                <div className="text-xs text-gray-500">Deploy new token</div>
                                            </div>
                                        </Button>
                                    </div>
                                </div>

                                {/* NAVIGATE Section */}
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">NAVIGATE</h3>
                                    <div className="space-y-1">
                                        <Link href={`/dashboard/sponsor/${orgId}/clients`}>
                                            <Button variant="ghost" className="w-full justify-start hover:bg-gray-50">
                                                <Users className="h-4 w-4 mr-3" />
                                                Deal Center
                                            </Button>
                                        </Link>
                                        
                                        <Link href={`/dashboard/sponsor/${orgId}/knowledge-vault`}>
                                            <Button variant="ghost" className="w-full justify-start hover:bg-gray-50">
                                                <Database className="h-4 w-4 mr-3" />
                                                Knowledge Vault
                                            </Button>
                                        </Link>
                                        
                                        <Link href={`/dashboard/sponsor/${orgId}/tools`}>
                                            <Button variant="ghost" className="w-full justify-start hover:bg-gray-50">
                                                <Sparkles className="h-4 w-4 mr-3" />
                                                Agent Center
                                            </Button>
                                        </Link>
                                        
                                        <Link href={`/dashboard/sponsor/${orgId}/analytics`}>
                                            <Button variant="ghost" className="w-full justify-start hover:bg-gray-50">
                                                <BarChart3 className="h-4 w-4 mr-3" />
                                                Analytics
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // Collapsed sidebar icons
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                                        <Edit className="h-5 w-5 text-blue-600 mx-auto" />
                                    </div>
                                    <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                                        <FileText className="h-5 w-5 text-gray-600 mx-auto" />
                                    </div>
                                    <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                                        <Sparkles className="h-5 w-5 text-gray-600 mx-auto" />
                                    </div>
                                </div>
                                
                                <div className="border-t border-gray-200 pt-4 space-y-2">
                                    <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                                        <Plus className="h-5 w-5 text-gray-600 mx-auto" />
                                    </div>
                                    <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                                        <Target className="h-5 w-5 text-gray-600 mx-auto" />
                                    </div>
                                </div>
                                
                                <div className="border-t border-gray-200 pt-4 space-y-2">
                                    <div className="p-2 bg-blue-50 rounded-lg cursor-pointer">
                                        <Users className="h-5 w-5 text-blue-600 mx-auto" />
                                    </div>
                                    <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                                        <Database className="h-5 w-5 text-gray-600 mx-auto" />
                                    </div>
                                    <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                                        <Sparkles className="h-5 w-5 text-gray-600 mx-auto" />
                                    </div>
                                    <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                                        <BarChart3 className="h-5 w-5 text-gray-600 mx-auto" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Overlay Background */}
                {isMobile && sidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </div>
        </>
    );
} 