'use client';

import { useState, useEffect, useCallback, useMemo, useRef, useReducer } from 'react';
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
import { LoadingState } from '@/components/LoadingState';

// Types for document sections
interface DocumentSection {
  id: string;
  document_id: string;
  title: string;
  content: string;
  section_order: number;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress';
  created_at: string;
  updated_at: string;
  group?: string;
  version: number;
}

interface DocumentWithSections {
  instrumentid?: string;
  id?: string;
  name?: string;
  title?: string;
  content?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  sections: DocumentSection[];
}

interface DocumentVersion {
  id: string;
  version: number;
  created_at: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

interface DocumentReviewDetailProps {
  documentId: string;
  onSectionSelect?: (sectionId: string) => void;
}

// Add this interface for section groups
interface SectionGroup {
  id: string;
  title: string;
  sections: DocumentSection[];
}

// Fix the TypeScript errors with proper status types
type SectionStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress';

interface State {
  document: DocumentWithSections | null;
  sections: DocumentSection[];
  selectedSection: DocumentSection | null;
  loading: boolean;
  error: string | null;
  collapsedGroups: Record<string, boolean>;
}

const initialState: State = {
  document: null,
  sections: [],
  selectedSection: null,
  loading: true,
  error: null,
  collapsedGroups: {}
};

// Add reducer types
type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DOCUMENT_DATA'; payload: { document: DocumentWithSections; sections: DocumentSection[] } }
  | { type: 'SET_SELECTED_SECTION'; payload: DocumentSection }
  | { type: 'TOGGLE_GROUP'; payload: string }
  | { type: 'UPDATE_SECTION_STATUS'; payload: { sectionId: string; status: SectionStatus } };

// Add reducer function
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_DOCUMENT_DATA':
      return {
        ...state,
        document: action.payload.document,
        sections: action.payload.sections,
        selectedSection: action.payload.sections[0] || null
      };
    case 'SET_SELECTED_SECTION':
      return { ...state, selectedSection: action.payload };
    case 'TOGGLE_GROUP':
      return {
        ...state,
        collapsedGroups: {
          ...state.collapsedGroups,
          [action.payload]: !state.collapsedGroups[action.payload]
        }
      };
    case 'UPDATE_SECTION_STATUS':
      return {
        ...state,
        sections: state.sections.map(section =>
          section.id === action.payload.sectionId
            ? { ...section, status: action.payload.status }
            : section
        )
      };
    default:
      return state;
  }
};

