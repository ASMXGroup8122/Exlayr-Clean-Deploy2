'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Section {
    id: string;
    title: string;
    content: string;
    status: 'pending' | 'generating' | 'completed' | 'locked';
    isLocked: boolean;
}

interface ListingDocumentContent {
    [key: string]: string;
}

interface ListingDocumentData extends Record<string, string | null> {
    document_id: string;
    instrumentid: string;
    instrumentissuerid: string;
    created_at: string;
    updated_at: string;
}

interface SubSection extends Section {
    complianceNotes: string;
    complianceApproved: boolean;
}

export default function GenerateDocumentPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params?.orgId as string;
    const listingId = params?.listingId as string;

    // Core Selection States
    const [selectedAssistant, setSelectedAssistant] = useState('Equity Listing Direct List');
    const [selectedListing, setSelectedListing] = useState(listingId);
    const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState('');
    const [selectedSection, setSelectedSection] = useState('1');

    // Content States
    const [sectionTitle, setSectionTitle] = useState<string>('Cover Page & General Information');
    const [sectionFields, setSectionFields] = useState<string[]>([]);
    const [sectionContent, setSectionContent] = useState<ListingDocumentContent | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Store the full listing data
    const [listingData, setListingData] = useState<ListingDocumentData | null>(null);

    // Initialize currentSectionTitles with section 1 titles
    const [currentSectionTitles, setCurrentSectionTitles] = useState<SubSection[]>(() => {
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
    });

    // Initialize section fields
    useEffect(() => {
        const fields = getSectionFields('1');
        setSectionFields(fields);
        
        // Initialize empty content
        const emptyContent: ListingDocumentContent = {};
        fields.forEach(field => {
            emptyContent[field] = '';
        });
        setSectionContent(emptyContent);
        
        // Initialize with section 1 selected
        handleSectionSelect('1');
    }, []);

    // Helper function to get fields for each section
    const getSectionFields = useCallback((sectionNumber: string): string[] => {
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
    }, []);

    // Section States
    const [sections, setSections] = useState<Section[]>([
        { id: '1', title: 'Cover Page & General Information', content: '', status: 'pending', isLocked: false },
        { id: '2', title: 'Document Information & Securities Details', content: '', status: 'pending', isLocked: false },
        { id: '3', title: 'Issuer Information', content: '', status: 'pending', isLocked: false },
        { id: '4', title: 'Risk Factors', content: '', status: 'pending', isLocked: false },
        { id: '5', title: 'Securities Information', content: '', status: 'pending', isLocked: false },
        { id: '6', title: 'Costs & Fees', content: '', status: 'pending', isLocked: false }
    ]);

    // Add Supabase connection verification
    useEffect(() => {
        const verifyConnection = async () => {
            if (isConnected) return true;

            try {
                const { data, error } = await supabase
                    .from('listingdocumentdirectlisting')
                    .select('count')
                    .limit(1)
                    .single();
                
                if (error) {
                    console.error('Supabase connection error:', error);
                    setError('Database connection failed');
                    setIsConnected(false);
                    return false;
                }
                
                console.log('Supabase connection verified');
                setIsConnected(true);
                return true;
            } catch (err) {
                console.error('Failed to verify Supabase connection:', err);
                setError('Database connection failed');
                setIsConnected(false);
                return false;
            }
        };

        verifyConnection();
    }, [isConnected]);

    // Fetch listing data once on mount
    useEffect(() => {
        const fetchListingData = async () => {
            console.log('=== FETCH LISTING DATA START ===');
            console.log('Selected listing:', selectedListing);
            console.log('URL params:', params);

            if (!selectedListing) {
                console.log('No listing selected');
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Log the request parameters
                console.log('Fetching data with params:', {
                    table: 'listingdocumentdirectlisting',
                    instrumentid: selectedListing,
                    listingId: listingId
                });

                const { data, error } = await supabase
                    .from('listingdocumentdirectlisting')
                    .select('*')
                    .eq('instrumentid', selectedListing)
                    .single();

                // Log ALL fields we get back
                console.log('=== RECEIVED DATA ===');
                if (data) {
                    Object.entries(data).forEach(([key, value]) => {
                        if (key.startsWith('sec')) {
                            console.log(`${key}: ${value}`);
                        }
                    });
                }
                console.log('=== END RECEIVED DATA ===');

                if (error) {
                    console.error('Failed to fetch listing data:', error);
                    setError('Failed to load listing data');
                    return;
                }

                setListingData(data || { instrumentid: selectedListing });

                // Update section statuses
                setSections(prev => {
                    const newSections = prev.map(section => {
                        const sectionFields = getSectionFields(section.id);
                        const hasContent = data && sectionFields.some(field => data[field]);
                        console.log(`Section ${section.id} content check:`, {
                            fields: sectionFields,
                            hasContent,
                            matchingFields: data ? sectionFields.filter(field => data[field]) : []
                        });
                        return {
                            ...section,
                            status: hasContent ? 'completed' as const : 'pending' as const
                        };
                    });
                    return newSections;
                });

                // Select section 1 by default after data is loaded
                handleSectionSelect('1');
            } catch (err) {
                console.error('Failed to fetch listing data:', err);
                setError('Failed to load listing data');
            } finally {
                setIsLoading(false);
                console.log('=== FETCH LISTING DATA END ===');
            }
        };

        fetchListingData();
    }, [selectedListing, getSectionFields]);

    // Helper function to get section titles and structure
    const getSectionTitles = useCallback((sectionNumber: string): SubSection[] => {
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
                    { id: '1', title: 'Title', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Status', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Table of Contents', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Important Dates and Times', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'General Requirements', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Responsible Person', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case '3':
                return [
                    { id: '1', title: 'Status', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'General Info Issuer', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Issuer Prinp Activities', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Issuer Finan Position', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Issuers Administration and Man', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Recent Developments', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '7', title: 'Financial Statements', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case '4':
                return [
                    { id: '1', title: 'Status', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Risk Factors 1', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Risk Factors 2', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Risk Factors 3', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'Risk Factors 4', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Risks 5', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '7', title: 'Risks 6', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '8', title: 'Risks 7', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '9', title: 'Risks 8', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '10', title: 'Risks 9', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '11', title: 'Risks 10', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '12', title: 'Risks 11', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '13', title: 'Risks 12', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '14', title: 'Risks 13', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '15', title: 'Risks 14', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '16', title: 'Risks 15', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '17', title: 'Risks 16', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            case '5':
                return [
                    { id: '1', title: 'Status', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
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
                    { id: '1', title: 'Title', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '2', title: 'Exchange', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '3', title: 'Sponsor Advisor Fees', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '4', title: 'Accounting and Legal Fees', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '5', title: 'MERJ Listing Application First Year Fees', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '6', title: 'Marketing Costs', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '7', title: 'Annual Fees', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '8', title: 'Commission for Subscription', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '9', title: 'Paying Agent', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '10', title: 'Listing Documents', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false },
                    { id: '11', title: 'Compliance Approved', content: '', status: 'pending', isLocked: false, complianceNotes: '', complianceApproved: false }
                ];
            default:
                return [];
        }
    }, []);

    // Field to title mapping
    const getFieldTitle = useCallback((field: string): string => {
        const fieldMap: Record<string, string> = {
            // Section 1
            'sec1_issuer_name': 'Name of Issuing Company',
            'sec1_status': 'Status of Document',
            'sec1_documentname': 'Name of Document',
            'sec1_warning': 'Important Warning Notice',
            'sec1_listingparticulars': 'Details of Listing Particulars',
            'sec1_generalinfo': 'General Company Information',
            'sec1_corporateadvisors': 'Details of Corporate Advisors',
            'sec1_forwardlooking_statements': 'Forward Looking Statements Notice',
            'sec1_boardofdirectors': 'Board of Directors Information',
            'sec1_salientpoints': 'Key Salient Points',
            'sec1_purposeoflisting': 'Purpose and Objectives of Listing',
            'sec1_plansafterlisting': 'Post-Listing Strategic Plans',
            
            // Section 2
            'sec2_title': 'Title',
            'sec2_status': 'Status',
            'sec2_tableofcontents': 'Table of Contents',
            'sec2_importantdatestimes': 'Important Dates and Times',
            'sec2_generalrequirements': 'General Requirements',
            'sec2_responsibleperson': 'Responsible Person',
            'sec2_securitiesparticulars': 'Securities Particulars',
            'sec2_securitiestowhichthisrelates': 'Securities to which this relates',
            
            // Section 3
            'sec3_status': 'Status',
            'sec3_generalinfoissuer': 'General Information About Issuer',
            'sec3_issuerprinpactivities': 'Issuer Principal Activities',
            'sec3_issuerfinanposition': 'Issuer Financial Position',
            'sec3_issuersadministration_and_man': 'Issuer\'s Administration and Management',
            'sec3_recentdevelopments': 'Recent Developments',
            'sec3_financialstatements': 'Financial Statements',
            
            // Section 4
            'sec4_status': 'Status',
            'sec4_riskfactors1': 'Risk Factors (Part 1)',
            'sec4_riskfactors2': 'Risk Factors (Part 2)',
            'sec4_riskfactors3': 'Risk Factors (Part 3)',
            'sec4_riskfactors4': 'Risk Factors (Part 4)',
            'sec4_risks5': 'Risk Factors (Part 5)',
            'sec4_risks6': 'Risk Factors (Part 6)',
            'sec4_risks7': 'Risk Factors (Part 7)',
            'sec4_risks8': 'Risk Factors (Part 8)',
            'sec4_risks9': 'Risk Factors (Part 9)',
            'sec4_risks10': 'Risk Factors (Part 10)',
            'sec4_risks11': 'Risk Factors (Part 11)',
            'sec4_risks12': 'Risk Factors (Part 12)',
            'sec4_risks13': 'Risk Factors (Part 13)',
            'sec4_risks14': 'Risk Factors (Part 14)',
            'sec4_risks15': 'Risk Factors (Part 15)',
            'sec4_risks16': 'Risk Factors (Part 16)',
            
            // Section 5
            'sec5_status': 'Status',
            'sec5_informaboutsecurts1': 'Information About Securities (Part 1)',
            'sec5_informaboutsecurts2': 'Information About Securities (Part 2)',
            'sec5_informaboutsecurts3': 'Information About Securities (Part 3)',
            'sec5_informaboutsecurts4': 'Information About Securities (Part 4)',
            'sec5_informaboutsecurts5': 'Information About Securities (Part 5)',
            'sec5_informaboutsecurts6': 'Information About Securities (Part 6)',
            'sec5_costs': 'Costs',
            
            // Section 6
            'sec6_title': 'Title',
            'sec6_exchange': 'Exchange',
            'sec6_sponsoradvisorfees': 'Sponsor Advisor Fees',
            'sec6_accountingandlegalfees': 'Accounting and Legal Fees',
            'sec6_merjlistingapplication1styearfees': 'MERJ Listing Application First Year Fees',
            'sec6_marketingcosts': 'Marketing Costs',
            'sec6_annualfees': 'Annual Fees',
            'sec6_commissionforsubscription': 'Commission for Subscription',
            'sec6_payingagent': 'Paying Agent',
            'sec6_listingdocuments': 'Listing Documents',
            'sec6_complianceapproved': 'Compliance Approved'
        };
        return fieldMap[field] || field;
    }, []);

    // Type guard for ListingDocumentData
    const isListingDocumentData = (data: unknown): data is ListingDocumentData => {
        return data !== null && typeof data === 'object' && 'instrumentid' in data;
    };

    // Update handleSectionSelect to use existing data
    const handleSectionSelect = useCallback((sectionNumber: string) => {
        console.log('=== SECTION SELECT START ===');
        console.log('Selecting section:', sectionNumber);
        
        // Set section selection immediately
        setSelectedSection(sectionNumber);
        
        const sectionName = sections.find(s => s.id === sectionNumber)?.title;
        setSectionTitle(sectionName || `Section ${sectionNumber}`);

        // Get section titles and fields
        const sectionTitles = getSectionTitles(sectionNumber);
        const fields = getSectionFields(sectionNumber);
        
        console.log('Section fields:', fields);
        setSectionFields(fields);

        // Set content from existing data if available
        const newContent: ListingDocumentContent = {};
        fields.forEach(field => {
            newContent[field] = listingData?.[field] || '';
        });
        setSectionContent(newContent);

        // Update subsection titles and statuses
        const newSubsections = sectionTitles.map((subsection, index) => {
            const field = fields[index];
            const content = listingData?.[field] || '';
            return {
                ...subsection,
                content,
                status: content.trim() !== '' ? 'completed' as const : 'pending' as const
            };
        });
        setCurrentSectionTitles(newSubsections);
        
        console.log('=== SECTION SELECT END ===');
    }, [listingData, sections, getSectionFields, getSectionTitles]);

    const handleGenerateDocument = () => {
        // Placeholder for document generation logic
        router.push(`/dashboard/sponsor/${orgId}/listings/${params.listingId}/document`);
    };

    // Add console logs to the render function
    console.log('Render state:', {
        selectedSection,
        isLoading,
        hasListingData: !!listingData,
        sectionTitlesCount: getSectionTitles(selectedSection).length,
        currentSectionTitlesCount: currentSectionTitles.length
    });

    if (isLoading && !selectedSection) {
        return (
            <div className="p-4">
                <div className="text-center text-gray-500 py-8">
                    Loading document data...
                </div>
            </div>
        );
    }

    if (error && !selectedSection) {
        return (
            <div className="p-4">
                <div className="text-center text-red-500 py-8">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            {/* Top navigation bar */}
            <div className="flex justify-between items-center mb-6">
                <Link
                    href={`/dashboard/sponsor/${orgId}/listings/${params.listingId}`}
                    className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Back to Listings
                </Link>
                <div className="flex gap-2">
                    <Link
                        href={`/dashboard/sponsor/${orgId}/listings/${params.listingId}`}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button 
                        onClick={handleGenerateDocument}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Generate Document
                    </button>
                </div>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-4 gap-4">
                {/* Left sidebar */}
                <div className="col-span-1 space-y-4">
                    {/* Assistant Selection */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-medium text-gray-700 mb-2">Choose an Assistant</h2>
                        <select
                            value={selectedAssistant}
                            onChange={(e) => setSelectedAssistant(e.target.value)}
                            className="w-full p-2 border rounded-md"
                        >
                            <option value="Equity Listing Direct List">Equity Listing Direct List</option>
                        </select>
                    </div>

                    {/* Listing Selection */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-medium text-gray-700 mb-2">Choose a Listing</h2>
                        <select
                            value={selectedListing}
                            className="w-full p-2 border rounded-md"
                            disabled
                        >
                            <option value={listingId}>ASMX Ord</option>
                        </select>
                    </div>

                    {/* Knowledge Base Selection */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-medium text-gray-700 mb-2">Knowledge Base</h2>
                        <select
                            value={selectedKnowledgeBase}
                            onChange={(e) => setSelectedKnowledgeBase(e.target.value)}
                            className="w-full p-2 border rounded-md"
                        >
                            <option value="">Select knowledge base...</option>
                        </select>
                    </div>

                    {/* Section Selection */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-medium text-gray-700 mb-2">Select Section</h2>
                        <select
                            value={selectedSection}
                            onChange={(e) => handleSectionSelect(e.target.value)}
                            className="w-full p-2 border rounded-md"
                        >
                            <option value="">Select a section...</option>
                            {sections.map((section) => (
                                <option key={section.id} value={section.id}>
                                    {section.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerateDocument}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            Generate
                        </button>
                        <button
                            onClick={() => {/* Add check content handler */}}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            Check Content
                        </button>
                    </div>

                    {/* Document Sections List */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-medium text-gray-700">Document Sections</h2>
                            <span className="text-xs text-gray-500">0/12</span>
                        </div>
                        <div className="space-y-2">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => handleSectionSelect(section.id)}
                                    className={`w-full text-left p-2 rounded-lg transition-colors ${
                                        selectedSection === section.id
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    {section.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main content area */}
                <div className="col-span-3">
                    {selectedSection ? (
                        <div className="space-y-4">
                            {getSectionTitles(selectedSection).map((subsection) => {
                                const fieldKey = `sec${selectedSection}_${subsection.id}`;
                                return (
                                    <div key={subsection.id} className="bg-white rounded-lg shadow p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-base font-medium text-gray-900">{subsection.title}</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <textarea
                                                className="w-full min-h-[100px] p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                placeholder={`Enter ${subsection.title.toLowerCase()}`}
                                                value={listingData?.[fieldKey] || ''}
                                                onChange={(e) => {
                                                    const newData = {
                                                        ...(listingData || {
                                                            document_id: '',
                                                            instrumentid: selectedListing,
                                                            instrumentissuerid: '',
                                                            created_at: new Date().toISOString(),
                                                            updated_at: new Date().toISOString()
                                                        }),
                                                        [fieldKey]: e.target.value
                                                    };
                                                    setListingData(newData);
                                                }}
                                            />
                                            <textarea
                                                className="w-full min-h-[50px] p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                                placeholder="Compliance notes..."
                                                value={subsection.complianceNotes || ''}
                                                onChange={(e) => {
                                                    const newTitles = currentSectionTitles.map(title => 
                                                        title.id === subsection.id
                                                            ? { ...title, complianceNotes: e.target.value }
                                                            : title
                                                    );
                                                    setCurrentSectionTitles(newTitles);
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            Please select a section to edit
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 