'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import DocumentCommentSection from './DocumentCommentSection';
import AIAssistantButton from '../ai-assistant/AIAssistantButton';
import DocumentComplianceIndicator from './DocumentComplianceIndicator';
import AIRevisionRequest from './AIRevisionRequest';
import DocumentAnalysisButton from './DocumentAnalysisButton';
import { DocumentReviewCycle, RevisionRequest, DocumentReviewCycleStatus, ReviewStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import SectionReview from './SectionReview';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { DocumentAnalysisProvider } from '@/contexts/DocumentAnalysisContext';
import { cn } from '@/lib/utils';

// Types for document sections
interface DocumentSection {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress';
  group: string;
}

interface DocumentVersion {
  id: string;
  version: number;
  created_at: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

interface DocumentReviewDetailProps {
  documentId: string;
  onSectionSelect?: (section: {
    id: string;
    title: string;
    content: string;
  }) => void;
}

// Add this interface for section groups
interface SectionGroup {
  id: string;
  title: string;
  sections: DocumentSection[];
}

export default function DocumentReviewDetail({ 
  documentId,
  onSectionSelect 
}: DocumentReviewDetailProps) {
  const [document, setDocument] = useState<any>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<DocumentSection | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [sectionGroups, setSectionGroups] = useState<SectionGroup[]>([]);
  const [selectedSectionGroup, setSelectedSectionGroup] = useState<string>('sec1');
  const [selectedCommentType, setSelectedCommentType] = useState<'comment' | 'revision' | 'approval' | 'rejection'>('comment');
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [documentsColumnCollapsed, setDocumentsColumnCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedRevisionRequests, setDismissedRevisionRequests] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentReviewCycle, setCurrentReviewCycle] = useState<DocumentReviewCycle | null>(null);
  const [revisionRequests, setRevisionRequests] = useState<RevisionRequest[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isAnalysisButtonBusy, setIsAnalysisButtonBusy] = useState(false);
  
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (documentId) {
      console.log('DocumentReviewDetail: Fetching details for document ID:', documentId);
      fetchDocumentDetails();
    }
  }, [documentId]);

  // Add the missing fetchComments function
  const fetchComments = async () => {
    if (!documentId) return;
    
    try {
      console.log('Fetching comments for document ID:', documentId);
      const { data, error: commentsError } = await supabase
        .from('document_comments')
        .select('*')
        .eq('document_id', documentId);
        
      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
      } else {
        const commentsData = data || [];
        console.log(`Successfully fetched ${commentsData.length} comments`);
        setComments(commentsData);
      }
    } catch (err) {
      console.error('Error in comments fetch:', err);
    }
  };

  const fetchDocumentDetails = async () => {
    if (!documentId) return;
    
    setLoading(true);
    try {
      console.log('Fetching listing details for ID:', documentId);
      
      // Fetch the listing details
      const { data: listingData, error: listingError } = await supabase
        .from('listing')
        .select(`
          instrumentid,
          instrumentname,
          instrumentsponsor,
          instrumentsecuritiesadmissionstatus,
          instrumentupdatedat,
          instrumentlistingtype,
          instrumentcreatedby
        `)
        .eq('instrumentid', documentId)
        .single();

      if (listingError) {
        console.error('Error fetching listing details:', listingError);
        throw listingError;
      }

      if (!listingData) {
        console.error('No listing found with ID:', documentId);
        throw new Error('Listing not found');
      }

      console.log('Successfully fetched listing:', listingData.instrumentname);

      // Map the listing data to our document format
      const documentData = {
        id: listingData.instrumentid,
        title: listingData.instrumentname,
        sponsor: listingData.instrumentsponsor,
        status: listingData.instrumentsecuritiesadmissionstatus,
        created_at: listingData.instrumentupdatedat, // Using updated_at as created_at for now
        updated_at: listingData.instrumentupdatedat,
        listing_type: listingData.instrumentlistingtype,
        created_by: listingData.instrumentcreatedby
      };

      // Fetch document sections from listingdocumentdirectlisting
      console.log('Fetching document sections for listing ID:', documentId);
      let sectionData = null;
      let sectionError = null;
      
      try {
        console.log('Executing Supabase query for document sections with instrumentid:', documentId);
        
        const result = await supabase
          .from('listingdocumentdirectlisting')
          .select('*')
          .eq('instrumentid', documentId)
          .single();
          
        sectionData = result.data;
        sectionError = result.error;
        
        console.log('Supabase query result:', {
          data: sectionData ? 'Data found' : 'No data',
          error: sectionError ? sectionError.message : 'No error',
          status: result.status,
          statusText: result.statusText
        });
        
        if (sectionError) {
          console.log('No sections found in listingdocumentdirectlisting, error:', sectionError);
          if (sectionError.code === 'PGRST116') {
            console.log('This is a "no rows returned" error, which is expected if no document exists yet');
          }
        } else {
          console.log('Successfully fetched document sections');
        }
      } catch (err) {
        console.error('Error fetching section data:', err);
        sectionError = err;
      }

      // If we have section data, map it to our sections format
      let documentSections: DocumentSection[] = [];
      
      if (sectionData) {
        console.log('Mapping section data to UI format');
        console.log('Section data from database:', JSON.stringify(sectionData, null, 2));
        
        // Extract section data from the document using the correct field names
        // Section 1: General Information
        const sec1Sections = [
          {
            id: '1',
            title: 'Warning Notice',
            content: sectionData.sec1_warning || 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '2',
            title: 'Listing Particulars',
            content: sectionData.sec1_listingparticulars || 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '3',
            title: 'General Information',
            content: sectionData.sec1_generalinfo || 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '4',
            title: 'Corporate Advisors',
            content: sectionData.sec1_corporateadvisors || 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '5',
            title: 'Forward Looking Statements',
            content: sectionData.sec1_forwardlooking_statements || 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '6',
            title: 'Board of Directors',
            content: sectionData.sec1_boardofdirectors || 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '7',
            title: 'Salient Points',
            content: sectionData.sec1_salientpoints || 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '8',
            title: 'Purpose of Listing',
            content: sectionData.sec1_purposeoflisting || 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '9',
            title: 'Plans After Listing',
            content: sectionData.sec1_plansafterlisting || 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          }
        ];
        
        // Section 2: Table of Contents
        const sec2Sections = [
          {
            id: '11',
            title: 'Table of Contents',
            content: sectionData.sec2_tableofcontents || 'No content available',
            status: 'pending' as const,
            group: 'sec2'
          },
          {
            id: '12',
            title: 'Important Dates & Times',
            content: sectionData.sec2_importantdatestimes || 'No content available',
            status: 'pending' as const,
            group: 'sec2'
          },
          {
            id: '13',
            title: 'General Requirements',
            content: sectionData.sec2_generalrequirements || 'No content available',
            status: 'pending' as const,
            group: 'sec2'
          },
          {
            id: '14',
            title: 'Responsible Person',
            content: sectionData.sec2_responsibleperson || 'No content available',
            status: 'pending' as const,
            group: 'sec2'
          },
          {
            id: '15',
            title: 'Securities Particulars',
            content: sectionData.sec2_securitiesparticulars || 'No content available',
            status: 'pending' as const,
            group: 'sec2'
          }
        ];
        
        // Section 3: Issuer Information
        const sec3Sections = [
          {
            id: '16',
            title: 'General Information',
            content: sectionData.sec3_generalinfoissuer || 'No content available',
            status: 'pending' as const,
            group: 'sec3'
          },
          {
            id: '17',
            title: 'Principal Activities',
            content: sectionData.sec3_issuerprinpactivities || 'No content available',
            status: 'pending' as const,
            group: 'sec3'
          },
          {
            id: '18',
            title: 'Financial Position',
            content: sectionData.sec3_issuerfinanposition || 'No content available',
            status: 'pending' as const,
            group: 'sec3'
          },
          {
            id: '19',
            title: 'Administration & Management',
            content: sectionData.sec3_issuersadministration_and_man || 'No content available',
            status: 'pending' as const,
            group: 'sec3'
          },
          {
            id: '20',
            title: 'Recent Developments',
            content: sectionData.sec3_recentdevelopments || 'No content available',
            status: 'pending' as const,
            group: 'sec3'
          },
          {
            id: '21',
            title: 'Financial Statements',
            content: sectionData.sec3_financialstatements || 'No content available',
            status: 'pending' as const,
            group: 'sec3'
          }
        ];
        
        // Section 4: Risk Factors
        const sec4Sections = [
          {
            id: '10',
            title: 'Risk Factor 1: Market and Industry Risks',
            content: sectionData.sec4_riskfactors1 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-2',
            title: 'Risk Factor 2: Financial Risks',
            content: sectionData.sec4_riskfactors2 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-3',
            title: 'Risk Factor 3: Operational Risks',
            content: sectionData.sec4_riskfactors3 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-4',
            title: 'Risk Factor 4: Reputational Risks',
            content: sectionData.sec4_riskfactors4 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-5',
            title: 'Risk Factor 5: Technology Risks',
            content: sectionData.sec4_risks5 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-6',
            title: 'Risk Factor 6: Regulatory Risks',
            content: sectionData.sec4_risks6 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-7',
            title: 'Risk Factor 7',
            content: sectionData.sec4_risks7 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-8',
            title: 'Risk Factor 8',
            content: sectionData.sec4_risks8 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-9',
            title: 'Risk Factor 9',
            content: sectionData.sec4_risks9 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-10',
            title: 'Risk Factor 10',
            content: sectionData.sec4_risks10 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-11',
            title: 'Risk Factor 11',
            content: sectionData.sec4_risks11 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-12',
            title: 'Risk Factor 12',
            content: sectionData.sec4_risks12 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-13',
            title: 'Risk Factor 13',
            content: sectionData.sec4_risks13 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-14',
            title: 'Risk Factor 14',
            content: sectionData.sec4_risks14 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-15',
            title: 'Risk Factor 15',
            content: sectionData.sec4_risks15 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-16',
            title: 'Risk Factor 16',
            content: sectionData.sec4_risks16 || 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          }
        ].filter(section => section.content !== 'No content available');
        
        // Section 5: Securities Information
        const sec5Sections = [
          {
            id: '22',
            title: 'Securities Information 1',
            content: sectionData.sec5_informaboutsecurts1 || 'No content available',
            status: 'pending' as const,
            group: 'sec5'
          },
          {
            id: '23',
            title: 'Securities Information 2',
            content: sectionData.sec5_informaboutsecurts2 || 'No content available',
            status: 'pending' as const,
            group: 'sec5'
          },
          {
            id: '24',
            title: 'Securities Information 3',
            content: sectionData.sec5_informaboutsecurts3 || 'No content available',
            status: 'pending' as const,
            group: 'sec5'
          },
          {
            id: '25',
            title: 'Securities Information 4',
            content: sectionData.sec5_informaboutsecurts4 || 'No content available',
            status: 'pending' as const,
            group: 'sec5'
          },
          {
            id: '26',
            title: 'Securities Information 5',
            content: sectionData.sec5_informaboutsecurts5 || 'No content available',
            status: 'pending' as const,
            group: 'sec5'
          },
          {
            id: '27',
            title: 'Securities Information 6',
            content: sectionData.sec5_informaboutsecurts6 || 'No content available',
            status: 'pending' as const,
            group: 'sec5'
          },
          {
            id: '28',
            title: 'Costs',
            content: sectionData.sec5_costs || 'No content available',
            status: 'pending' as const,
            group: 'sec5'
          }
        ];
        
        // Section 6: Costs & Fees
        const sec6Sections = [
          {
            id: '29',
            title: 'Exchange',
            content: sectionData.sec6_exchange || 'No content available',
            status: 'pending' as const,
            group: 'sec6'
          },
          {
            id: '30',
            title: 'Sponsor Advisor Fees',
            content: sectionData.sec6_sponsoradvisorfees || 'No content available',
            status: 'pending' as const,
            group: 'sec6'
          },
          {
            id: '31',
            title: 'Accounting & Legal Fees',
            content: sectionData.sec6_accountingandlegalfees || 'No content available',
            status: 'pending' as const,
            group: 'sec6'
          },
          {
            id: '32',
            title: 'MERJ Listing Application & First Year Fees',
            content: sectionData.sec6_merjlistingapplication1styearfees || 'No content available',
            status: 'pending' as const,
            group: 'sec6'
          },
          {
            id: '33',
            title: 'Marketing Costs',
            content: sectionData.sec6_marketingcosts || 'No content available',
            status: 'pending' as const,
            group: 'sec6'
          },
          {
            id: '34',
            title: 'Annual Fees',
            content: sectionData.sec6_annualfees || 'No content available',
            status: 'pending' as const,
            group: 'sec6'
          },
          {
            id: '35',
            title: 'Commission for Subscription',
            content: sectionData.sec6_commissionforsubscription || 'No content available',
            status: 'pending' as const,
            group: 'sec6'
          },
          {
            id: '36',
            title: 'Paying Agent',
            content: sectionData.sec6_payingagent || 'No content available',
            status: 'pending' as const,
            group: 'sec6'
          },
          {
            id: '37',
            title: 'Listing Documents',
            content: sectionData.sec6_listingdocuments || 'No content available',
            status: 'pending' as const,
            group: 'sec6'
          },
          {
            id: '38',
            title: 'Compliance Approved',
            content: sectionData.sec6_complianceapproved || 'No content available',
            status: 'pending' as const,
            group: 'sec6'
          }
        ];
        
        // Combine all sections
        documentSections = [
          ...sec1Sections,
          ...sec2Sections,
          ...sec3Sections,
          ...sec4Sections,
          ...sec5Sections,
          ...sec6Sections
        ];
      } else {
        console.log('No section data found, creating empty sections');
        // If no section data, create empty sections that match the database schema
        // We'll just create the Section 1 sections for now
        documentSections = [
          {
            id: '1',
            title: 'Warning Notice',
            content: 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '2',
            title: 'Listing Particulars',
            content: 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '3',
            title: 'General Information',
            content: 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '4',
            title: 'Corporate Advisors',
            content: 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '5',
            title: 'Forward Looking Statements',
            content: 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '6',
            title: 'Board of Directors',
            content: 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '7',
            title: 'Salient Points',
            content: 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '8',
            title: 'Purpose of Listing',
            content: 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '9',
            title: 'Plans After Listing',
            content: 'No content available',
            status: 'pending' as const,
            group: 'sec1'
          },
          {
            id: '10',
            title: 'Risk Factor 1',
            content: 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          },
          {
            id: '10-2',
            title: 'Risk Factor 2',
            content: 'No content available',
            status: 'pending' as const,
            group: 'sec4'
          }
        ];
      }

      // Fetch comments for this document
      await fetchComments();

      // Mock versions for now - this could be replaced with real version data
      const mockVersions: DocumentVersion[] = [
        {
          id: 'v1',
          version: 1,
          created_at: listingData.instrumentupdatedat,
          status: 'submitted'
        }
      ];
      
      console.log('Setting state with fetched data');
      setDocument(documentData);
      setSections(documentSections);
      setVersions(mockVersions);
      
      // Only set selected section if we have sections
      if (documentSections.length > 0) {
        setSelectedSection(documentSections[0]); // Select first section by default
      }
      
      setError(null);
      console.log('Document details loaded successfully');
    } catch (err) {
      console.error('Error fetching document details:', err);
      setError('Failed to load document details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update the useEffect that creates section groups to include all sections from the schema
  useEffect(() => {
    if (sections.length > 0) {
      // Organize sections into groups based on the database schema
      const groups: SectionGroup[] = [
        {
          id: 'sec1',
          title: 'Section 1: General Information',
          sections: sections.filter(s => s.group === 'sec1')
        },
        {
          id: 'sec2',
          title: 'Section 2: Table of Contents',
          sections: sections.filter(s => s.group === 'sec2')
        },
        {
          id: 'sec3',
          title: 'Section 3: Issuer Information',
          sections: sections.filter(s => s.group === 'sec3')
        },
        {
          id: 'sec4',
          title: 'Section 4: Risk Factors',
          sections: sections.filter(s => s.group === 'sec4')
        },
        {
          id: 'sec5',
          title: 'Section 5: Securities Information',
          sections: sections.filter(s => s.group === 'sec5')
        },
        {
          id: 'sec6',
          title: 'Section 6: Costs & Fees',
          sections: sections.filter(s => s.group === 'sec6')
        }
      ];
      
      setSectionGroups(groups);
    }
  }, [sections]);

  // Add a useEffect to initialize all sections as collapsed except the selected one
  useEffect(() => {
    // Initialize all sections as collapsed
    if (sections.length > 0) {
      const initialCollapsedSections: Record<string, boolean> = {};
      sections.forEach(section => {
        // All sections are collapsed by default
        initialCollapsedSections[section.id] = true;
      });
      
      // If there's a selected section, uncollapse it
      if (selectedSection) {
        initialCollapsedSections[selectedSection.id] = false;
        
        // Also uncollapse its group
        const newCollapsedGroups: Record<string, boolean> = {};
        sectionGroups.forEach(group => {
          newCollapsedGroups[group.id] = group.id !== selectedSection.group;
        });
        setCollapsedGroups(newCollapsedGroups);
      }
      
      setCollapsedSections(initialCollapsedSections);
    }
  }, [sections, selectedSection, sectionGroups]);

  // Modify the handleSectionChange function to ensure it collapses all sections except the selected one
  const handleSectionChange = (section: DocumentSection) => {
    // Set the selected section
    setSelectedSection(section);
    setShowComments(false);
    
    // Collapse all sections except the selected one
    const newCollapsedSections: Record<string, boolean> = {};
    sections.forEach(s => {
      newCollapsedSections[s.id] = s.id !== section.id;
    });
    setCollapsedSections(newCollapsedSections);
    
    // Expand the group containing the selected section
    const groupId = section.group;
    const newCollapsedGroups: Record<string, boolean> = {};
    sectionGroups.forEach(g => {
      newCollapsedGroups[g.id] = g.id !== groupId;
    });
    setCollapsedGroups(newCollapsedGroups);
    
    // Notify the parent component if the callback is provided
    if (onSectionSelect) {
      onSectionSelect({
        id: section.id,
        title: section.title,
        content: section.content,
      });
    }
  };
  
  const handleVersionChange = (version: number) => {
    setCurrentVersion(version);
    // In a real implementation, this would fetch the document data for the selected version
  };
  
  // Simplified function to handle section status changes via comments
  const handleSectionStatusChange = async (sectionId: string, status: 'pending' | 'in_progress' | 'completed') => {
    // Map the status from SectionReview to DocumentSection status
    const statusMap = {
      'pending': 'pending' as const,
      'in_progress': 'needs_revision' as const,
      'completed': 'approved' as const
    };

    const documentSectionStatus = statusMap[status];
    
    const updatedSections = sections.map(section => {
      if (section.id === sectionId) {
        return { ...section, status: documentSectionStatus };
      }
      return section;
    });
    
    setSections(updatedSections);
  };
  
  // Update the handleCommentStatusChange function to use the correct type
  const handleCommentStatusChange = (sectionId: string, status: 'pending' | 'addressed' | 'ignored') => {
    // If a revision request has been addressed, update the section status
    if (status === 'addressed') {
      // Find the section
      const section = sections.find(s => s.id === sectionId);
      if (section && section.status === 'needs_revision') {
        // Update the section status to pending (or another appropriate status)
        setSections(prevSections => 
          prevSections.map(s => 
            s.id === sectionId 
              ? { ...s, status: 'pending' } 
              : s
          )
        );
      }
    }
  };
  
  const handleToggleComments = () => {
    setShowComments(!showComments);
  };

  const getSectionCommentsCount = (sectionId: string) => {
    return comments.filter(comment => comment.section_id === sectionId).length;
  };

  // Add a handler for section group selection
  const handleSectionGroupChange = (groupId: string) => {
    setSelectedSectionGroup(groupId);
    
    // Find the first section in the selected group and select it
    const group = sectionGroups.find(g => g.id === groupId);
    if (group && group.sections.length > 0) {
      setSelectedSection(group.sections[0]);
      
      // Notify the parent component if the callback is provided
      if (onSectionSelect) {
        onSectionSelect({
          id: group.sections[0].id,
          title: group.sections[0].title,
          content: group.sections[0].content,
        });
      }
    }
  };

  // Handle section selection
  const handleSectionSelect = (section: DocumentSection) => {
    setSelectedSection(section);
    
    // Notify the parent component if the callback is provided
    if (onSectionSelect) {
      onSectionSelect({
        id: section.id,
        title: section.title,
        content: section.content,
      });
    }
  };

  // Modify the toggleSectionCollapse function to work with the accordion behavior
  const toggleSectionCollapse = (sectionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering section selection
    
    // Toggle the collapsed state of the clicked section
    setCollapsedSections(prev => {
      const newState = { ...prev };
      newState[sectionId] = !prev[sectionId];
      return newState;
    });
    
    // If we're expanding a section, make sure it's the only one expanded
    if (collapsedSections[sectionId]) {
      // This section is currently collapsed and will be expanded
      // Collapse all other sections
      const newCollapsedSections: Record<string, boolean> = {};
      sections.forEach(section => {
        newCollapsedSections[section.id] = section.id !== sectionId;
      });
      setCollapsedSections(newCollapsedSections);
      
      // Find the group for this section
      const section = sections.find(s => s.id === sectionId);
      if (section) {
        // Expand only this section's group
        const groupId = section.group;
        const newCollapsedGroups: Record<string, boolean> = {};
        sectionGroups.forEach(group => {
          newCollapsedGroups[group.id] = group.id !== groupId;
        });
        setCollapsedGroups(newCollapsedGroups);
        
        // Also set this as the selected section
        setSelectedSection(section);
      }
    }
  };

  // Add a function to toggle left sidebar collapse
  const toggleLeftSidebar = () => {
    setLeftSidebarCollapsed(!leftSidebarCollapsed);
  };

  // Add a function to toggle right sidebar collapse
  const toggleRightSidebar = () => {
    setRightSidebarCollapsed(!rightSidebarCollapsed);
  };

  // Add a function to toggle section group collapse
  const toggleGroupCollapse = (groupId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering section selection
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Add a toggle function for the documents column
  const toggleDocumentsColumn = () => {
    setDocumentsColumnCollapsed(!documentsColumnCollapsed);
  };

  const handleRevisionRequestDismiss = (sectionId: string) => {
    setDismissedRevisionRequests(prev => new Set([...prev, sectionId]));
  };

  // Start a new review cycle when analyzing the document
  const handleStartReview = async () => {
    try {
      if (currentReviewCycle) {
        const updatedCycle: DocumentReviewCycle = {
          ...currentReviewCycle,
          status: 'in_progress'
        };
        setCurrentReviewCycle(updatedCycle);
      }
      await fetchDocumentDetails();
    } catch (error) {
      console.error('Error starting review:', error);
    }
  };

  const handleCompleteReview = async () => {
    try {
      if (currentReviewCycle) {
        const updatedCycle: DocumentReviewCycle = {
          ...currentReviewCycle,
          status: 'completed'
        };
        setCurrentReviewCycle(updatedCycle);
      }
      await fetchDocumentDetails();
    } catch (error) {
      console.error('Error completing review:', error);
    }
  };

  // Load revision requests when a review cycle is active
  useEffect(() => {
    if (currentReviewCycle) {
      const fetchRevisionRequests = async () => {
        const { data } = await supabase
          .from('revision_requests')
          .select('*')
          .eq('review_cycle_id', currentReviewCycle.id);

        if (data) {
          setRevisionRequests(data);
        }
      };

      fetchRevisionRequests();
    }
  }, [currentReviewCycle]);

  const getStatusBadgeVariant = (status: string | undefined): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'default';
      case 'under_review':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleAnalysisStatusChange = (isAnalyzing: boolean) => {
    setIsAnalysisButtonBusy(isAnalyzing);
    // Optionally, handle other logic when analysis starts/stops
    if (isAnalyzing) {
      // Logic when analysis starts
    } else {
      // Logic when analysis stops
    }
  };

  // Update the document header to include review actions
  const renderDocumentHeader = () => (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">{document?.title || 'Document Review'}</h2>
        <Badge variant={getStatusBadgeVariant(document?.status)}>{document?.status || 'Unknown'}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <DocumentAnalysisButton
          documentId={documentId}
          sections={sections}
          onAnalysisStart={handleStartReview}
          isExternallyAnalyzing={isAnalysisButtonBusy}
          onAnalyzingChange={handleAnalysisStatusChange}
        />
      </div>
    </div>
  );

  // Update the section rendering in the main content area
  const renderSection = (section: DocumentSection) => {
    const isSelected = selectedSection?.id === section.id;
    const commentsCount = getSectionCommentsCount(section.id);
    
    return (
      <div 
        key={section.id}
        className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
        onClick={() => handleSectionSelect(section)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium">{section.title}</h3>
            {/* Removed content preview */}
          </div>
          <div className="flex items-center space-x-2">
            {/* Add the compliance indicator */}
            <DocumentComplianceIndicator sectionId={section.id} />
            
            {commentsCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {commentsCount}
              </span>
            )}
            <div className={`w-2 h-2 rounded-full ${
              section.status === 'approved' ? 'bg-green-500' : 
              section.status === 'rejected' ? 'bg-red-500' : 
              section.status === 'needs_revision' ? 'bg-yellow-500' : 
              'bg-gray-300'
            }`} />
          </div>
        </div>
      </div>
    );
  };

  const handleReviewCycleCreated = (cycleId: string) => {
    setCurrentReviewCycle({ id: cycleId, status: 'in_progress' } as DocumentReviewCycle);
  };

  // Render the selected section content
  const renderSelectedSectionContent = () => {
    if (!selectedSection) return null;

    return (
      <div className="flex flex-col gap-4">
        <div className="prose max-w-none">
          <h3>{selectedSection.title}</h3>
          <div className="whitespace-pre-wrap">{selectedSection.content}</div>
        </div>
        <div className="mt-4">
          <DocumentAnalysisButton 
            documentId={documentId} 
            sections={sections}
            onReviewCycleCreated={handleReviewCycleCreated}
            isExternallyAnalyzing={isAnalysisButtonBusy}
            onAnalyzingChange={handleAnalysisStatusChange}
          />
        </div>
        {selectedSection && (
          <SectionReview
            documentId={documentId}
            sectionId={selectedSection.id}
            reviewCycleId={currentReviewCycle?.id || ''}
            content={selectedSection.content}
            version={currentVersion}
            onStatusChange={(status) => handleSectionStatusChange(selectedSection.id, status)}
          />
        )}
      </div>
    );
  };

  const handleStatusChange = async (status: DocumentReviewCycleStatus) => {
    try {
      if (currentReviewCycle) {
        const updatedCycle: DocumentReviewCycle = {
          ...currentReviewCycle,
          status
        };
        setCurrentReviewCycle(updatedCycle);
      }
      await fetchDocumentDetails();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAnalysisStart = async () => {
    try {
      setCurrentReviewCycle(prev => prev ? {
        ...prev,
        status: 'in_progress' as DocumentReviewCycleStatus
      } : null);
      
      await fetchDocumentDetails();
    } catch (error) {
      console.error('Error starting analysis:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-6">
        {error}
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center p-6">
        No document selected or document not found.
      </div>
    );
  }

  return (
    <DocumentAnalysisProvider documentId={documentId}>
      <div className="flex flex-col h-full">
        {renderDocumentHeader()}
        
        <div className="flex flex-1 overflow-hidden">
          {/* Documents column with fixed position toggle button */}
          <div className={`relative transition-all duration-300 ${documentsColumnCollapsed ? 'w-12' : 'w-64'}`}>
            {/* Fixed position toggle button */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-white border-r border-b">
              <button 
                onClick={toggleDocumentsColumn}
                className="w-full p-2 flex justify-center items-center hover:bg-gray-100"
              >
                {documentsColumnCollapsed ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>

            {/* Content with padding-top to account for fixed header */}
            {!documentsColumnCollapsed && (
              <div className="border-r overflow-y-auto h-full" style={{ paddingTop: '40px' }}>
                <div className="p-3 border-b">
                  <h3 className="font-medium">Documents</h3>
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Search documents..."
                      className="w-full px-3 py-2 border rounded text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Section group selector */}
                <div className="p-3 border-b">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section Group
                  </label>
                  <select
                    className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                    value={selectedSectionGroup}
                    onChange={(e) => handleSectionGroupChange(e.target.value)}
                  >
                    {sectionGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.title}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Show all section groups with collapsible sections */}
                {sectionGroups.map((group) => (
                  <div key={group.id} className="mb-2 border-b">
                    <div 
                      className="px-3 py-2 bg-gray-100 font-medium text-sm text-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                      onClick={(e) => toggleGroupCollapse(group.id, e)}
                    >
                      <span>{group.title}</span>
                      <button className="p-1 rounded-full hover:bg-gray-300">
                        {collapsedGroups[group.id] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {!collapsedGroups[group.id] && (
                      <ul className="divide-y divide-gray-200">
                        {group.sections.length > 0 ? (
                          group.sections.map((section) => (
                            <li key={section.id}>
                              {renderSection(section)}
                            </li>
                          ))
                        ) : (
                          <li className="px-3 py-2 text-sm text-gray-500">No sections in this group</li>
                        )}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {/* Document title and metadata */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">{document?.title}</h1>
              <p className="text-gray-600">Version {document?.version_number} • Last updated: {new Date(document?.updated_at).toLocaleDateString()}</p>
            </div>

            {/* Render all sections in a continuous document */}
            <div className="space-y-8 mb-8">
              {sectionGroups.map((group) => (
                <div key={group.id} className="border rounded-lg overflow-hidden">
                  <div 
                    className="bg-gray-100 px-4 py-3 font-medium border-b flex justify-between items-center cursor-pointer"
                    onClick={(e) => toggleGroupCollapse(group.id, e)}
                  >
                    <span>{group.title}</span>
                    <button className="p-1 rounded-full hover:bg-gray-300">
                      {collapsedGroups[group.id] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {!collapsedGroups[group.id] && (
                    <div className="divide-y">
                      {group.sections.map((section) => {
                        const isSelected = selectedSection?.id === section.id;
                        // Only show content for the selected section
                        const showContent = isSelected && !collapsedSections[section.id];
                        
                        return (
                          <div 
                            key={section.id} 
                            className={`${isSelected ? 'bg-blue-50' : ''}`}
                          >
                            <div 
                              className="flex justify-between items-start p-4 cursor-pointer"
                              onClick={() => handleSectionChange(section)}
                            >
                              <h3 className="text-lg font-medium">{section.title}</h3>
                              <div className="flex items-center space-x-2">
                                <DocumentComplianceIndicator sectionId={section.id} />
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  section.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  section.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  section.status === 'needs_revision' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {section.status.replace('_', ' ')}
                                </span>
                                {/* Collapse/expand button */}
                                <button 
                                  onClick={(e) => toggleSectionCollapse(section.id, e)}
                                  className="p-1 rounded-full hover:bg-gray-200"
                                >
                                  {!showContent ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronUp className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            {/* Only show content for the selected section */}
                            {showContent && (
                              <div className="mt-4">
                                <SectionReview
                                  documentId={documentId}
                                  sectionId={section.id}
                                  reviewCycleId={currentReviewCycle?.id || ''}
                                  content={section.content}
                                  version={1} // TODO: Get actual version from document metadata
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Right sidebar for comments and revision requests */}
          {selectedSection && (
            <div className={`border-l ${rightSidebarCollapsed ? 'w-12' : 'w-80'} transition-all duration-200 flex flex-col`}>
              {/* Collapse/Expand Button */}
              <div className="border-b p-2 flex justify-between items-center">
                <h3 className={`font-medium ${rightSidebarCollapsed ? 'hidden' : ''}`}>
                  Document Status
                </h3>
                <button
                  onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  {rightSidebarCollapsed ? <ChevronLeft /> : <ChevronRight />}
                </button>
              </div>

              {/* Status Section */}
              {!rightSidebarCollapsed && (
                <div className="p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={currentReviewCycle?.status || 'in_progress'}
                        onValueChange={handleStatusChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="needs_revision">Needs Revision</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DocumentAnalysisProvider>
  );
}
