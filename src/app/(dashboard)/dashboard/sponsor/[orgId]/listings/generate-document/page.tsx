'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, Check, Send, User2, MessageSquare, Lock, Unlock, RotateCcw, Save, Search } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { DATABASE_TABLES } from '@/lib/constants/database';
import './styles.css';
import { getSupabaseClient } from '@/lib/supabase/client';

interface Section {
    id: string;
    title: string;
    content: string;
    status: 'pending' | 'generating' | 'completed' | 'locked';
    isLocked: boolean;
    complianceNotes: string;
    complianceApproved: boolean;
}

interface DirectListingPrompt {
    id: number;
    section_name: string;
    sec1prompt_title?: string;
    sec1prompt_warning?: string;
    sec1prompt_listingparticulars?: string;
    sec1prompt_generalinfo?: string;
    sec1prompt_corporateadvisors?: string;
    sec1prompt_forwardlooking_statements?: string;
    sec1prompt_boardofdirectors?: string;
    sec1prompt_salientpoints?: string;
    sec1prompt_purposeoflisting?: string;
    sec1prompt_plansafterlisting?: string;
    sec2prompt_title?: string;
    sec3prompt_title?: string;
    sec4prompt_title?: string;
    sec5prompt_title?: string;
    sec6prompt_title?: string;
    [key: string]: string | number | undefined;
}

interface ListingDocumentContent {
    [key: string]: string;
}

// Add this interface to define the mapping
interface FieldMapping {
    uiTitle: string;
    dbField: string;
}

interface ListingDocument {
    instrumentid: string;
    created_at: string;
    updated_at: string;
    [key: string]: string;  // Index signature for dynamic fields
}

