'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import DocumentCommentSection from './DocumentCommentSection';

// Types for document sections
interface DocumentSection {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
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
}

// Add this interface for section groups
interface SectionGroup {
  id: string;
  title: string;
  sections: DocumentSection[];
}

export default function DocumentReviewDetail({ documentId }: DocumentReviewDetailProps) {
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

  const handleSectionChange = (section: DocumentSection) => {
    setSelectedSection(section);
    setShowComments(false);
  };
  
  const handleVersionChange = (version: number) => {
    setCurrentVersion(version);
    // In a real implementation, this would fetch the document data for the selected version
  };
  
  // Simplified function to handle section status changes via comments
  const handleSectionStatusChange = async (sectionId: string, newStatus: DocumentSection['status']) => {
    // Update the UI to show comments and pre-select the appropriate comment type
    if (newStatus === 'approved') {
      setSelectedCommentType('approval');
    } else if (newStatus === 'needs_revision') {
      setSelectedCommentType('revision');
    } else if (newStatus === 'rejected') {
      setSelectedCommentType('rejection');
    } else {
      setSelectedCommentType('comment');
    }
    
    // Show the comments section
    setShowComments(true);
    
    // Update the section status in the UI
    setSections(prevSections => 
      prevSections.map(section => 
        section.id === sectionId 
          ? { ...section, status: newStatus } 
          : section
      )
    );
  };
  
  // Add a function to handle comment status changes
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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{document.title}</h2>
          <div className="flex items-center space-x-2">
            <select
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
              value={currentVersion}
              onChange={(e) => handleVersionChange(Number(e.target.value))}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.version}>
                  Version {version.version} ({version.status})
                </option>
              ))}
            </select>
            
            <button
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Approve Document
            </button>
          </div>
        </div>
        <div className="flex mt-2 text-sm text-gray-500">
          <span>Sponsor: {document.sponsor}</span>
          <span className="mx-2">•</span>
          <span>Last updated: {new Date(document.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sections navigation with section group selector */}
        <div className="w-64 border-r overflow-y-auto">
          {/* Add section group selector */}
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
          
          {/* Only show the selected section group */}
          {sectionGroups
            .filter(group => group.id === selectedSectionGroup)
            .map((group) => (
            <div key={group.id} className="mb-4">
              <div className="px-3 py-2 bg-gray-100 font-medium text-sm text-gray-700">
                {group.title}
              </div>
              <ul className="divide-y divide-gray-200">
                {group.sections.length > 0 ? (
                  group.sections.map((section) => (
                    <li key={section.id}>
                      <button
                        className={`w-full text-left p-3 flex items-center justify-between hover:bg-gray-50 ${
                          selectedSection?.id === section.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={() => handleSectionChange(section)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{section.title}</span>
                          <div className="flex items-center mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                              section.status === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : section.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : section.status === 'needs_revision'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                              {section.status.replace('_', ' ').charAt(0).toUpperCase() + section.status.replace('_', ' ').slice(1)}
                            </span>
                            
                            {getSectionCommentsCount(section.id) > 0 && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                {getSectionCommentsCount(section.id)} comments
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="p-3 text-sm text-gray-500">
                    No sections available in this group
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Section content and review */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedSection && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{selectedSection.title}</h3>
                <div className="flex space-x-2">
                  <button
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    onClick={() => handleSectionStatusChange(selectedSection.id, 'approved')}
                    title="Approve this section and add an approval comment"
                  >
                    Approve
                  </button>
                  <button
                    className="px-3 py-1 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                    onClick={() => handleSectionStatusChange(selectedSection.id, 'needs_revision')}
                    title="Request revisions for this section and add a revision comment"
                  >
                    Request Revision
                  </button>
                  <button
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                    onClick={handleToggleComments}
                  >
                    {showComments ? 'Hide Comments' : 'Show Comments'}
                  </button>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border mb-4 whitespace-pre-line">
                {selectedSection.content}
              </div>
              
              {showComments && selectedSection && (
                <div className="mt-4">
                  <DocumentCommentSection 
                    sectionId={selectedSection.id} 
                    documentId={document.id}
                    comments={comments.filter(comment => comment.section_id === selectedSection.id)} 
                    onCommentStatusChange={handleCommentStatusChange}
                    initialCommentType={selectedCommentType}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
