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
    const [selectedSection, setSelectedSection] = useState('');
    const [inputMessage, setInputMessage] = useState('');
    const [messages, setMessages] = useState<Array<{ type: 'user' | 'assistant', content: string }>>([]);
    const [sectionTitle, setSectionTitle] = useState<string>('');
    const [sectionFields, setSectionFields] = useState<string[]>([]);
    const [sectionContent, setSectionContent] = useState<ListingDocumentContent | null>(null);
    const [prompts, setPrompts] = useState<DirectListingPrompt[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

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
    const [currentSectionTitles, setCurrentSectionTitles] = useState<Section[]>([]);

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
                            const { selectedListing, selectedSection, sectionContent, selectedIssuer: savedSelectedIssuer, selectedDocuments: savedSelectedDocuments } = JSON.parse(savedState);
                            setSelectedListing(selectedListing || '');
                            setSelectedIssuer(savedSelectedIssuer || '');
                            setSelectedDocuments(savedSelectedDocuments || []);
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
                        selectedSection,
                        sectionContent,
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
    }, [selectedListing, selectedSection, sectionContent, isInitialized, orgId, selectedIssuer, selectedDocuments]);

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
        if (!await checkSession()) return;

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
        if (!await checkSession()) return;

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
            data?.forEach(listing => {
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
        if (!await checkSession() || !issuerId) return;

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

            const documents = data?.map(doc => ({
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

    const renderSectionSelect = () => (
        <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
                Select Section
            </label>
            <select
                value={selectedSection}
                onChange={(e) => {
                    setSelectedSection(e.target.value);
                    if (e.target.value) {
                        const titles = getSectionTitles(e.target.value);
                        setCurrentSectionTitles(titles);
                    }
                }}
                className="w-full px-4 py-3 bg-white/60 border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm transition-all duration-300 backdrop-blur-sm"
            >
                <option value="">Choose section...</option>
                {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                        Section {section.id}: {section.title}
                    </option>
                ))}
            </select>
        </div>
    );

    const getSectionTitles = (sectionNumber: string): Section[] => {
        const sectionTitleMappings: Record<string, Section[]> = {
            '1': [{ id: '1', title: 'Warning Notice', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }],
            '2': [{ id: '2', title: 'Listing Particulars', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }],
            '3': [{ id: '3', title: 'General Information', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }],
            '4': [{ id: '4', title: 'Corporate Advisors', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }],
            '5': [{ id: '5', title: 'Forward Looking Statements', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }],
            '6': [{ id: '6', title: 'Board of Directors', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }],
            '7': [{ id: '7', title: 'Salient Points', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }],
            '8': [{ id: '8', title: 'Purpose of Listing', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }],
            '9': [{ id: '9', title: 'Plans After Listing', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }]
        };

        return sectionTitleMappings[sectionNumber] || [];
    };

    const handleToggleLock = (sectionId: string) => {
        setSections(prev => prev.map(section => 
            section.id === sectionId 
                ? { ...section, isLocked: !section.isLocked }
                : section
        ));
    };

    const handleRegenerateSection = async (field: string) => {
        // Implementation for regenerating section
        console.log('Regenerating section:', field);
    };

    const handleGenerateSection = async (sectionId: string | number) => {
        if (!selectedListing || !sectionId) return;
        
        setIsGenerating(true);
        
        // Build context message for AI
        const contextParts = [`Generate Section ${sectionId}: ${sections.find(s => s.id === sectionId.toString())?.title}`];
        
        if (selectedIssuer) {
            const issuer = issuers.find(i => i.id === selectedIssuer);
            if (issuer) {
                contextParts.push(`Client: ${issuer.name} (${issuer.industry})`);
            }
        }
        
        if (selectedKnowledgeBase) {
            const kbOptions: Record<string, string> = {
                'company-filings': 'Company SEC Filings',
                'industry-reports': 'Industry Research Reports', 
                'regulatory-guidance': 'Regulatory Guidance',
                'market-data': 'Market Analysis Data',
                'legal-precedents': 'Legal Precedents',
                'technical-specs': 'Technical Specifications'
            };
            contextParts.push(`Knowledge Base: ${kbOptions[selectedKnowledgeBase] || selectedKnowledgeBase}`);
        }
        
        // Add user message to chat
        setMessages(prev => [...prev, {
            type: 'user',
            content: contextParts.join('\n')
        }]);

        try {
            // Simulate AI generation process
            setMessages(prev => [...prev, {
                type: 'assistant',
                content: `Starting generation for Section ${sectionId}...`
            }]);

            // Update section status
            setSections(prev => prev.map(section => 
                section.id === sectionId.toString()
                    ? { ...section, status: 'generating' }
                    : section
            ));

            // Simulate async generation
            setTimeout(() => {
                setSections(prev => prev.map(section => 
                    section.id === sectionId.toString()
                        ? { ...section, status: 'completed', content: `Generated content for ${section.title}` }
                        : section
                ));

                setMessages(prev => [...prev, {
                    type: 'assistant',
                    content: `✅ Section ${sectionId} has been successfully generated!`
                }]);

                setIsGenerating(false);
            }, 2000);

        } catch (error) {
            console.error('Error generating section:', error);
            setMessages(prev => [...prev, {
                type: 'assistant',
                content: `❌ Failed to generate Section ${sectionId}. Please try again.`
            }]);
            setIsGenerating(false);
        }
    };

    const handleUpdateSection = async (field: string) => {
        console.log('=== UPDATE SECTION DEBUG START ===');
        console.log('Field to update:', field);
        console.log('Selected listing:', selectedListing);
        console.log('Section content:', sectionContent);

        if (!selectedListing || !sectionContent) {
            console.error('Missing required data for update');
            return;
        }

        const fieldValue = sectionContent[field];
        console.log('Field value:', fieldValue);

        if (!fieldValue) {
            console.error('No content to update for field:', field);
            return;
        }

        // Show loading state
        const fieldElement = document.getElementById(`${field}-save-status`);
        if (fieldElement) {
            fieldElement.classList.add('saving');
        }

        try {
            const maxRetries = 3;
            let retryCount = 0;
            
            // Function to attempt the update
            const attemptUpdate = async (): Promise<boolean> => {
                retryCount++;
                console.log(`Update attempt ${retryCount}/${maxRetries}`);

                try {
                    // Check session before each attempt
                    if (!await checkSession()) {
                        throw new Error('Session validation failed');
                    }

                    // Prepare update data
                    const updateData = { [field]: fieldValue };
                    console.log('Update data:', updateData);

                    // Perform update
                    const { data, error } = await supabase
                        .from('listing')
                        .update(updateData)
                        .eq('instrumentid', selectedListing)
                        .select();

                    if (error) {
                        console.error('Supabase update error:', error);
                        if (error.message.includes('JWT') || error.message.includes('session')) {
                            throw new Error('Session expired. Please refresh and try again.');
                        }
                        throw error;
                    }

                    console.log('Update successful:', data);
                    
                    // Show success state
                    if (fieldElement) {
                        fieldElement.classList.remove('saving');
                        fieldElement.classList.add('saved');
                        setTimeout(() => {
                            fieldElement.classList.remove('saved');
                        }, 2000);
                    }

                    setMessages(prev => [...prev, {
                        type: 'assistant',
                        content: `✅ ${getFieldLabel(field)} updated successfully!`
                    }]);

                    return true;
                } catch (error) {
                    console.error(`Update attempt ${retryCount} failed:`, error);
                    
                    if (retryCount >= maxRetries) {
                        throw error;
                    }
                    
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                    return false;
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

    // Update sections when document type changes
    useEffect(() => {
        if (selectedAssistant) {
            const newSections = getSectionsForDocumentType(selectedAssistant);
            setSections(newSections);
            // Reset section selection when document type changes
            setSelectedSection('');
            setCurrentSectionTitles([]);
        }
    }, [selectedAssistant]);

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
                    </div>
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center max-w-md px-4">
                                <div className="mx-auto rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-100 mb-4 sm:mb-6">
                                    <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">AI Document Generator</h3>
                                <p className="text-gray-600 text-sm sm:text-base">Select a section and click Generate to start creating your document content.</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((message, index) => (
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
                        ))
                    )}

                    {/* Loading Message */}
                    {isGenerating && (
                        <div className="flex gap-2 sm:gap-3 md:gap-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0">
                                AI
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                    <span className="text-gray-500 text-sm sm:text-base">Generating content...</span>
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
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                        className="p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg"
                                    >
                                        {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                                    </Button>
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className={cn(
                                        "p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg flex-shrink-0",
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
                                </Button>
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
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedAssistant('')}
                                                        className="p-1 hover:bg-gray-100 text-gray-500"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
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
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedIssuer('')}
                                                        className="p-1 hover:bg-gray-100 text-gray-500"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
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

                                    {/* Section Selection */}
                                    {renderSectionSelect()}

                                    {/* Generate Actions */}
                                    {selectedAssistant && selectedListing && selectedIssuer && selectedSection && (
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => handleGenerateSection(selectedSection)}
                                                disabled={isGenerating}
                                                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
                                            >
                                                {isGenerating ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4 mr-2" />
                                                )}
                                                {isGenerating ? 'Generating...' : 'Generate Section'}
                                            </button>

                                            <button
                                                onClick={() => selectedSection ? handleGenerateSection(selectedSection) : null}
                                                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                                            >
                                                <Search className="h-4 w-4 mr-2" />
                                                Check Content
                                            </button>
                                        </div>
                                    )}

                                    {/* Document Progress */}
                                    {selectedAssistant && selectedSection && (
                                        <div>
                                            <div className="flex items-center justify-between text-sm font-semibold text-gray-900 mb-4">
                                                <span>Document Progress</span>
                                                <span className="text-blue-600">
                                                    {sections.filter(s => s.status === 'completed').length}/{sections.length}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                {sections.map((section, index) => (
                                                    <div
                                                        key={section.id}
                                                        className="border border-white/50 rounded-xl p-3 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all duration-300"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                                <div className="flex-shrink-0">
                                                                    {section.status === 'completed' ? (
                                                                        <Check className="h-4 w-4 text-green-500" />
                                                                    ) : section.status === 'generating' ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                                                    ) : (
                                                                        <Clock className="h-4 w-4 text-gray-400" />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <h4 className="font-medium text-sm truncate text-gray-900">{section.title}</h4>
                                                                    <p className="text-xs truncate mt-0.5 text-gray-500 capitalize">{section.status}</p>
                                                                </div>
                                                            </div>
                                                            {section.status === 'pending' && (
                                                                <Button
                                                                    onClick={() => handleGenerateSection(section.id)}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="p-2 hover:bg-blue-50 text-blue-600"
                                                                >
                                                                    <Send className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
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