// Wrap the component with React.memo to prevent unnecessary re-renders
function DocumentReviewDetail({ 
  documentId,
  onSectionSelect 
}: DocumentReviewDetailProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [selectedSectionGroup, setSelectedSectionGroup] = useState<string>('sec1');
  const [selectedCommentType, setSelectedCommentType] = useState<'comment' | 'revision' | 'approval' | 'rejection'>('comment');
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [documentsColumnCollapsed, setDocumentsColumnCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedRevisionRequests, setDismissedRevisionRequests] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentReviewCycle, setCurrentReviewCycle] = useState<DocumentReviewCycle | null>(null);
  const [revisionRequests, setRevisionRequests] = useState<RevisionRequest[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isAnalysisButtonBusy, setIsAnalysisButtonBusy] = useState(false);
  
  const supabase = getSupabaseClient();

  console.log('[DocumentReviewDetail] Loading document with ID:', documentId);

  const requestRef = useRef(0);

  const sectionGroups = useMemo(() => {
    if (state.sections.length === 0) return [];
    
    return [
      {
        id: 'sec1',
        title: 'Section 1: General Information',
        sections: state.sections.filter(s => s.group === 'sec1')
      },
      {
        id: 'sec2',
        title: 'Section 2: Table of Contents',
        sections: state.sections.filter(s => s.group === 'sec2')
      },
      {
        id: 'sec3',
        title: 'Section 3: Issuer Information',
        sections: state.sections.filter(s => s.group === 'sec3')
      },
      {
        id: 'sec4',
        title: 'Section 4: Risk Factors',
        sections: state.sections.filter(s => s.group === 'sec4')
      },
      {
        id: 'sec5',
        title: 'Section 5: Securities Information',
        sections: state.sections.filter(s => s.group === 'sec5')
      },
      {
        id: 'sec6',
        title: 'Section 6: Costs & Fees',
        sections: state.sections.filter(s => s.group === 'sec6')
      }
    ];
  }, [state.sections]);

  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId) return;
      
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        
        const { data: listingData, error: listingError } = await supabase
          .from('listing')
          .select('*')
          .eq('instrumentid', documentId)
          .single();

        if (listingError) {
          throw new Error('Document not found');
        }

        const mockSections = [
          {
            id: 'section-overview',
            document_id: documentId,
            title: 'Document Overview',
            content: `Document Name: ${listingData.instrumentname}\nSponsor: ${listingData.instrumentsponsor}\nStatus: ${listingData.instrumentsecuritiesadmissionstatus}\nListing Type: ${listingData.instrumentlistingtype}`,
            section_order: 1,
            status: 'pending' as const,
            created_at: listingData.instrumentupdatedat,
            updated_at: listingData.instrumentupdatedat,
            group: 'sec1',
            version: 1
          }
        ];

        const documentData = {
          instrumentid: documentId,
          ...listingData,
          sections: mockSections
        };

        dispatch({
          type: 'SET_DOCUMENT_DATA',
          payload: { document: documentData, sections: mockSections }
        });

      } catch (err) {
        console.error('Error loading document:', err);
        dispatch({
          type: 'SET_ERROR',
          payload: err instanceof Error ? err.message : 'Failed to load document'
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadDocument();
  }, [documentId]);

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

  const handleSectionSelect = useCallback((section: DocumentSection) => {
    dispatch({ type: 'SET_SELECTED_SECTION', payload: section });
    setShowComments(false);
    
    if (onSectionSelect) {
      onSectionSelect(section.id);
    }
  }, [onSectionSelect]);
  
  const handleVersionChange = (version: number) => {
    setCurrentVersion(version);
    // In a real implementation, this would fetch the document data for the selected version
  };
  
  const handleSectionStatusChange = useCallback((sectionId: string, newStatus: SectionStatus) => {
    dispatch({
      type: 'UPDATE_SECTION_STATUS',
      payload: { sectionId, status: newStatus }
    });
  }, []);
  
  const handleCommentStatusChange = (sectionId: string, status: 'pending' | 'addressed' | 'ignored') => {
    // If a revision request has been addressed, update the section status
    if (status === 'addressed') {
      // Find the section
      const section = state.sections.find(s => s.id === sectionId);
      if (section && section.status === 'needs_revision') {
        // Update the section status to pending (or another appropriate status)
        handleSectionStatusChange(sectionId, 'pending');
      }
    }
  };
  
  const handleToggleComments = () => {
    setShowComments(!showComments);
  };

  const getSectionCommentsCount = (sectionId: string) => {
    return comments.filter(comment => comment.section_id === sectionId).length;
  };

  const handleSectionGroupChange = (groupId: string) => {
    setSelectedSectionGroup(groupId);
    
    // Find the first section in the selected group and select it
    const group = sectionGroups.find(g => g.id === groupId);
    if (group && group.sections.length > 0) {
      handleSectionSelect(group.sections[0]);
      
      // Notify the parent component if the callback is provided
      if (onSectionSelect) {
        onSectionSelect(group.sections[0].id);
      }
    }
  };

  const toggleLeftSidebar = () => {
    setLeftSidebarCollapsed(!leftSidebarCollapsed);
  };

  const toggleRightSidebar = () => {
    setRightSidebarCollapsed(!rightSidebarCollapsed);
  };

  const toggleGroupCollapse = (groupId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering section selection
    dispatch({ type: 'TOGGLE_GROUP', payload: groupId });
  };

  const toggleDocumentsColumn = () => {
    setDocumentsColumnCollapsed(!documentsColumnCollapsed);
  };

  const handleRevisionRequestDismiss = (sectionId: string) => {
    setDismissedRevisionRequests(prev => new Set([...prev, sectionId]));
  };

  const handleStartReview = async () => {
    try {
      if (currentReviewCycle) {
        const updatedCycle: DocumentReviewCycle = {
          ...currentReviewCycle,
          status: 'in_progress'
        };
        setCurrentReviewCycle(updatedCycle);
      }
      // Reload document data
      const loadDocument = async () => {
        if (!documentId) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        // ... rest of loadDocument function
      };
      await loadDocument();
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
      // Reload document data
      const loadDocument = async () => {
        if (!documentId) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        // ... rest of loadDocument function
      };
      await loadDocument();
    } catch (error) {
      console.error('Error completing review:', error);
    }
  };

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

  const renderDocumentHeader = () => {
    return (
      <div className="flex justify-between items-center p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{state.document?.title}</h1>
          <span className={`px-2 py-1 text-xs rounded-full ${
            state.document?.status === 'approved' ? 'bg-green-100 text-green-800' :
            state.document?.status === 'in_review' ? 'bg-blue-100 text-blue-800' :
            state.document?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {state.document?.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => console.log('Analyze button clicked - replace with real functionality later')}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Analyze with AI
          </button>
        </div>
      </div>
    );
  };

  const renderSection = (section: DocumentSection) => {
    const isSelected = state.selectedSection?.id === section.id;
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

  const renderSelectedSectionContent = () => {
    if (!state.selectedSection) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{state.selectedSection.title}</h3>
          <div className="prose max-w-none">
            {state.selectedSection.content}
          </div>
        </div>
        {/* Comments section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Comments</h3>
          {/* Add comment components here */}
        </div>
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
      // Reload document data
      const loadDocument = async () => {
        if (!documentId) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        // ... rest of loadDocument function
      };
      await loadDocument();
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
      
      // Reload document data
      const loadDocument = async () => {
        if (!documentId) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        // ... rest of loadDocument function
      };
      await loadDocument();
    } catch (error) {
      console.error('Error starting analysis:', error);
    }
  };

  const filteredGroups = useMemo(() => {
    return sectionGroups.filter(group => group.sections.length > 0);
  }, [sectionGroups]);

  const handleSectionStatusUpdate = async (status: SectionStatus) => {
    if (!state.selectedSection) return;

    try {
      dispatch({ type: 'UPDATE_SECTION_STATUS', payload: { sectionId: state.selectedSection.id, status } });
      // Add API call to update status here
    } catch (error) {
      console.error('Error updating section status:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update section status' });
    }
  };

  const renderSectionContent = () => {
    if (!state.selectedSection) return null;

    return (
      <div className="flex flex-col space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{state.selectedSection.title}</h3>
          <div className="prose max-w-none">
            {state.selectedSection.content}
          </div>
        </div>
        <SectionReview
          documentId={documentId}
          sectionId={state.selectedSection.id}
          reviewCycleId={currentReviewCycle?.id || ''}
          content={state.selectedSection.content}
          version={currentVersion}
          onStatusChange={handleSectionStatusUpdate}
          currentStatus={state.selectedSection.status}
        />
      </div>
    );
  };

  const renderActionButtons = () => {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => {/* Add your action here */}}
        >
          Save Draft
        </Button>
        <Button
          variant="default"
          onClick={() => {/* Add your action here */}}
        >
          Submit for Review
        </Button>
      </>
    );
  };

  if (state.loading) {
    return <LoadingState message="Loading document..." />;
  }

  if (!state.selectedSection) {
    return null;
  }

  return (
    <DocumentAnalysisProvider documentId={documentId}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Document Review</h2>
            <div className="flex space-x-4">
              {renderActionButtons()}
            </div>
          </div>
          {renderSectionContent()}
        </div>
      </div>
    </DocumentAnalysisProvider>
  );
}

export default DocumentReviewDetail;
