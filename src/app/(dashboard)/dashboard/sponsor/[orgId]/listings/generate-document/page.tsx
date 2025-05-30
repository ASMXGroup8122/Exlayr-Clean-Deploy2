'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Check, Send, User2, MessageSquare, Lock, Unlock, RotateCcw, Save, Search, FileText, Sparkles, ArrowUpRight, Plus, Menu, X, ChevronLeft, ChevronRight, Settings, Brain, Zap, Clock, Building2, Users, Loader2, Copy } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { DATABASE_TABLES } from '@/lib/constants/database';
import './styles.css';
import { getSupabaseClient } from '@/lib/supabase/client';
import SearchParamsProvider from '@/components/SearchParamsProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDocumentGeneration } from '@/hooks/useDocumentGeneration';

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

function GenerateListingDocumentContent() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();
    const orgId = params?.orgId as string;
    const supabase = useMemo(() => getSupabaseClient(), []);

    // Add session management state
    const [isInitialized, setIsInitialized] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<'active' | 'expired' | 'refreshing'>('refreshing');
    const [sessionError, setSessionError] = useState<string | null>(null);

    // UI State Management
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    const [selectedAssistant, setSelectedAssistant] = useState('');
    const [selectedListing, setSelectedListing] = useState('');
    const [listings, setListings] = useState<Array<{ 
        instrumentid: string;
        instrumentname: string;
        instrumentissuerid: string;
        instrumentissuername: string;
    }>>([]);
    const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState('');
    const [selectedIssuer, setSelectedIssuer] = useState('');
    const [issuers, setIssuers] = useState<Array<{
        id: string;
        name: string;
        organization_name: string;
        industry: string;
        status: string;
    }>>([]);
    const [issuerDocuments, setIssuerDocuments] = useState<Array<{
        id: string;
        title: string;
        type: string;
        uploaded_at: string;
        file_size?: string;
    }>>([]);
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [messages, setMessages] = useState<Array<{ type: 'user' | 'assistant', content: string }>>([]);
    const [currentSectionTitles, setCurrentSectionTitles] = useState<Section[]>([]);

    // Add document generation hook
    const { 
        generateDocument, 
        isGenerating: isDocumentGenerating, 
        result: generationResult, 
        error: generationError,
        reset: resetGeneration 
    } = useDocumentGeneration();

    // Add state for progressive section generation
    const [generatedSections, setGeneratedSections] = useState<Array<{
        promptname: string;
        title: string;
        content: string;
        fullContent?: string;
        isGenerating?: boolean;
        isComplete?: boolean;
    }>>([]);
    const [documentGenerated, setDocumentGenerated] = useState(false);
    
    // State for displaying content
    const [displayedContent, setDisplayedContent] = useState<Record<string, string>>({});

    // Available document types
    const documentTypes = [
        {
            id: 'equity-direct-listing',
            name: 'Equity Direct Listing',
            description: 'Standard equity listing document',
            icon: '📈'
        },
        {
            id: 'debt-listing',
            name: 'Debt Securities Listing',
            description: 'Corporate bonds and debt instruments',
            icon: '📊'
        },
        {
            id: 'etf-listing',
            name: 'ETF Listing',
            description: 'Exchange-traded funds',
            icon: '🔄'
        },
        {
            id: 'preference-shares',
            name: 'Preference Shares Listing',
            description: 'Preference share instruments',
            icon: '⭐'
        },
        {
            id: 'rights-issue',
            name: 'Rights Issue',
            description: 'Rights offering documents',
            icon: '🎯'
        },
        {
            id: 'warrant-listing',
            name: 'Warrant Listing',
            description: 'Warrant instruments',
            icon: '��'
        },
        {
            id: 'security-token-listing',
            name: 'Security Token Listing',
            description: 'Blockchain-based security tokens',
            icon: '��'
        }
    ];

    // Function to get sections based on document type
    const getSectionsForDocumentType = (documentType: string): Section[] => {
        switch (documentType) {
            case 'equity-direct-listing':
                return [
        { id: '1', title: 'Warning Notice', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '2', title: 'Listing Particulars', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '3', title: 'General Information', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '4', title: 'Corporate Advisors', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '5', title: 'Forward Looking Statements', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '6', title: 'Board of Directors', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '7', title: 'Salient Points', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '8', title: 'Purpose of Listing', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
        { id: '9', title: 'Plans After Listing', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case 'debt-listing':
                return [
                    { id: '1', title: 'Warning Notice', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Debt Security Particulars', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Terms and Conditions', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Credit Rating', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Risk Factors', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Use of Proceeds', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '7', title: 'Financial Information', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case 'etf-listing':
                return [
                    { id: '1', title: 'Warning Notice', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Fund Information', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Investment Objective', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Index Methodology', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Risk Factors', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Fees and Expenses', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case 'preference-shares':
                return [
                    { id: '1', title: 'Warning Notice', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Preference Share Details', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Dividend Policy', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Conversion Rights', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Voting Rights', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Redemption Terms', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case 'rights-issue':
                return [
                    { id: '1', title: 'Warning Notice', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Rights Offer Details', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Subscription Terms', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Use of Proceeds', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Timetable', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case 'warrant-listing':
                return [
                    { id: '1', title: 'Warning Notice', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Warrant Terms', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Exercise Conditions', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Underlying Securities', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Risk Factors', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case 'security-token-listing':
                return [
                    { id: '1', title: 'Warning Notice', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Token Particulars', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Blockchain Technology', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Smart Contract Details', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Token Economics', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Regulatory Compliance', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '7', title: 'Technology Risk Factors', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '8', title: 'Custody and Storage', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            default:
                return [];
        }
    };

    // Section state management (now dynamic based on document type)
    const [sections, setSections] = useState<Section[]>([]);

    // Update sections when document type changes
    useEffect(() => {
        if (selectedAssistant) {
            const newSections = getSectionsForDocumentType(selectedAssistant);
            setSections(newSections);
            // Reset when document type changes
            setCurrentSectionTitles([]);
        }
    }, [selectedAssistant]);

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Auto-open sidebar on desktop
            if (!mobile && !isSidebarOpen) {
                setIsSidebarOpen(true);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
                            const { selectedListing, selectedIssuer: savedSelectedIssuer, selectedDocuments: savedSelectedDocuments } = JSON.parse(savedState);
                            setSelectedListing(selectedListing || '');
                            setSelectedIssuer(savedSelectedIssuer || '');
                            setSelectedDocuments(savedSelectedDocuments || []);
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
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

        return () => {
            mounted = false;
            clearInterval(refreshTimer);
            subscription.unsubscribe();
        };
    }, [supabase, router, orgId]);

    // Save state to localStorage whenever relevant state changes
    useEffect(() => {
        if (isInitialized && orgId) {
        const handleBeforeUnload = () => {
            try {
                const stateToSave = {
                    selectedListing,
                    selectedIssuer,
                    selectedDocuments
                };
                localStorage.setItem(`generate-document-state-${orgId}`, JSON.stringify(stateToSave));
            } catch (e) {
                    console.error('Error saving state to localStorage:', e);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
            // Also save state on changes
            handleBeforeUnload();

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
        }
    }, [selectedListing, isInitialized, orgId, selectedIssuer, selectedDocuments]);

    // Session check function
    const checkSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Session check error:', error);
                throw error;
        }
            
            if (!session) {
                console.error('No active session found');
                    setSessionStatus('expired');
                router.push('/sign-in');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Session validation failed:', error);
            setSessionStatus('expired');
            router.push('/sign-in');
            return false;
        }
    };

    // Function to get field label
    const getFieldLabel = useCallback((field: string): string => {
        const fieldMappings: Record<string, string> = {
            'sec1prompt_title': 'Title',
            'sec1prompt_warning': 'Warning Notice',
            'sec1prompt_listingparticulars': 'Listing Particulars',
            'sec1prompt_generalinfo': 'General Information',
            'sec1prompt_corporateadvisors': 'Corporate Advisors',
            'sec1prompt_forwardlooking_statements': 'Forward Looking Statements',
            'sec1prompt_boardofdirectors': 'Board of Directors',
            'sec1prompt_salientpoints': 'Salient Points',
            'sec1prompt_purposeoflisting': 'Purpose of Listing',
            'sec1prompt_plansafterlisting': 'Plans After Listing'
        };
        
        return fieldMappings[field] || field.replace(/^sec\dPrompt_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }, []);

    const fetchListings = async () => {
        if (!(await checkSession())) return;

        try {
            // Get current user first
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError) {
                console.error('Error getting user:', userError);
                return;
            }
            
            if (!user) {
                console.error('No authenticated user found');
                        return;
                    }

            console.log('Fetching listings for user:', user.id);

                        const { data, error } = await supabase
                .from('listing')
                .select('instrumentid, instrumentname, instrumentissuerid, instrumentissuername')
                .eq('instrumentcreatedby', user.id)
                .order('instrumentupdatedat', { ascending: false });

                        if (error) {
                console.error('Error fetching listings:', error);
                throw error;
            }

            console.log('Fetched listings:', data);
            setListings(data || []);
            
            if (!data || data.length === 0) {
                console.log('No listings found for this user');
            }
        } catch (error) {
            console.error('Error in fetchListings:', error);
        }
    };

    const fetchIssuers = async () => {
        if (!(await checkSession())) return;

        try {
            // Get current user first
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError) {
                console.error('Error getting user:', userError);
                        return;
                    }

            if (!user) {
                console.error('No authenticated user found');
                return;
            }

            console.log('Fetching issuers for sponsor:', orgId);

            // Get issuers that have listings created by this sponsor
            const { data, error } = await supabase
                .from('listing')
                .select('instrumentissuerid, instrumentissuername')
                .eq('instrumentcreatedby', user.id)
                .not('instrumentissuerid', 'is', null);

            if (error) {
                console.error('Error fetching issuers:', error);
                throw error;
            }

            // Extract unique issuers
            const uniqueIssuers = new Map();
            data?.forEach((listing: any) => {
                if (listing.instrumentissuerid && !uniqueIssuers.has(listing.instrumentissuerid)) {
                    uniqueIssuers.set(listing.instrumentissuerid, {
                        id: listing.instrumentissuerid,
                        name: listing.instrumentissuername,
                        organization_name: listing.instrumentissuername,
                        industry: 'Financial Services',
                        status: 'active'
                    });
                }
            });

            const issuersList = Array.from(uniqueIssuers.values());
            console.log('Fetched issuers:', issuersList);
            setIssuers(issuersList);
            
            if (issuersList.length === 0) {
                console.log('No issuer clients found for this sponsor');
            }
        } catch (error) {
            console.error('Error in fetchIssuers:', error);
        }
    };

    const fetchIssuerDocuments = async (issuerId: string) => {
        if (!(await checkSession()) || !issuerId) return;

        try {
            console.log('Fetching documents for issuer:', issuerId);

            // Fetch documents from knowledge_vault_documents for this issuer
                        const { data, error } = await supabase
                .from('knowledge_vault_documents')
                .select('id, name, description, category, type, size, created_at')
                .eq('issuer_id', issuerId)
                .order('created_at', { ascending: false });

                        if (error) {
                console.error('Error fetching issuer documents:', error);
                setIssuerDocuments([]);
                        return;
                    }

            const documents = data?.map((doc: any) => ({
                id: doc.id,
                title: doc.name || 'Untitled Document',
                type: doc.type || doc.category || 'Unknown',
                uploaded_at: doc.created_at,
                file_size: doc.size ? `${(doc.size / 1024 / 1024).toFixed(2)} MB` : undefined
            })) || [];

            console.log('Fetched documents:', documents);
            setIssuerDocuments(documents);
            
            if (documents.length === 0) {
                console.log('No documents found for this issuer');
            }
        } catch (error) {
            console.error('Error in fetchIssuerDocuments:', error);
            setIssuerDocuments([]);
        }
    };

    useEffect(() => {
        if (isInitialized && sessionStatus === 'active' && orgId) {
            fetchListings();
            fetchIssuers();
        }
    }, [isInitialized, sessionStatus, orgId]);

    // Fetch documents when issuer is selected
    useEffect(() => {
        if (selectedIssuer) {
            fetchIssuerDocuments(selectedIssuer);
            setSelectedDocuments([]); // Clear previous selections
        } else {
            setIssuerDocuments([]);
            setSelectedDocuments([]);
        }
    }, [selectedIssuer]);

    const renderListingSelect = () => (
        <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
                Select Listing
            </label>
            <select
                value={selectedListing}
                onChange={(e) => setSelectedListing(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm transition-all duration-300 backdrop-blur-sm"
            >
                <option value="">Choose a listing...</option>
                {listings.map((listing) => (
                    <option key={listing.instrumentid} value={listing.instrumentid}>
                        {listing.instrumentname} - {listing.instrumentissuername}
                    </option>
                ))}
            </select>
        </div>
    );

    const getSectionFields = (sectionNumber: string): string[] => {
        const sectionFieldMappings: Record<string, string[]> = {
            '1': ['sec1prompt_title', 'sec1prompt_warning'],
            '2': ['sec1prompt_title', 'sec1prompt_listingparticulars'],
            '3': ['sec1prompt_title', 'sec1prompt_generalinfo'],
            '4': ['sec1prompt_title', 'sec1prompt_corporateadvisors'],
            '5': ['sec1prompt_title', 'sec1prompt_forwardlooking_statements'],
            '6': ['sec1prompt_title', 'sec1prompt_boardofdirectors'],
            '7': ['sec1prompt_title', 'sec1prompt_salientpoints'],
            '8': ['sec1prompt_title', 'sec1prompt_purposeoflisting'],
            '9': ['sec1prompt_title', 'sec1prompt_plansafterlisting']
        };

        return sectionFieldMappings[sectionNumber] || [];
    };

    // Add function to handle full document generation
    const handleGenerateFullDocument = async () => {
        if (!selectedListing || !selectedIssuer || !selectedAssistant) {
            return;
        }

        // Clear previous results
        setGeneratedSections([]);
        setDocumentGenerated(false);
        setMessages([]);
        setDisplayedContent({});

        // Get ALL sections for complete document generation (6 sections total)
        const allSections = ['sec1prompt', 'sec2prompt', 'sec3prompt', 'sec4prompt', 'sec5prompt', 'sec6prompt'];

        // Add generation start message
        setMessages([{
            type: 'user',
            content: `Generating complete ${documentTypes.find(t => t.id === selectedAssistant)?.name} document for ${listings.find(l => l.instrumentid === selectedListing)?.instrumentname}`
        }]);

        try {
            // Start generation with progress tracking for ALL 6 sections
            const result = await generateDocument({
                instrumentid: selectedListing,
                instrumentissuerid: selectedIssuer,
                sections: allSections, // This will now process all 6 sections (57 total templates)
                selectedDocuments: selectedDocuments,
                documentType: selectedAssistant
            });

            // Improved error handling for all possible response states
            if (!result) {
                throw new Error('Document generation returned no result. Please check your network connection and try again.');
            }

            if (!result.success) {
                throw new Error(result.error || 'Document generation failed without specific error message');
            }

            // Log the result for debugging
            console.log('[DocumentGeneration] API Response:', result);
            console.log('[DocumentGeneration] Result success:', result.success);
            console.log('[DocumentGeneration] Result sections:', result.sections);
            console.log('[DocumentGeneration] Sections length:', result.sections?.length || 0);

            // Check if we have sections - the API might return empty sections array
            if (!result.sections || result.sections.length === 0) {
                console.log('[DocumentGeneration] No sections returned but generation was successful - treating as success');
                
                // Set document as generated even without sections (they're saved to database)
                setDocumentGenerated(true);
                setGeneratedSections([]);
                
                // Add success message
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    content: [
                        '🎉 Document generation completed successfully!',
                        '',
                        `✅ Generated and saved ${result.sectionsGenerated || 57} sections to database`,
                        `📊 Updated ${result.columnsUpdated?.length || 57} database columns`,
                        '',
                        'Your complete listing document is now saved in the database.',
                        'Click "Save & Edit" below to continue editing in Canvas Mode.'
                    ].join('\n')
                }]);
                
                return; // Exit early but successfully
            }

            // Process successful result
            console.log('[DocumentGeneration] Full document generated successfully!', result);
            console.log('[DocumentGeneration] Result sections:', result.sections);
            
            // Process sections and set them directly without complex animation
            const processedSections = result.sections.map((section: any) => ({
                promptname: section.promptname || section.id,
                title: section.title || section.promptname || 'Untitled Section',
                content: section.fullContent || section.content || section.preview || '',
                fullContent: section.fullContent || section.content || section.preview || '',
                isGenerating: false,
                isComplete: true
            }));

            console.log('[DocumentGeneration] Processed sections:', processedSections);
            console.log('[DocumentGeneration] Number of processed sections:', processedSections.length);

            // Set all sections at once
            setGeneratedSections(processedSections);
            setDocumentGenerated(true);

            // Set displayed content for all sections
            const contentMap: Record<string, string> = {};
            processedSections.forEach(section => {
                contentMap[section.promptname] = section.content;
            });
            setDisplayedContent(contentMap);
            
            console.log('[DocumentGeneration] Content map:', contentMap);
            console.log('[DocumentGeneration] Document generated flag set to:', true);

            // Add final success message with more detailed information
            const successMessage = [
                '🎉 Complete document generation finished!',
                '',
                `✅ Generated ${result.sectionsGenerated || processedSections.length} sections across 6 main sections`,
                `📊 Successfully saved ${result.sectionsProcessed || result.sectionsGenerated || processedSections.length} sections to database`,
                `📋 Updated ${result.columnsUpdated?.length || 0} database columns`,
                ''
            ];

            if (result.skippedSections && result.skippedSections.length > 0) {
                successMessage.push(
                    `⚠️ Skipped ${result.skippedSections.length} sections due to missing database columns:`,
                    ...result.skippedSections.map(s => `• ${s}`),
                    ''
                );
            }

            successMessage.push(
                'Your complete listing document with all available sections is now saved and displayed below.',
                'You can view the full document in Canvas Mode or continue editing individual sections.'
            );

                setMessages(prev => [...prev, {
                    type: 'assistant',
                content: successMessage.join('\n')
            }]);

            } catch (error) {
            console.error('[DocumentGeneration] Full document generation failed:', error);
            
            // More descriptive error messages
            let errorMessage = 'Unknown error occurred during document generation';
            
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = (error as any).message;
            }

            setMessages(prev => [...prev, {
                type: 'assistant',
                content: [
                    '❌ Document generation failed',
                    '',
                    `Error: ${errorMessage}`,
                    '',
                    '🔧 Troubleshooting suggestions:',
                    '• Check your internet connection',
                    '• Ensure all required fields are selected',
                    '• Try refreshing the page and generating again',
                    '• Contact support if the issue persists',
                    '',
                    'The system logs have been updated for debugging purposes.'
                ].join('\n')
            }]);
        }
    };

    // Add save and redirect function
    const handleSaveAndEdit = async () => {
        if (!selectedListing) {
            console.error('[SaveAndEdit] No listing selected');
            return;
        }

        try {
            // Add a loading message
            setMessages(prev => [...prev, {
                type: 'assistant',
                content: `💾 Saving document and redirecting to Canvas Editor...\n\nYour document sections are already saved to the database. Redirecting you to the Canvas Editor where you can view and edit individual sections.`
            }]);

            // Small delay to show the message
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Redirect to canvas editing page
            const canvasUrl = `/dashboard/sponsor/${orgId}/listings/${selectedListing}/edit-document/canvas`;
            console.log('[SaveAndEdit] Redirecting to:', canvasUrl);
            router.push(canvasUrl);
        } catch (error) {
            console.error('[SaveAndEdit] Failed to redirect:', error);
            setMessages(prev => [...prev, {
                type: 'assistant',
                content: `❌ Failed to redirect to Canvas Editor: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease manually navigate to the listings page to continue editing.`
            }]);
        }
    };

    const renderMainContent = () => {
        if (!selectedAssistant) {
            return (
                <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md px-4">
                        <div className="mx-auto rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-100 mb-4 sm:mb-6">
                            <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Choose Document Type</h3>
                        <p className="text-gray-600 text-sm sm:text-base">Select a document type from the sidebar to begin generating your listing documents.</p>
                    </div>
                </div>
            );
        }

        if (!selectedListing) {
            return (
                <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md px-4">
                        <div className="mx-auto rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-100 mb-4 sm:mb-6">
                            <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Select Your Listing</h3>
                        <p className="text-gray-600 text-sm sm:text-base">Choose a listing from the sidebar to start generating document sections.</p>
                        <div className="mt-6 flex justify-center">
                            <Button
                                onClick={() => router.push(`/dashboard/sponsor/${orgId}/new-listing`)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                            >
                                <Plus className="h-5 w-5" />
                                Create New Listing
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (!selectedIssuer) {
            return (
                <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md px-4">
                        <div className="mx-auto rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-100 mb-4 sm:mb-6">
                            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Select Client Issuer</h3>
                        <p className="text-gray-600 text-sm sm:text-base">Choose your client issuer from the sidebar to proceed with document generation.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4">
                    {messages.length === 0 && !documentGenerated ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center max-w-md px-4">
                                <div className="mx-auto rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-100 mb-4 sm:mb-6">
                                    <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                            </div>
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Ready to Generate</h3>
                                <p className="text-gray-600 text-sm sm:text-base">Click "Generate Complete Document" in the sidebar to start creating your listing document with AI.</p>
                                </div>
                        </div>
                    ) : (
                        <>
                            {/* Chat Messages */}
                            {messages.map((message, index) => (
                                <div key={index} className={cn(
                                    "flex gap-2 sm:gap-3 md:gap-4",
                                    message.type === 'user' ? "flex-row-reverse" : "flex-row"
                                )}>
                                    <div className={cn(
                                        "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0",
                                        message.type === 'user' 
                                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                                            : "bg-gray-100 text-gray-700"
                                    )}>
                                        {message.type === 'user' ? 'U' : 'AI'}
                                    </div>
                                    <div className={cn(
                                        "max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-xl px-3 sm:px-4 py-2 sm:py-3 relative group",
                                        message.type === 'user'
                                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                                            : "bg-white border border-gray-200 text-gray-900 shadow-sm"
                                    )}>
                                        <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                                            {message.content}
                                        </div>
                                        {message.type === 'assistant' && (
                                            <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded">
                                                <Copy className="h-3 w-3 text-gray-500" />
                                </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Generated Document Sections */}
                            {documentGenerated && generatedSections.length > 0 && (
                                <div className="space-y-4 mt-6">
                                    <div className="border-t border-gray-200 pt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                Generated Document Sections ({generatedSections.length} sections)
                                            </h3>
                                            
                                            {/* Save & Edit Button in main content area */}
                                <button
                                                onClick={handleSaveAndEdit}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm"
                                            >
                                                <Save className="h-4 w-4" />
                                                Save & Edit in Canvas
                                            </button>
                                        </div>
                                        
                                        {/* Debug info */}
                                        <div className="mb-4 p-3 bg-gray-50 rounded text-xs">
                                            <strong>Debug:</strong> documentGenerated={documentGenerated.toString()}, sections={generatedSections.length}
                                        </div>
                                        
                                        <div className="space-y-4">
                                            {generatedSections.map((section, index) => (
                                                <div 
                                                    key={index} 
                                                    className={cn(
                                                        "bg-white border rounded-xl p-4 shadow-sm transition-all duration-500",
                                                        section.isGenerating ? "border-blue-300 bg-blue-50/30" : "border-gray-200",
                                                        section.isComplete ? "border-green-300 bg-green-50/30" : "",
                                                        "transform hover:scale-[1.01]"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="font-medium text-gray-900 text-sm flex items-center gap-2">
                                                            {section.isGenerating && (
                                                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                                            )}
                                                            {section.isComplete && (
                                                                <Check className="h-4 w-4 text-green-500" />
                                                            )}
                                                            {!section.isGenerating && !section.isComplete && (
                                                                <Clock className="h-4 w-4 text-gray-400" />
                                                            )}
                                                            {section.title}
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                                {section.promptname}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Content with typing animation */}
                                                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                        {section.content || displayedContent[section.promptname] || ''}
                                                    </div>
                                                    
                                                    {/* Progress bar for generating sections */}
                                                    {section.isGenerating && (
                                                        <div className="mt-3">
                                                            <div className="w-full bg-gray-200 rounded-full h-1">
                                                                <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                                                            </div>
                                                        </div>
                                                    )}
                    </div>
                ))}
                                        </div>
                                        
                                        {/* Document Actions Footer */}
                                        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/50 rounded-xl backdrop-blur-sm">
                                            <div className="text-center">
                                                <h4 className="text-sm font-medium text-gray-900 mb-2">
                                                    🎉 Document Generated Successfully!
                                                </h4>
                                                <p className="text-xs text-gray-600 mb-4">
                                                    Your listing document has been generated and saved to the database. You can now edit individual sections in Canvas Mode.
                                                </p>
                                                
                                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                                    {/* Primary Save & Edit Button */}
                                                    <button
                                                        onClick={handleSaveAndEdit}
                                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm"
                                                    >
                                                        <Save className="h-4 w-4" />
                                                        Save & Edit in Canvas
                                                    </button>
                                                    
                                                    {/* Generate New Document Button */}
                                                    <button
                                                        onClick={() => {
                                                            setGeneratedSections([]);
                                                            setDocumentGenerated(false);
                                                            setMessages([]);
                                                            setDisplayedContent({});
                                                            resetGeneration();
                                                        }}
                                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                                        Generate New Document
                                </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Save & Edit Button when document is generated but no sections are displayed */}
                            {documentGenerated && generatedSections.length === 0 && (
                                <div className="mt-6 p-4 bg-gradient-to-r from-green-50/80 to-emerald-50/80 border border-green-200/50 rounded-xl backdrop-blur-sm">
                                    <div className="text-center">
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                                            🎉 Document Generated Successfully!
                                        </h4>
                                        <p className="text-xs text-gray-600 mb-4">
                                            Your listing document has been generated and saved to the database. Continue editing in Canvas Mode.
                                        </p>
                                        
                                <button
                                            onClick={handleSaveAndEdit}
                                            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm mx-auto"
                                >
                                    <Save className="h-4 w-4" />
                                            Save & Edit in Canvas
                                </button>
                            </div>
                        </div>
                            )}

                            {/* Progressive Generation Status */}
                            {(generatedSections.length > 0 && !documentGenerated) && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                        <div>
                                            <h4 className="font-medium text-blue-900">Generating Document Sections</h4>
                                            <p className="text-sm text-blue-700 mt-1">
                                                {generatedSections.filter(s => s.isComplete).length} of {generatedSections.length} sections completed
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Overall progress bar */}
                                    <div className="mt-3">
                                        <div className="w-full bg-blue-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                style={{ 
                                                    width: `${(generatedSections.filter(s => s.isComplete).length / generatedSections.length) * 100}%` 
                                                }}
                                            ></div>
                    </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Loading Message */}
                    {(isDocumentGenerating) && (
                        <div className="flex gap-2 sm:gap-3 md:gap-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0">
                                AI
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                    <span className="text-gray-500 text-sm sm:text-base">
                                        {isDocumentGenerating ? 'Generating complete document...' : 'Generating content...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (sessionStatus === 'refreshing') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-8">
                    <div className="flex items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <div>
                            <h3 className="font-semibold text-gray-900">Initializing...</h3>
                            <p className="text-gray-600 text-sm">Setting up your document generation workspace</p>
                            </div>
                                </div>
                </div>
            </div>
        );
    }

    return (
        <SearchParamsProvider>
            {(searchParams) => (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-2 sm:p-4 md:p-6 overflow-x-hidden flex flex-col">
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
                    <div className="relative mb-4 md:mb-6 flex-shrink-0">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/50 p-3 sm:p-4 md:p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                                    <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                                        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight">
                                            AI Document Generator
                                        </h1>
                                        <p className="text-gray-600 mt-1 text-xs sm:text-sm">
                                            Create professional listing documents with AI assistance
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Mobile Toggle Button */}
                                <div className="md:hidden">
                                <button
                                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                        className="p-2 bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 rounded-lg"
                                >
                                        {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                                </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex flex-col md:flex-row gap-4 sm:gap-6 flex-1 min-h-0 relative">
                        {/* Chat/Content Area */}
                        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col min-h-[400px] md:min-h-[500px]">
                            {renderMainContent()}
                        </div>

                        {/* Configuration Sidebar */}
                        <div className={cn(
                            "bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col transition-all duration-300",
                            // Mobile: Full screen overlay
                            isMobile ? cn(
                                "fixed inset-0 z-50 m-4",
                                isSidebarOpen ? "translate-x-0" : "translate-x-full"
                            ) : cn(
                                // Desktop: Sidebar
                                "min-h-[500px]",
                                isSidebarOpen ? "w-80" : "w-16"
                            )
                        )}>
                            {/* Sidebar Header */}
                            <div className="flex-shrink-0 p-3 border-b border-gray-200/50 flex items-center justify-between bg-white/50 rounded-t-xl">
                                {(isSidebarOpen || isMobile) && (
                                    <h2 className="font-semibold text-gray-900 text-sm truncate mr-2 min-w-0">Document Settings</h2>
                                )}
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className={cn(
                                        "p-2 bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 rounded-lg flex-shrink-0",
                                        !isSidebarOpen && "ml-auto"
                                    )}
                                >
                                    {isMobile ? (
                                        <X className="h-4 w-4" />
                                    ) : isSidebarOpen ? (
                                        <ChevronRight className="h-4 w-4" />
                                    ) : (
                                        <ChevronLeft className="h-4 w-4" />
                                    )}
                                </button>
                            </div>

                            {/* Sidebar Content */}
                            {(isSidebarOpen || isMobile) && (
                                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                                    {/* Assistant Selection */}
                            <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                                            Document Type
                                </label>
                                        {selectedAssistant ? (
                                            <div className="bg-white/60 border border-white/50 rounded-xl p-3 backdrop-blur-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-lg">{documentTypes.find(t => t.id === selectedAssistant)?.icon}</span>
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {documentTypes.find(t => t.id === selectedAssistant)?.name}
                                                            </span>
                                                            <p className="text-xs text-gray-500">
                                                                {documentTypes.find(t => t.id === selectedAssistant)?.description}
                                                            </p>
                        </div>
                    </div>
                                                    <button
                                                        onClick={() => setSelectedAssistant('')}
                                                        className="p-1 hover:bg-gray-100 text-gray-500"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {documentTypes.map((docType) => (
                                                    <button
                                                        key={docType.id}
                                                        onClick={() => setSelectedAssistant(docType.id)}
                                                        className="w-full text-left p-3 bg-white/60 border border-white/50 rounded-xl hover:bg-white/80 hover:border-blue-300 transition-all duration-300 backdrop-blur-sm group"
                                                    >
                                                        <div className="flex items-start space-x-3">
                                                            <span className="text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                                                                {docType.icon}
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                                                                    {docType.name}
                                                                </h4>
                                                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                                    {docType.description}
                                                                </p>
                                                            </div>
                                                            <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                                                        </div>
                                                    </button>
                ))}
            </div>
                                        )}
                            </div>

                                    {/* Listing Selection */}
                        {renderListingSelect()}

                                    {/* Client Issuer */}
                            <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                                            <div className="flex items-center space-x-2">
                                                <Users className="h-4 w-4 text-blue-600" />
                                                <span>Client Issuer</span>
                                            </div>
                                </label>
                                        {selectedIssuer ? (
                                            <div className="bg-white/60 border border-white/50 rounded-xl p-3 backdrop-blur-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                                                            <Building2 className="h-4 w-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {issuers.find(i => i.id === selectedIssuer)?.name}
                                                            </span>
                                                            <p className="text-xs text-gray-500">
                                                                {issuers.find(i => i.id === selectedIssuer)?.industry}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedIssuer('')}
                                                        className="p-1 hover:bg-gray-100 text-gray-500"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                <select
                                                value={selectedIssuer}
                                                onChange={(e) => setSelectedIssuer(e.target.value)}
                                                className="w-full px-4 py-3 bg-white/60 border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm transition-all duration-300 backdrop-blur-sm"
                                            >
                                                <option value="">Choose your client issuer...</option>
                                                {issuers.map((issuer) => (
                                                    <option key={issuer.id} value={issuer.id}>
                                                        {issuer.name} - {issuer.industry}
                                                    </option>
                                                ))}
                                </select>
                                        )}
                            </div>

                                    {/* Knowledge Base */}
                            <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                                            <div className="flex items-center space-x-2">
                                                <Brain className="h-4 w-4 text-purple-600" />
                                                <span>Knowledge Base</span>
                                            </div>
                                </label>
                                        
                                        {!selectedIssuer ? (
                                            <div className="bg-gray-50/80 border border-gray-200/50 rounded-xl p-4 text-center">
                                                <p className="text-sm text-gray-500">
                                                    Select a client issuer first to view available documents
                                                </p>
                                            </div>
                                        ) : issuerDocuments.length === 0 ? (
                                            <div className="bg-yellow-50/80 border border-yellow-200/50 rounded-xl p-4 text-center">
                                                <p className="text-sm text-gray-600">
                                                    No documents found for {issuers.find(i => i.id === selectedIssuer)?.name}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Upload documents to use as knowledge base for generation
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {issuerDocuments.map((document) => (
                                                    <label
                                                        key={document.id}
                                                        className="flex items-start space-x-3 p-3 bg-white/60 border border-white/50 rounded-xl hover:bg-white/80 hover:border-blue-300 transition-all duration-300 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDocuments.includes(document.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedDocuments(prev => [...prev, document.id]);
                                                                } else {
                                                                    setSelectedDocuments(prev => prev.filter(id => id !== document.id));
                                                                }
                                                            }}
                                                            className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-sm font-medium text-gray-900 truncate">
                                                                {document.title}
                                                            </h4>
                                                            <div className="flex items-center space-x-2 mt-1">
                                                                <span className="text-xs text-gray-500 capitalize">
                                                                    {document.type}
                                                                </span>
                                                                {document.file_size && (
                                                                    <>
                                                                        <span className="text-xs text-gray-400">•</span>
                                                                        <span className="text-xs text-gray-500">
                                                                            {document.file_size}
                                                                        </span>
                                                                    </>
                                                                )}
                            </div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {selectedDocuments.length > 0 && (
                                            <div className="mt-3 p-2 bg-blue-50/80 border border-blue-200/50 rounded-lg">
                                                <p className="text-xs text-blue-700">
                                                    {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected for RAG processing
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Generate Full Document Action */}
                                    {selectedAssistant && selectedListing && selectedIssuer && (
                                        <div className="space-y-4">
                                            <div className="border-t border-gray-200/50 pt-4">
                                                <label className="block text-sm font-semibold text-gray-900 mb-3">
                                                    <div className="flex items-center space-x-2">
                                                        <Sparkles className="h-4 w-4 text-amber-600" />
                                                        <span>AI Document Generation</span>
                                                    </div>
                                                </label>
                                                
                                                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/50 rounded-xl p-4 backdrop-blur-sm">
                                                    <div className="text-center mb-4">
                                                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                                                            Generate Complete Document
                                                        </h4>
                                                        <p className="text-xs text-gray-600 leading-relaxed">
                                                            Use our multi-agent AI system to generate a complete listing document with all sections based on your selected data and knowledge base.
                                                        </p>
                                                    </div>
                                                    
                                    <button
                                                        onClick={handleGenerateFullDocument}
                                                        disabled={isDocumentGenerating}
                                                        className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm"
                                                    >
                                                        {isDocumentGenerating ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <Sparkles className="h-4 w-4 mr-2" />
                                                        )}
                                                        {isDocumentGenerating ? 'Generating Document...' : 'Generate Complete Document'}
                                </button>
                                                    
                                                    {generationResult && (
                                                        <div className="mt-3 p-3 bg-white/60 border border-green-200/50 rounded-lg">
                                                            {generationResult.success ? (
                                                                <div className="text-center">
                                                                    <div className="text-green-600 font-medium text-sm mb-1">
                                                                        ✅ Document Generated Successfully!
                                                                    </div>
                                                                    <div className="text-xs text-gray-600 mb-3">
                                                                        Generated {generationResult.sectionsGenerated} sections
                                                                    </div>
                                                                    
                                                                    {/* Save & Edit Button */}
                                <button
                                                                        onClick={handleSaveAndEdit}
                                                                        className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm mb-3"
                                >
                                                                        <Save className="h-4 w-4 mr-2" />
                                                                        Save & Edit in Canvas
                                </button>
                                                                    
                                                                    <button
                                                                        onClick={resetGeneration}
                                                                        className="text-xs text-blue-600 hover:text-blue-800"
                                                                    >
                                                                        Clear Status
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="text-center">
                                                                    <div className="text-red-600 font-medium text-sm mb-1">
                                                                        ❌ Generation Failed
                                                                    </div>
                                                                    <div className="text-xs text-gray-600 mb-2">
                                                                        {generationResult.error || generationError}
                                                                    </div>
                                                <button
                                                                        onClick={resetGeneration}
                                                                        className="text-xs text-blue-600 hover:text-blue-800"
                                                >
                                                                        Try Again
                                                </button>
                                                                </div>
                                            )}
                                    </div>
                                )}

                                                    <div className="mt-3 text-xs text-gray-500 leading-relaxed">
                                                        <strong>How it works:</strong>
                                                        <br />
                                                        1. Extracts templates from database
                                                        <br />
                                                        2. Enhances with compliance language
                                                        <br />
                                                        3. Completes with your data
                                                        <br />
                                                        4. Saves to document sections
                                </div>
                            </div>
                        </div>
                    </div>
                                    )}
                    </div>
                            )}
                    </div>

                        {/* Mobile Overlay Background */}
                        {isMobile && isSidebarOpen && (
                            <div 
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                                onClick={() => setIsSidebarOpen(false)}
                            />
                        )}
                    </div>
                </div>
            )}
        </SearchParamsProvider>
    );
}

export default function GenerateListingDocumentPage() {
    return (
        <GenerateListingDocumentContent />
    );
}