export default function GenerateListingDocumentPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const params = useParams();
    const orgId = params?.orgId as string;
    const supabase = useMemo(() => getSupabaseClient(), []);

    // Add session management state
    const [isInitialized, setIsInitialized] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<'active' | 'expired' | 'refreshing'>('refreshing');
    const [sessionError, setSessionError] = useState<string | null>(null);

    const [selectedAssistant, setSelectedAssistant] = useState('Equity Listing Direct List');
    const [selectedListing, setSelectedListing] = useState('');
    const [listings, setListings] = useState<Array<{ 
        instrumentid: string;
        instrumentname: string;
        instrumentissuerid: string;
        instrumentissuername: string;
    }>>([]);
    const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [inputMessage, setInputMessage] = useState('');
    const [messages, setMessages] = useState<Array<{ type: 'user' | 'assistant', content: string }>>([]);
    const [sectionTitle, setSectionTitle] = useState<string>('');
    const [sectionFields, setSectionFields] = useState<string[]>([]);
    const [sectionContent, setSectionContent] = useState<ListingDocumentContent | null>(null);
    const [prompts, setPrompts] = useState<DirectListingPrompt[]>([]);

    // Section state management
    const [sections, setSections] = useState<Section[]>([
        { id: '1', title: 'Warning Notice', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '2', title: 'Listing Particulars', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '3', title: 'General Information', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '4', title: 'Corporate Advisors', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '5', title: 'Forward Looking Statements', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '6', title: 'Board of Directors', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '7', title: 'Salient Points', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '8', title: 'Purpose of Listing', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '9', title: 'Plans After Listing', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
    ]);

    const [currentSectionTitles, setCurrentSectionTitles] = useState<Section[]>([]);

    // Initialize session on mount
    useEffect(() => {
        let mounted = true;
        let refreshTimer: NodeJS.Timeout;

        const initializeSession = async () => {
            try {
                // Get current session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) throw sessionError;

                if (!session) {
                    // No session exists, try to refresh
                    const { data: { session: refreshedSession }, error: refreshError } = 
                        await supabase.auth.refreshSession();
                    
                    if (refreshError) {
                        console.error('Session refresh error:', refreshError);
                        if (mounted) {
                            setSessionStatus('expired');
                            setSessionError('Session refresh failed');
                router.push('/sign-in');
                        }
                        return;
                    }
                    
                    if (!refreshedSession) {
                        if (mounted) {
                            setSessionStatus('expired');
                            setSessionError('No active session found');
                            router.push('/sign-in');
                        }
                        return;
                    }

                    // Set up periodic refresh
                    refreshTimer = setInterval(async () => {
                        try {
                            const { data: { session }, error } = await supabase.auth.refreshSession();
                            if (error || !session) {
                                console.error('Periodic refresh failed:', error);
                                clearInterval(refreshTimer);
                                if (mounted) {
                                    setSessionStatus('expired');
                                    router.push('/sign-in');
                                }
                            }
                        } catch (e) {
                            console.error('Refresh timer error:', e);
                        }
                    }, 5 * 60 * 1000); // Refresh every 5 minutes
                }

                // Try to restore state from localStorage if available
                if (mounted) {
                    try {
                        const savedState = localStorage.getItem(`generate-document-state-${orgId}`);
                        if (savedState) {
                            const { selectedListing, selectedSection, sectionContent } = JSON.parse(savedState);
                            setSelectedListing(selectedListing || '');
                            setSelectedSection(selectedSection || '');
                            setSectionContent(sectionContent || null);
                        }
                    } catch (e) {
                        console.error('Error restoring state:', e);
                    }

                    setSessionStatus('active');
                    setSessionError(null);
                    setIsInitialized(true);
                }
            } catch (error) {
                console.error('Session initialization error:', error);
                if (mounted) {
                    setSessionStatus('expired');
                    setSessionError(error instanceof Error ? error.message : 'Session initialization failed');
                    router.push('/sign-in');
                }
            }
        };

        initializeSession();

        // Set up session change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setSessionStatus('expired');
                    setSessionError('User signed out');
                    clearInterval(refreshTimer);
                }
                router.push('/sign-in');
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (mounted) {
                    setSessionStatus('active');
                    setSessionError(null);
                }
            }
        });

        // Save state before unload
        const handleBeforeUnload = () => {
            try {
                const stateToSave = {
                    selectedListing,
                    selectedSection,
                    sectionContent
                };
                localStorage.setItem(`generate-document-state-${orgId}`, JSON.stringify(stateToSave));
            } catch (e) {
                console.error('Error saving state:', e);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup function
        return () => {
            mounted = false;
            clearInterval(refreshTimer);
            subscription.unsubscribe();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [router, supabase.auth, orgId, selectedListing, selectedSection, sectionContent]);

    // Add session check before any data operations
    const checkSession = async () => {
        if (!isInitialized) {
            throw new Error('Session not initialized');
        }

        if (sessionStatus === 'expired') {
            throw new Error('Session expired');
        }

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) throw sessionError;
            
            if (!session) {
                const { data: { session: refreshedSession }, error: refreshError } = 
                    await supabase.auth.refreshSession();
                
                if (refreshError || !refreshedSession) {
                    setSessionStatus('expired');
                    throw new Error('Session expired and refresh failed');
                }
                return refreshedSession;
            }

            return session;
        } catch (error) {
            console.error('Session check error:', error);
            setSessionStatus('expired');
            router.push('/sign-in');
            throw new Error('Session check failed');
        }
    };

    // Only fetch listings when dropdown is opened
    const fetchListings = async () => {
        if (!orgId || listings.length > 0) return; // Don't fetch if we already have listings

        try {
            const { data, error } = await supabase
                .from('listing')
                .select(`
                    instrumentid,
                    instrumentname,
                    instrumentissuerid,
                    instrumentissuername,
                    instrumentsponsorid
                `)
                .eq('instrumentsponsorid', orgId)
                .order('instrumentname');

            if (error) throw error;
            setListings(data || []);
        } catch (error) {
            console.error('Error fetching listings:', error);
        }
    };

    // Update the listing select dropdown to fetch on focus
    const renderListingSelect = () => (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Choose a Listing
            </label>
            <select
                value={selectedListing}
                onFocus={fetchListings}
                onChange={async (e) => {
                    const newListing = e.target.value;
                    
                    if (!newListing) {
                        setSectionContent(null);
                        setSelectedListing('');
                        return;
                    }

                    setSelectedListing(newListing);

                    try {
                        const { data, error } = await supabase
                            .from('listingdocumentdirectlisting')
                            .select('*')
                            .eq('instrumentid', newListing)
                            .single();

                        if (error) {
                            console.error('Error fetching listing content:', error);
                            return;
                        }

                        const content = data || {
                            instrumentid: newListing,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };

                        setSectionContent(content);

                    } catch (err) {
                        console.error('Error in listing selection:', err);
                    }
                }}
                className="block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg appearance-none"
            >
                <option value="">Select a listing...</option>
                {listings.map((listing) => (
                    <option key={listing.instrumentid} value={listing.instrumentid}>
                        {listing.instrumentname}
                    </option>
                ))}
            </select>
        </div>
    );

    // Helper function to get fields for each section
    const getSectionFields = (sectionNumber: string): string[] => {
        switch (sectionNumber) {
            case '1':
                return [
                    'sec1_issuer_name',
                    'sec1_status',
                    'sec1_documentname',
                    'sec1_warning',
                    'sec1_listingparticulars',
                    'sec1_generalinfo',
                    'sec1_corporateadvisors',
                    'sec1_forwardlooking_statements',
                    'sec1_boardofdirectors',
                    'sec1_salientpoints',
                    'sec1_purposeoflisting',
                    'sec1_plansafterlisting'
                ];
            case '2':
                return [
                    'sec2_title',
                    'sec2_status',
                    'sec2_tableofcontents',
                    'sec2_importantdatestimes',
                    'sec2_generalrequirements',
                    'sec2_responsibleperson',
                    'sec2_securitiesparticulars',
                    'sec2_securitiestowhichthisrelates'
                ];
            case '3':
                return [
                    'sec3_status',
                    'sec3_generalinfoissuer',
                    'sec3_issuerprinpactivities',
                    'sec3_issuerfinanposition',
                    'sec3_issuersadministration_and_man',
                    'sec3_recentdevelopments',
                    'sec3_financialstatements'
                ];
            case '4':
                return [
                    'sec4_status',
                    'sec4_riskfactors1',
                    'sec4_riskfactors2',
                    'sec4_riskfactors3',
                    'sec4_riskfactors4',
                    'sec4_risks5',
                    'sec4_risks6',
                    'sec4_risks7',
                    'sec4_risks8',
                    'sec4_risks9',
                    'sec4_risks10',
                    'sec4_risks11',
                    'sec4_risks12',
                    'sec4_risks13',
                    'sec4_risks14',
                    'sec4_risks15',
                    'sec4_risks16'
                ];
            case '5':
                return [
                    'sec5_status',
                    'sec5_informaboutsecurts1',
                    'sec5_informaboutsecurts2',
                    'sec5_informaboutsecurts3',
                    'sec5_informaboutsecurts4',
                    'sec5_informaboutsecurts5',
                    'sec5_informaboutsecurts6',
                    'sec5_costs'
                ];
            case '6':
                return [
                    'sec6_title',
                    'sec6_exchange',
                    'sec6_sponsoradvisorfees',
                    'sec6_accountingandlegalfees',
                    'sec6_merjlistingapplication1styearfees',
                    'sec6_marketingcosts',
                    'sec6_annualfees',
                    'sec6_commissionforsubscription',
                    'sec6_payingagent',
                    'sec6_listingdocuments',
                    'sec6_complianceapproved'
                ];
            default:
                return [];
        }
    };

    // URL params effect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sectionParam = params.get('section');

        if (sectionParam && sectionParam !== selectedSection) {
            setSelectedSection(sectionParam);
            setSectionTitle(sections.find(s => s.id === sectionParam)?.title || `Section ${sectionParam}`);
            setSectionFields(getSectionFields(sectionParam));
        }
    }, [listings, selectedSection, sections]);

    // Helper function to get a human-readable label for a field
    const getFieldLabel = useCallback((field: string): string => {
        // Remove the sec{N}_ prefix
        const cleanField = field.replace(/^sec\d+_/, '');
        
        // Special cases for specific fields
        const specialCases: Record<string, string> = {
            'issuer_name': 'Name of Issuing Company',
            'status': 'Status',
            'documentname': 'Document Name',
            'warning': 'Warning Notice',
            'listingparticulars': 'Listing Particulars',
            'generalinfo': 'General Information',
            'corporateadvisors': 'Corporate Advisors',
            'forwardlooking_statements': 'Forward Looking Statements',
            'boardofdirectors': 'Board of Directors',
            'salientpoints': 'Salient Points',
            'purposeoflisting': 'Purpose of Listing',
            'plansafterlisting': 'Plans After Listing'
        };

        // Return special case if it exists
        if (cleanField in specialCases) {
            return specialCases[cleanField];
        }

        // For any other fields, split by camelCase and capitalize
        return cleanField
            .split(/(?=[A-Z])|_/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }, []);

    // Update the section select dropdown JSX
    const renderSectionSelect = () => (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Section
            </label>
            <select
                value={selectedSection}
                onChange={(e) => {
                    const newSection = e.target.value;
                    if (!newSection) {
                        // Only clear section-related state, not the content
                        setSelectedSection('');
                        setSectionContent(null);
                        setSectionTitle('');
                        setCurrentSectionTitles([]);
                        
                        // Update URL without triggering a re-render
                        const newUrl = new URL(window.location.href);
                        newUrl.searchParams.delete('section');
                        window.history.pushState({}, '', newUrl);
                        return;
                    }

                    // Batch state updates
                    const sectionName = sections.find(s => s.id === newSection)?.title;
                    const fields = getSectionFields(newSection);
                    const sectionTitles = getSectionTitles(newSection);

                    // Remove the empty content initialization
                    setSelectedSection(newSection);
                    setSectionTitle(sectionName || `Section ${newSection}`);
                    setSectionFields(fields);
                    setCurrentSectionTitles(sectionTitles);

                    // Update URL without triggering a re-render
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('section', newSection);
                    if (selectedListing) {
                        newUrl.searchParams.set('listing', selectedListing);
                    }
                    window.history.pushState({}, '', newUrl);
                    
                    // Trigger content check after selection
                    if (selectedListing) {
                        handleGenerateSection(selectedSection);
                    }
                }}
                className="block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg appearance-none"
            >
                <option value="">Select a section...</option>
                {Array.from({ length: 6 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num.toString()}>
                        Section {num}
                    </option>
                ))}
            </select>
        </div>
    );

    // Helper function to get section titles based on selected section
    const getSectionTitles = (sectionNumber: string): Section[] => {
        switch (sectionNumber) {
            case '1':
                return [
                    { id: '1', title: 'Name of Issuing Company', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Status of Document', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Name of Document', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Important Warning Notice', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Details of Listing Particulars', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'General Company Information', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '7', title: 'Details of Corporate Advisors', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '8', title: 'Forward Looking Statements Notice', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '9', title: 'Board of Directors Information', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '10', title: 'Key Salient Points', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '11', title: 'Purpose and Objectives of Listing', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '12', title: 'Post-Listing Strategic Plans', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case '2':
                return [
                    { id: '1', title: 'Table of Contents', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Key Dates and Times', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'General Requirements', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Responsible Persons', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Securities Particulars', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Securities to which this relates', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case '3':
                return [
                    { id: '1', title: 'General Information About Issuer', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Issuer Principal Activities', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Issuer Financial Position', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Issuer\'s Administration and Management', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Recent Developments', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Financial Statements', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case '4':
                return Array.from({ length: 17 }, (_, i) => ({
                    id: (i + 1).toString(),
                    title: i === 0 ? 'Document Status' : `Risk Factors (Part ${i})`,
                    content: '',
                    status: 'pending',
                    isLocked: false,
                    complianceNotes: '',
                    complianceApproved: false
                }));
            case '5':
                return [
                    { id: '1', title: 'Document Status', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Information About Securities (Part 1)', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Information About Securities (Part 2)', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Information About Securities (Part 3)', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Information About Securities (Part 4)', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Information About Securities (Part 5)', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '7', title: 'Information About Securities (Part 6)', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '8', title: 'Costs', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case '6':
                return [
                    { id: '1', title: 'Exchange', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Sponsor Advisor Fees', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Accounting and Legal Fees', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'MERJ Listing Application First Year Fees', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Marketing Costs', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Annual Fees', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '7', title: 'Commission for Subscription', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '8', title: 'Paying Agent', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '9', title: 'Listing Documents', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '10', title: 'Compliance Approved', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            default:
                return [];
        }
    };

    // Function to handle section locking/unlocking
    const handleToggleLock = (sectionId: string) => {
        setSections(prev => prev.map(section => 
            section.id === sectionId 
                ? { ...section, isLocked: !section.isLocked }
                : section
        ));
    };

    // Function to handle section regeneration
    const handleRegenerateSection = async (field: string) => {
        console.log('Regenerating section:', field);
        try {
            const response = await fetch('https://exlayr-ai.app.n8n.cloud/webhook-test/regenerate-section', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ field })
            });
            console.log('Regeneration requested');
        } catch (error) {
            console.error('Error regenerating section:', error);
        }
    };

    // Function to handle section generation
    const handleGenerateSection = async (sectionId: string | number) => {
        try {
            const listing = listings.find(l => l.instrumentid === selectedListing);
            
            if (!listing) {
                console.log('No listing selected');
                return;
            }

            // Just update UI to show we're checking content
            setSections(prev => prev.map(section => 
                section.id === sectionId.toString()
                    ? { ...section, status: 'completed' }
                    : section
            ));

            // No need to send webhook or show messages - we're just displaying data
            console.log('Section content check complete');
            
        } catch (error: any) {
            console.error('Error checking section:', error);
            setSections(prev => prev.map(section => 
                section.id === sectionId.toString()
                    ? { ...section, status: 'pending' }
                    : section
            ));
        }
    };

    // Function to handle section updates
    const handleUpdateSection = async (field: string) => {
        console.log('=== UPDATE SECTION DEBUG START ===');
        console.log('Updating field:', field);
        console.log('Session status:', sessionStatus);
        
        // Add loading state for the specific field
        const fieldId = `${field}-save-status`;
        const fieldElement = document.getElementById(fieldId);
        
        try {
            // Check session before proceeding
            await checkSession();

        if (!selectedListing || !selectedSection || !sectionContent) {
            console.error('Missing required data:', { selectedListing, selectedSection, sectionContent });
            return;
        }

        if (fieldElement) {
            fieldElement.classList.add('saving');
        }

        const maxRetries = 3;
        let retryCount = 0;

        const attemptUpdate = async (): Promise<boolean> => {
            try {
                setSessionStatus('refreshing');

                // First get all current data
                const { data: existingData, error: checkError } = await supabase
                    .from('listingdocumentdirectlisting')
                    .select('*')
                    .eq('instrumentid', selectedListing)
                    .single();

                console.log('Existing data:', existingData);

                let result;
                if (!existingData) {
                    // If no record exists, create a new one with all section fields
                    console.log('No record exists, inserting new record');
                    const allFields = getSectionFields(selectedSection);
                    const insertData = {
                        instrumentid: selectedListing,
                        updated_at: new Date().toISOString(),
                        ...sectionContent // Include all current section content
                    };
                    
                    result = await supabase
                        .from('listingdocumentdirectlisting')
                        .insert(insertData);
                } else {
                    // If record exists, update while preserving other fields
                    console.log('Record exists, updating field while preserving others');
                    const updateData = {
                        ...existingData, // Preserve all existing fields
                        [field]: sectionContent[field], // Update only the specific field
                        updated_at: new Date().toISOString()
                    };

                    result = await supabase
                        .from('listingdocumentdirectlisting')
                        .update(updateData)
                        .eq('instrumentid', selectedListing);
                }

                console.log('Operation result:', result);

                if (result.error) {
                    // Check if error is auth-related
                    if (result.error.code === 'PGRST301' || result.error.code === '401') {
                        throw new Error('Auth error during operation');
                    }
                    throw result.error;
                }

                // Show success message and update UI
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    content: `Successfully updated ${getFieldLabel(field)}`
                }]);

                // Update the field's save status
                if (fieldElement) {
                    fieldElement.classList.remove('saving');
                    fieldElement.classList.add('saved');
                    // Remove the saved class after 2 seconds
                    setTimeout(() => {
                        fieldElement.classList.remove('saved');
                    }, 2000);
                }

                // Update section status to show completion
                setSections(prev => prev.map(section => 
                    section.id === selectedSection
                        ? { ...section, status: 'completed' }
                        : section
                ));

                // Add a delay before checking content
                await new Promise(resolve => setTimeout(resolve, 500));

                // Refresh content to verify update
                await handleGenerateSection(selectedSection);

                return true; // Success
            } catch (error) {
                console.error(`Update attempt ${retryCount + 1} failed:`, error);
                
                // Remove loading state on error
                if (fieldElement) {
                    fieldElement.classList.remove('saving');
                    fieldElement.classList.add('error');
                    // Remove the error class after 2 seconds
                    setTimeout(() => {
                        fieldElement.classList.remove('error');
                    }, 2000);
                }

                if (retryCount < maxRetries - 1) {
                    retryCount++;
                    console.log(`Retrying update (attempt ${retryCount + 1}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                    return false;
                }
                throw error;
            }
        };

            let success = false;
            while (!success && retryCount < maxRetries) {
                success = await attemptUpdate();
            }
            
            if (!success) {
                throw new Error('Failed to update after maximum retries');
            }
        } catch (error) {
            console.error('Error updating section:', error);
            if (error instanceof Error && error.message.includes('session')) {
                router.push('/sign-in');
            }
            setMessages(prev => [...prev, {
                type: 'assistant',
                content: `Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]);

            // Ensure loading state is removed on error
            if (fieldElement) {
                fieldElement.classList.remove('saving');
                fieldElement.classList.add('error');
                setTimeout(() => {
                    fieldElement.classList.remove('error');
                }, 2000);
            }
        }
        
        console.log('=== UPDATE SECTION DEBUG END ===');
    };

    // Helper function to format section names
    const formatSectionName = useCallback((name: string): string => {
        // Split by underscores and remove any prefix like 'sec1prompt_'
        const parts = name.split('_');
        const relevantPart = parts[parts.length - 1];
        
        // Split by camelCase
        const words = relevantPart
            .replace(/([A-Z])/g, ' $1')
            .toLowerCase()
            .split(' ')
            .filter(word => word.length > 0);
        
        // Capitalize first letter of each word and join
        return words
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }, []);

    const renderSectionContent = useCallback(() => {
        if (!selectedListing) {
            return (
                <div className="text-center text-gray-500 py-8">
                    Please select a listing to view content
                </div>
            );
        }

        if (!selectedSection) {
            return (
                <div className="text-center text-gray-500 py-8">
                    Please select a section to view its fields
                </div>
            );
        }

        const fieldsToDisplay = getSectionFields(selectedSection);

        return (
            <div className="space-y-6">
                {fieldsToDisplay.map((field, index) => (
                    <div key={`${field}-${index}`} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {getFieldLabel(field)}
                                </label>
                            </div>
                            <div className="flex gap-2 items-center">
                                <div id={`${field}-save-status`} className="save-status">
                                    <span className="saving-indicator">Saving...</span>
                                    <span className="saved-indicator">Saved!</span>
                                    <span className="error-indicator">Error!</span>
                                </div>
                                <button
                                    onClick={() => handleRegenerateSection(field)}
                                    className="p-2 rounded-md hover:bg-gray-100"
                                    title="Regenerate section"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleUpdateSection(field)}
                                    className="p-2 rounded-md hover:bg-gray-100"
                                    title="Update section"
                                >
                                    <Save className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <textarea
                            key={`${field}-textarea-${index}`}
                            className="w-full min-h-[100px] p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`Enter ${getFieldLabel(field).toLowerCase()}`}
                            value={sectionContent?.[field] || ''}
                            onChange={(e) => {
                                setSectionContent(prev => ({
                                    ...prev!,
                                    [field]: e.target.value
                                }));
                            }}
                        />
                    </div>
                ))}
            </div>
        );
    }, [selectedListing, selectedSection, sectionContent, getFieldLabel]);

    return (
            <div className="h-[calc(100vh-5rem)] flex">
                <div className="w-[300px] border-r bg-white p-6 overflow-y-auto flex flex-col animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                    <div className="space-y-6 flex-1">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Choose an Assistant
                            </label>
                            <select
                                value={selectedAssistant}
                                onChange={(e) => setSelectedAssistant(e.target.value)}
                                className="block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg appearance-none"
                            >
                                <option>Equity Listing Direct List</option>
                            </select>
                        </div>

                    {renderListingSelect()}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Knowledge Base
                            </label>
                            <select
                                value={selectedKnowledgeBase}
                                onChange={(e) => setSelectedKnowledgeBase(e.target.value)}
                                className="block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg appearance-none"
                            >
                                <option>Select knowledge base...</option>
                            </select>
                        </div>

                        {renderSectionSelect()}

                        {selectedListing && selectedSection && (
                        <div className="mt-6 flex gap-2">
                                <button
                                    onClick={() => handleGenerateSection(selectedSection)}
                                className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
                            >
                                <Send className="h-4 w-4" />
                                Generate
                            </button>
                            <button
                                onClick={() => selectedSection ? handleGenerateSection(selectedSection) : null}
                                className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
                            >
                                <Search className="h-4 w-4" />
                                Check Content
                            </button>
                            </div>
                        )}

                        {/* Progress Section */}
                        <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                            <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                                <span>Document Sections</span>
                            <span>{currentSectionTitles.filter(s => s.status === 'completed').length}/{currentSectionTitles.length || sections.length}</span>
                            </div>
                            <div className="space-y-2">
                            {selectedSection ? (
                                currentSectionTitles.map((section, index) => (
                                    <div
                                        key={`${section.id}-${section.title}`}
                                        className="section-item flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                                    >
                                        <span className="section-title text-sm text-gray-700" 
                                              style={{ animationDelay: `${0.7 + index * 0.1}s` }}>
                                            {section.title}
                                        </span>
                                        {section.status === 'completed' ? (
                                            <Check className="h-5 w-5 text-green-500 animate-scale-in" 
                                                   style={{ animationDelay: `${0.8 + index * 0.1}s` }} />
                                        ) : (
                                            <button
                                                onClick={() => handleGenerateSection(section.id)}
                                                className="p-2 rounded-md hover:bg-gray-100"
                                                title="Generate section"
                                            >
                                                <Send className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    Please select a section to view its fields
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                    {renderSectionContent()}
                </div>
            </div>
        );
}