'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentAnalysisProvider } from '@/contexts/DocumentAnalysisContext';
import DocumentAnalysisButton from './DocumentAnalysisButton';
import DocumentCommentSection from './DocumentCommentSection';
import DocumentComplianceIndicator from './DocumentComplianceIndicator';

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress';
  group: string;
}

interface SectionGroup {
  id: string;
  title: string;
  sections: DocumentSection[];
}

interface EnhancedDocumentReviewProps {
  documentId: string;
  onSectionSelect?: (section: {
    id: string;
    title: string;
    content: string;
  }) => void;
  onBackClick?: () => void;
}

export default function EnhancedDocumentReview({ 
  documentId, 
  onSectionSelect,
  onBackClick
}: EnhancedDocumentReviewProps) {
  const [document, setDocument] = useState<any>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [sectionGroups, setSectionGroups] = useState<SectionGroup[]>([]);
  const [selectedSection, setSelectedSection] = useState<DocumentSection | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [selectedTab, setSelectedTab] = useState<'ai' | 'sponsor' | 'exchange'>('ai');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (documentId) {
      fetchDocumentDetails();
      fetchComments();
    }
  }, [documentId]);

  const fetchDocumentDetails = async () => {
    if (!documentId) return;
    
    setLoading(true);
    try {
      // Fetch document details
      const { data: listingData, error: listingError } = await supabase
        .from('listing')
        .select(`
          instrumentid,
          instrumentname,
          instrumentsponsor,
          instrumentsecuritiesadmissionstatus,
          instrumentupdatedat,
          instrumentlistingtype
        `)
        .eq('instrumentid', documentId)
        .single();

      if (listingError) throw listingError;
      if (!listingData) throw new Error('Document not found');

      setDocument({
        id: listingData.instrumentid,
        title: listingData.instrumentname,
        sponsor: listingData.instrumentsponsor,
        status: listingData.instrumentsecuritiesadmissionstatus,
        updated_at: listingData.instrumentupdatedat,
        listing_type: listingData.instrumentlistingtype
      });

      // Mock section data for demo (replace with actual data fetch in production)
      const mockSections: DocumentSection[] = [
        // Executive Summary Group
        { id: '1', title: 'Executive Summary', content: 'This is the executive summary content.', status: 'pending', group: 'exec_summary' },
        { id: '2', title: 'Risk Factors', content: 'These are the risk factors associated with this listing.', status: 'pending', group: 'exec_summary' },
        
        // Company Overview Group
        { id: '3', title: 'Company Overview', content: 'Overview of the company and its operations.', status: 'in_progress', group: 'company' },
        { id: '4', title: 'Business Model', content: 'Details of the business model and revenue streams.', status: 'pending', group: 'company' },
        { id: '5', title: 'Management Team', content: 'Information about the management team and their expertise.', status: 'pending', group: 'company' },
        
        // Financial Information Group
        { id: '6', title: 'Financial Statements', content: 'Financial statements for the past 3 years.', status: 'pending', group: 'financial' },
        { id: '7', title: 'Financial Projections', content: 'Financial projections for the next 5 years.', status: 'pending', group: 'financial' },
        
        // Regulatory Information Group
        { id: '8', title: 'Regulatory Compliance', content: 'Information about regulatory compliance and approvals.', status: 'pending', group: 'regulatory' },
        { id: '9', title: 'Legal Structure', content: 'Details of the legal structure and governance.', status: 'pending', group: 'regulatory' }
      ];
      
      setSections(mockSections);
      
      // Group sections
      const groups: SectionGroup[] = [
        { id: 'exec_summary', title: 'Executive Summary', sections: mockSections.filter(s => s.group === 'exec_summary') },
        { id: 'company', title: 'Company Overview', sections: mockSections.filter(s => s.group === 'company') },
        { id: 'financial', title: 'Financial Information', sections: mockSections.filter(s => s.group === 'financial') },
        { id: 'regulatory', title: 'Regulatory Information', sections: mockSections.filter(s => s.group === 'regulatory') }
      ];
      
      setSectionGroups(groups);
      
      // Set initial selected section if none is selected
      if (!selectedSection && mockSections.length > 0) {
        setSelectedSection(mockSections[0]);
        if (onSectionSelect) {
          onSectionSelect({
            id: mockSections[0].id,
            title: mockSections[0].title,
            content: mockSections[0].content
          });
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching document details:', err);
      setError('Failed to load document details');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!documentId) return;
    
    try {
      const { data, error: commentsError } = await supabase
        .from('document_comments')
        .select('*')
        .eq('document_id', documentId);
        
      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
      } else {
        setComments(data || []);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleSectionSelect = (section: DocumentSection) => {
    setSelectedSection(section);
    if (onSectionSelect) {
      onSectionSelect({
        id: section.id,
        title: section.title,
        content: section.content
      });
    }
  };

  const toggleGroupCollapse = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedGroups({
      ...collapsedGroups,
      [groupId]: !collapsedGroups[groupId]
    });
  };

  const handleStatusChange = async (sectionId: string, status: string) => {
    // Update section status locally
    const updatedSections = sections.map(section => 
      section.id === sectionId 
        ? { ...section, status: status as DocumentSection['status'] }
        : section
    );
    
    setSections(updatedSections);
    
    // Update section groups
    const updatedGroups = sectionGroups.map(group => ({
      ...group,
      sections: group.sections.map(section => 
        section.id === sectionId 
          ? { ...section, status: status as DocumentSection['status'] }
          : section
      )
    }));
    
    setSectionGroups(updatedGroups);
    
    // Here you would update the status in the database
    console.log(`Updated section ${sectionId} status to ${status}`);
  };

  const getSectionCommentsCount = (sectionId: string) => {
    return comments.filter(c => c.section_id === sectionId).length;
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
        {/* Document Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-4">
            {onBackClick && (
              <button 
                onClick={onBackClick}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to Documents
              </button>
            )}
            <h2 className="text-xl font-semibold">{document.title}</h2>
            <span className={`px-2 py-1 text-xs rounded-full ${
              document.status === 'approved' ? 'bg-green-100 text-green-800' :
              document.status === 'draft' ? 'bg-blue-100 text-blue-800' :
              document.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {document.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DocumentAnalysisButton
              documentId={documentId}
              sections={sections}
              onAnalysisStart={() => setIsAnalyzing(true)}
              isExternallyAnalyzing={isAnalyzing}
              onAnalyzingChange={setIsAnalyzing}
            />
          </div>
        </div>
        
        {/* Three-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Document Sections */}
          <div className={`border-r ${leftSidebarCollapsed ? 'w-12' : 'w-64'} transition-all duration-300 flex flex-col bg-gray-50`}>
            {/* Collapse/Expand Button */}
            <div className="border-b p-2 flex justify-between items-center bg-gray-100">
              <h3 className={`font-medium ${leftSidebarCollapsed ? 'hidden' : ''}`}>
                Document Sections
              </h3>
              <button
                onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
                className="p-1 hover:bg-gray-200 rounded-full"
              >
                {leftSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
              </button>
            </div>

            {/* Section Navigation */}
            {!leftSidebarCollapsed && (
              <div className="overflow-y-auto flex-1">
                {/* Section groups */}
                {sectionGroups.map((group) => (
                  <div key={group.id} className="mb-2">
                    <div 
                      className="px-3 py-2 bg-gray-200 font-medium text-sm text-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-300"
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
                          group.sections.map((section) => {
                            const isSelected = selectedSection?.id === section.id;
                            const commentsCount = getSectionCommentsCount(section.id);
                            
                            return (
                              <li 
                                key={section.id}
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                onClick={() => handleSectionSelect(section)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{section.title}</span>
                                  <div className="flex items-center space-x-2">
                                    {commentsCount > 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        {commentsCount}
                                      </span>
                                    )}
                                    <div className={`w-2 h-2 rounded-full ${
                                      section.status === 'approved' ? 'bg-green-500' : 
                                      section.status === 'rejected' ? 'bg-red-500' : 
                                      section.status === 'needs_revision' ? 'bg-yellow-500' : 
                                      section.status === 'in_progress' ? 'bg-blue-500' :
                                      'bg-gray-300'
                                    }`} />
                                  </div>
                                </div>
                              </li>
                            );
                          })
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

          {/* Middle Panel: Section Content */}
          <div className="flex-1 overflow-y-auto bg-white">
            {selectedSection ? (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">{selectedSection.title}</h2>
                
                <div className="prose prose-blue max-w-none mb-8">
                  <div className="whitespace-pre-wrap">{selectedSection.content}</div>
                </div>
                
                {/* Document compliance indicator */}
                <div className="mb-8">
                  <DocumentComplianceIndicator sectionId={selectedSection.id} />
                </div>
                
                {/* Status and analysis controls */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <select
                      className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
                      value={selectedSection.status}
                      onChange={(e) => handleStatusChange(selectedSection.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="needs_revision">Needs Revision</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  
                  <DocumentAnalysisButton
                    documentId={documentId}
                    sections={[selectedSection]}
                    onAnalysisStart={() => {}}
                    isExternallyAnalyzing={false}
                    onAnalyzingChange={() => {}}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6 max-w-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a section to review</h3>
                  <p className="text-gray-500">Choose a section from the left sidebar to view its content and provide feedback.</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Feedback & Collaboration */}
          <div className={`border-l ${rightSidebarCollapsed ? 'w-12' : 'w-96'} transition-all duration-300 flex flex-col bg-gray-50`}>
            {/* Collapse/Expand Button */}
            <div className="border-b p-2 flex justify-between items-center bg-gray-100">
              <h3 className={`font-medium ${rightSidebarCollapsed ? 'hidden' : ''}`}>
                Feedback & Collaboration
              </h3>
              <button
                onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                className="p-1 hover:bg-gray-200 rounded-full"
              >
                {rightSidebarCollapsed ? <ChevronLeft /> : <ChevronRight />}
              </button>
            </div>

            {/* Feedback Tabs & Content */}
            {!rightSidebarCollapsed && selectedSection && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Tabs */}
                <div className="border-b">
                  <div className="flex">
                    <button 
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        selectedTab === 'ai' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setSelectedTab('ai')}
                    >
                      AI Feedback
                    </button>
                    <button 
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        selectedTab === 'sponsor' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setSelectedTab('sponsor')}
                    >
                      Sponsor Feedback
                    </button>
                    <button 
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        selectedTab === 'exchange' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setSelectedTab('exchange')}
                    >
                      Exchange Feedback
                    </button>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="flex-1 overflow-y-auto p-4">
                  <DocumentCommentSection
                    documentId={documentId}
                    sectionId={selectedSection.id}
                    comments={comments.filter(c => c.section_id === selectedSection.id)}
                    initialCommentType={
                      selectedTab === 'ai' ? 'comment' :
                      selectedTab === 'sponsor' ? 'revision' :
                      'approval'
                    }
                    onCommentStatusChange={(sectionId, status) => {
                      if (status === 'addressed') {
                        // Update section status when revision is addressed
                        handleStatusChange(sectionId, 'pending');
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Collapsed or no section selected state */}
            {(rightSidebarCollapsed || !selectedSection) && (
              <div className="flex-1 flex items-center justify-center">
                {rightSidebarCollapsed && (
                  <div className="transform -rotate-90 whitespace-nowrap text-sm text-gray-500">
                    Feedback Panel
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DocumentAnalysisProvider>
  );
} 