'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentAnalysis } from '@/contexts/DocumentAnalysisContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ArrowLeft, CheckCircle, XCircle, Clock, Lock as LockIcon, UserCircle, MessageSquare, Bot, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Trash2, Loader2, Copy } from 'lucide-react';
import { Editor } from '../../../components/ui/editor';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import DocumentAnalysisButton from '@/components/documents/DocumentAnalysisButton';

// --- Interfaces ---
interface Subsection {
  id: string; // e.g., 'sec1_generalinfo'
  title: string; // e.g., 'General Information'
  content: string;
}

interface Section {
  id: string; // e.g., 'sec1'
  document_id: string;
  title: string; // e.g., 'Section 1: Document Overview'
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress' | 'draft' | 'locked' | 'ai_reviewed';
  version: number;
  created_at: string;
  updated_at: string;
  subsections: Subsection[]; // Array of actual content fields
}

interface Comment {
  id: string;
  section_id: string;
  user_id: string;
  user_name: string; // Need to fetch this
  user_avatar?: string; // Need to fetch this
  content: string;
  created_at: string;
  status: 'open' | 'resolved' | 'needs_clarification'; // Example statuses
}

interface DocumentSectionReviewProps {
  documentId: string;
}

// --- Sub-Components ---

// Top Bar Component
const TopBar = ({ userName, isSidebarCollapsed, toggleSidebar, onViewFullDocument, onExportDocument }: {
  userName: string;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  onViewFullDocument: () => void;
  onExportDocument: () => void;
}) => (
  <div className="flex justify-between items-center p-4 border-b bg-white sticky top-0 z-10 h-16">
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2">
        {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </Button>
      <Button variant="outline" onClick={onViewFullDocument}>View Full Document</Button>
      <Button variant="outline" onClick={onExportDocument}>Export</Button>
    </div>
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        {/* <AvatarImage src={userAvatarUrl} /> */}
        <AvatarFallback>{userName.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span>{userName}</span>
      {/* Add dropdown for user actions if needed */}
    </div>
  </div>
);

// Table of Contents Component
const TableOfContents = ({ sections, activeSectionId, onSectionSelect, isCollapsed }: {
  sections: Section[];
  activeSectionId: string | null;
  onSectionSelect: (sectionId: string) => void;
  isCollapsed: boolean;
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Initialize expanded state (e.g., expand the active section by default)
  useEffect(() => {
    if (activeSectionId) {
      setExpandedSections(prev => ({ ...prev, [activeSectionId]: true }));
    }
  }, [activeSectionId]);

  const toggleExpand = (sectionId: string) => {
    console.log("Toggling section:", sectionId);
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Find the status for a main section from the fetched sections array
  const getSectionStatus = (sectionId: string): Section['status'] => {
    return sections.find(s => s.id === sectionId)?.status || 'pending';
  }

  const getStatusIcon = (status: Section['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'locked': return <LockIcon className="h-4 w-4 text-gray-500" />;
      case 'ai_reviewed': return <Bot className="h-4 w-4 text-blue-500" />;
      case 'needs_revision':
      case 'in_progress':
      case 'draft':
      case 'pending':
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Define the TOC structure here or import it
  const tocStructure = [
      { id: 'sec1', title: 'Section 1: Document Overview', statusField: 'sec1_status', subsections: [
        { id: 'sec1_documentname', title: 'Document Name' },
        { id: 'sec1_generalinfo', title: 'General Information' },
        { id: 'sec1_corporateadvisors', title: 'Corporate Advisors' },
        { id: 'sec1_forwardlooking_statements', title: 'Forward Looking Statements' },
        { id: 'sec1_boardofdirectors', title: 'Board of Directors' },
        { id: 'sec1_salientpoints', title: 'Salient Points' },
        { id: 'sec1_purposeoflisting', title: 'Purpose of Listing' },
        { id: 'sec1_plansafterlisting', title: 'Plans After Listing' },
        { id: 'sec1_issuer_name', title: 'Issuer Name' },
        { id: 'sec1_warning', title: 'Warning' },
      ]},
      { id: 'sec2', title: 'Section 2: Securities Details', statusField: 'sec2_status', subsections: [
        { id: 'sec2_tableofcontents', title: 'Table of Contents' },
        { id: 'sec2_importantdatestimes', title: 'Important Dates & Times' },
        { id: 'sec2_generalrequirements', title: 'General Requirements' },
        { id: 'sec2_responsibleperson', title: 'Responsible Person' },
        { id: 'sec2_securitiesparticulars', title: 'Securities Particulars' },
        { id: 'sec2_securitiestowhichthisrelates', title: 'Securities To Which This Relates' },
      ]},
      { id: 'sec3', title: 'Section 3: Issuer Information', statusField: 'sec3_status', subsections: [
        { id: 'sec3_generalinfoissuer', title: 'General Information' },
        { id: 'sec3_issuerprinpactivities', title: 'Principal Activities' },
        { id: 'sec3_issuerfinanposition', title: 'Financial Position' },
        { id: 'sec3_issuersadministration_and_man', title: 'Administration & Management' },
        { id: 'sec3_recentdevelopments', title: 'Recent Developments' },
        { id: 'sec3_financialstatements', title: 'Financial Statements' },
      ]},
      { id: 'sec4', title: 'Section 4: Risk Factors', statusField: 'sec4_status', subsections: [
        { id: 'sec4_riskfactors1', title: 'Risk Factors 1' },
        { id: 'sec4_riskfactors2', title: 'Risk Factors 2' },
        { id: 'sec4_riskfactors3', title: 'Risk Factors 3' },
        { id: 'sec4_riskfactors4', title: 'Risk Factors 4' },
        { id: 'sec4_risks5', title: 'Risks 5' },
        { id: 'sec4_risks6', title: 'Risks 6' },
        { id: 'sec4_risks7', title: 'Risks 7' },
        { id: 'sec4_risks8', title: 'Risks 8' },
        { id: 'sec4_risks9', title: 'Risks 9' },
        { id: 'sec4_risks10', title: 'Risks 10' },
        { id: 'sec4_risks11', title: 'Risks 11' },
        { id: 'sec4_risks12', title: 'Risks 12' },
        { id: 'sec4_risks13', title: 'Risks 13' },
        { id: 'sec4_risks14', title: 'Risks 14' },
        { id: 'sec4_risks15', title: 'Risks 15' },
        { id: 'sec4_risks16', title: 'Risks 16' },
      ]},
      { id: 'sec5', title: 'Section 5: Securities Information', statusField: 'sec5_status', subsections: [
        { id: 'sec5_informaboutsecurts1', title: 'Information 1' },
        { id: 'sec5_informaboutsecurts2', title: 'Information 2' },
        { id: 'sec5_informaboutsecurts3', title: 'Information 3' },
        { id: 'sec5_informaboutsecurts4', title: 'Information 4' },
        { id: 'sec5_informaboutsecurts5', title: 'Information 5' },
        { id: 'sec5_informaboutsecurts6', title: 'Information 6' },
        { id: 'sec5_costs', title: 'Costs' },
      ]},
       { id: 'sec6', title: 'Section 6: Costs & Fees', statusField: null, subsections: [
        { id: 'sec6_exchange', title: 'Exchange' },
        { id: 'sec6_sponsoradvisorfees', title: 'Sponsor Advisor Fees' },
        { id: 'sec6_accountingandlegalfees', title: 'Accounting & Legal Fees' },
        { id: 'sec6_merjlistingapplication1styearfees', title: 'First Year Fees' },
        { id: 'sec6_marketingcosts', title: 'Marketing Costs' },
        { id: 'sec6_annualfees', title: 'Annual Fees' },
        { id: 'sec6_commissionforsubscription', title: 'Commission for Subscription' },
        { id: 'sec6_payingagent', title: 'Paying Agent' },
        { id: 'sec6_listingdocuments', title: 'Listing Documents' },
        { id: 'sec6_complianceapproved', title: 'Compliance Approved' },
      ]},
    ];

  return (
    <ScrollArea className={cn(
      "border-r h-[calc(100vh-4rem)] bg-gray-50 sticky top-16 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-0 opacity-0 p-0 border-none" : "w-72 p-4 opacity-100"
      )}>
      {!isCollapsed && (
        <div>
          <h2 className="font-semibold mb-4 text-sm text-gray-600">Table of Contents</h2>
          <div className="space-y-1">
            {tocStructure.map((mainSection) => {
              const isExpanded = !!expandedSections[mainSection.id]; // Ensure boolean evaluation
              const currentStatus = getSectionStatus(mainSection.id);
              const isActive = activeSectionId === mainSection.id;
              return (
                <div key={mainSection.id}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between text-left h-auto py-2 px-3 text-sm font-semibold",
                      isActive && !isExpanded && "bg-blue-100 text-blue-700" // Highlight only if active and collapsed
                    )}
                    // Use separate click handlers for select vs toggle if needed, 
                    // but combining should be okay for now.
                    onClick={() => { 
                      onSectionSelect(mainSection.id); // Scroll main view
                      toggleExpand(mainSection.id);    // Toggle TOC section
                    }}
                  >
                    <span className="flex items-center gap-2 flex-1 mr-2">
                       {isExpanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                       {mainSection.title}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-normal">
                      <span>({currentStatus})</span>
                      {getStatusIcon(currentStatus)}
                    </div>
                  </Button>
                  {/* Conditional Rendering of Subsections */}
                  {isExpanded && (
                    <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-200 ml-3">
                      {mainSection.subsections.map(subSection => (
                        <Button
                          key={subSection.id}
                          variant="ghost"
                          className={cn(
                            "w-full justify-start text-left h-auto py-1 px-2 text-sm font-normal text-gray-600 hover:bg-gray-200",
                            // Add highlighting for active subsection if needed
                          )}
                          onClick={() => {
                             onSectionSelect(mainSection.id); // Still scroll to main section for now
                             // Potentially add logic here to scroll to a specific sub-element 
                             // within the main section if the SectionDisplay supports it.
                          }}
                        >
                          {subSection.title}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ScrollArea>
  );
};

// Section Header Component
const SectionHeader = ({ section, userName, onUpdateStatus, isExpanded, onToggleExpand }: {
  section: Section;
  userName: string;
  onUpdateStatus: (sectionId: string, newStatus: Section['status']) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) => (
  // Make the header clickable to toggle expansion
  <div 
    className="flex justify-between items-center p-3 bg-gray-50 rounded-t-md border-b cursor-pointer hover:bg-gray-100 transition-colors"
    onClick={onToggleExpand} // Toggle on click
  >
    <div className="flex items-center gap-2">
      {/* Add Chevron icon */} 
      {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-600"/> : <ChevronRight className="h-4 w-4 text-gray-600"/>}
      <h3 className="text-md font-semibold select-none">{section.title} <span className="text-sm font-normal text-gray-500">({section.status})</span></h3>
    </div>
    {/* Stop propagation on buttons so clicking them doesn't toggle collapse */}
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}> 
      <Avatar className="h-6 w-6">
        {/* <AvatarImage src={userAvatarUrl} /> */}
        <AvatarFallback className="text-xs">{userName.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      {/* AI Analysis Button */}
      {/* Pass section data including subsections array */}
      <DocumentAnalysisButton 
        documentId={section.document_id} 
        // Pass the current section object, which now includes the subsections array
        sections={[{
            id: section.id, 
            title: section.title,
            status: section.status,
            subsections: section.subsections // Pass the actual subsections array
            // Remove the combined 'content' field
        }]}
      />
      {/* Show EITHER Approve OR Undo/Reject Button */} 
      {section.status === 'approved' ? (
        // Show Undo/Reject button if already approved
        <Button 
          variant="outline"
          size="sm"
          className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200"
          onClick={(e) => { e.stopPropagation(); onUpdateStatus(section.id, 'in_progress'); }}
        >
          <XCircle className="h-4 w-4 mr-1"/> Re-open / Reject
        </Button>
      ) : section.status !== 'locked' ? (
        // Show Approve button if not approved and not locked
        <Button 
          variant="outline"
          size="sm"
          className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
          onClick={(e) => { e.stopPropagation(); onUpdateStatus(section.id, 'approved'); }}
        >
          <CheckCircle className="h-4 w-4 mr-1"/> Approve
        </Button>
      ) : null } 
    </div>
  </div>
);

// Comments Section Component
const CommentsSection = ({ subsectionId, documentId, initialComments }: { 
  subsectionId: string; 
  documentId: string; 
  initialComments: Comment[]; 
}) => {
  // Initialize state with pre-fetched comments
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const supabase = getSupabaseClient();
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  // Only fetch current user and set up subscription
  useEffect(() => {
    // 1. Get current user info (needed for posting)
    let isMounted = true; // Prevent state update on unmounted component
    const fetchCurrentUser = async () => {
      let fetchedUserId: string | null = null;
      let fetchedUserName: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            fetchedUserId = user.id;
            fetchedUserName = user.email || 'Anonymous'; 
        }
      } catch (authError) {
           console.error("Error fetching authenticated user:", authError);
      }
      if (isMounted) {
        setCurrentUser(fetchedUserId ? { id: fetchedUserId, name: fetchedUserName || 'Anonymous' } : null);
      }
    };
    fetchCurrentUser();

    // 2. Initial comment fetch is removed - comments are passed via props
    console.log(`[Comments] Initialized with ${initialComments.length} comments for ${subsectionId}`);

    // 3. Set up subscription (remains the same)
    const channel = supabase
        .channel(`comments:${documentId}:${subsectionId}`)
        .on<Comment>(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'document_comments',
                filter: `document_id=eq.${documentId}&section_id=eq.${subsectionId}`,
            },
            (payload) => {
                console.log(`[Subscription] Filtered event for ${subsectionId}:`, payload.new);
                const newCommentData = payload.new;

                // Directly format using data from payload (including user_name)
                const formattedComment: Comment = {
                    id: newCommentData.id,
                    section_id: newCommentData.section_id, 
                    user_id: newCommentData.user_id,
                    user_name: newCommentData.user_name || 'Unknown User', // Use name from payload
                    content: newCommentData.content || '',
                    created_at: newCommentData.created_at || new Date().toISOString(),
                    status: 'open' as Comment['status']
                };

                console.log('[Subscription] Adding comment to state:', formattedComment);
                setComments(prevComments => {
                    if (prevComments.some(c => c.id === formattedComment.id)) {
                        return prevComments;
                    }
                    return [...prevComments, formattedComment];
                });
            }
        )
        .subscribe();

    return () => {
        isMounted = false; // Cleanup flag
        supabase.removeChannel(channel);
    };

    // Depend only on IDs for subscription setup, not initialComments
  }, [subsectionId, documentId, supabase]); 

  const handlePostComment = async () => {
    console.log("[Comments] handlePostComment called. currentUser:", currentUser);
    if (!newComment.trim() || !currentUser) {
       console.log("[Comments] Post cancelled: Empty comment or missing user.", { hasComment: !!newComment.trim(), hasUser: !!currentUser });
       return;
    }

    // Include user_name in the optimistic update
    const tempId = `temp-${Date.now()}`; 
    const optimisticComment: Comment = {
        id: tempId,
        section_id: subsectionId,
        user_id: currentUser.id,
        user_name: currentUser.name, // Use name from currentUser state
        content: newComment.trim(),
        created_at: new Date().toISOString(),
        status: 'open' as Comment['status']
    };

    setComments(prevComments => [...prevComments, optimisticComment]);
    const originalCommentText = newComment;
    setNewComment(''); 

    // Include user_name in the actual insert object
    const commentToInsert = {
      document_id: documentId,
      section_id: subsectionId,
      user_id: currentUser.id,
      user_name: currentUser.name, // Add the user's name here
      content: optimisticComment.content, 
    };
    console.log("[Comments] Attempting to insert:", commentToInsert);

    const { data, error } = await supabase
      .from('document_comments')
      .insert(commentToInsert)
      .select()
      .single(); 

    if (error) {
      console.error("[Comments] Error posting comment:", error);
      // Revert Optimistic Update 
      setComments(prevComments => prevComments.filter(c => c.id !== tempId));
      setNewComment(originalCommentText); 
      // TODO: Show user-facing error message
    } else {
      console.log("[Comments] Insert successful, DB Data:", data);
      // Update Optimistic Comment with Real Data (using user_name from DB now)
      if (data) {
         const confirmedComment: Comment = {
             id: data.id,
             section_id: data.section_id,
             user_id: data.user_id,
             user_name: data.user_name || 'Unknown User', // Use name returned from DB
             content: data.content,
             created_at: data.created_at,
             status: 'open' as Comment['status'] 
         };
         setComments(prevComments => prevComments.map(c => c.id === tempId ? confirmedComment : c));
      }
      // -------------------------------------------------------------------
      // Input already cleared. Subscription will handle updates for others.
    }
  };

  // Function to handle comment deletion
  const handleDeleteComment = async (commentId: string) => {
    // Optimistic UI Update: Remove the comment immediately
    setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));

    // Attempt to delete from database
    const { error } = await supabase
      .from('document_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error("[Comments] Error deleting comment:", error);
      // Simple revert: Refetch comments if delete fails. Could be improved.
      // Consider adding the comment back locally or showing a specific error message.
       alert("Failed to delete comment. Please try again."); 
       // Refetch to revert - suboptimal but simple for now
        const { data: fetchedComments } = await supabase
          .from('document_comments').select('*').eq('document_id', documentId).eq('section_id', subsectionId).order('created_at', { ascending: true });
        const mapped = fetchedComments?.map((c: any) => ({ /* ... map data ... */ id: c.id, section_id: c.section_id, user_id: c.user_id, user_name: c.user_name || 'Unknown User', content: c.content, created_at: c.created_at, status: 'open' as Comment['status'] })) || [];
        setComments(mapped);
    }
  };

  return (
    <div className="mt-4 p-3 border-t bg-white">
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><MessageSquare className="h-4 w-4"/> Comments ({comments.length})</h4>
      <div className="space-y-3 mb-3">
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-2 items-start text-sm group relative"> {/* Add group relative */} 
            <Avatar className="h-6 w-6 mt-1">
              <AvatarFallback className="text-xs">{comment.user_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-gray-100 rounded p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">{comment.user_name || 'User'}</span>
                <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap">{comment.content}</p> {/* Added whitespace wrap */} 
            </div>
            {/* Show Delete button if comment belongs to current user */} 
            {currentUser && comment.user_id === currentUser.id && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" // Position and hide until hover
                onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        ))}
        {comments.length === 0 && <p className="text-xs text-gray-500">No comments yet.</p>}
      </div>
      <div className="flex gap-2">
        <Textarea 
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={2}
        />
        <Button onClick={handlePostComment} disabled={!newComment.trim()} size="sm">Post</Button>
      </div>
    </div>
  );
};

// AI Feedback Component
const AIFeedback = ({ subsectionId, documentId }: { subsectionId: string; documentId: string }) => {
  const { state: analysisState } = useDocumentAnalysis();
  const parentSectionId = subsectionId.split('_')[0]; 
  
  // Debug logging
  console.log(`[AIFeedback-${subsectionId}] Rendering. Full analysisState:`, analysisState);

  const sectionState = analysisState?.sectionStates?.[parentSectionId];
  console.log(`[AIFeedback-${subsectionId}] Parent sectionState:`, sectionState);
  
  const sectionAnalysisResult = sectionState?.result; 
  console.log(`[AIFeedback-${subsectionId}] Parent section result:`, sectionAnalysisResult);

  // Log metadata separately
  const metadata = sectionAnalysisResult?.metadata;
  console.log(`[AIFeedback-${subsectionId}] Metadata:`, metadata);
  
  // Log subsectionResults array specifically
  const subsectionResultsArray = metadata?.subsectionResults;
  console.log(`[AIFeedback-${subsectionId}] Subsection Results Array:`, subsectionResultsArray);

  // --- Find the specific result for THIS subsection using multiple strategies --- 
  let subsectionResult: any = null; // Use 'any' temporarily for robust access
  
  // Strategy 1: Check metadata.subsectionResults array (ideal case)
  if (subsectionResultsArray && Array.isArray(subsectionResultsArray)) {
    subsectionResult = subsectionResultsArray.find(
      (subRes: any) => {
        console.log(`[AIFeedback-${subsectionId}] Comparing: '${subRes?.subsectionId}' === '${subsectionId}'`);
        return subRes?.subsectionId === subsectionId;
      }
    );
    console.log(`[AIFeedback-${subsectionId}] Strategy 1 - Found in metadata.subsectionResults:`, subsectionResult);
  }
  
  // Strategy 2: If this is the first/only subsection in section, try using the section result directly
  if (!subsectionResult && sectionAnalysisResult) {
    const isFirstSubsection = subsectionId.startsWith(parentSectionId) && 
                            subsectionId.split('_').length === 2;
    
    if (isFirstSubsection) {
      console.log(`[AIFeedback-${subsectionId}] Strategy 2 - Using section result directly (first subsection):`, sectionAnalysisResult);
      subsectionResult = {
        subsectionId: subsectionId,
        isCompliant: sectionAnalysisResult.isCompliant,
        score: sectionAnalysisResult.score,
        suggestions: sectionAnalysisResult.suggestions || []
      };
    }
  }
  
  // Strategy 3: Check if section result has a suggestion specifically mentioning this subsection title
  if (!subsectionResult && sectionAnalysisResult?.suggestions && Array.isArray(sectionAnalysisResult.suggestions)) {
    // Extract subsection name from ID (e.g., "generalinfo" from "sec1_generalinfo")
    const subsectionName = subsectionId.split('_')[1] || '';
    
    // Filter suggestions that mention this subsection
    const relevantSuggestions = sectionAnalysisResult.suggestions.filter(
      (suggestion: string) => suggestion.toLowerCase().includes(subsectionName.toLowerCase())
    );
    
    if (relevantSuggestions.length > 0) {
      console.log(`[AIFeedback-${subsectionId}] Strategy 3 - Found relevant suggestions from section level:`, relevantSuggestions);
      subsectionResult = {
        subsectionId: subsectionId,
        isCompliant: false, // If there are suggestions, mark as non-compliant
        score: 50, // Default middle score
        suggestions: relevantSuggestions
      };
    }
  }
  
  // --- End Find Strategies --- 

  const isLoading = analysisState?.isAnalyzing && analysisState?.currentSection === parentSectionId;
  const error = analysisState?.error; 

  // Display if loading, error occurred, OR if we found a specific result for this subsection
  const shouldDisplay = isLoading || error || subsectionResult;
  console.log(`[AIFeedback-${subsectionId}] shouldDisplay:`, shouldDisplay, 
    { isLoading, error, hasResult: !!subsectionResult });

  // Re-add the copy handler function
  const handleCopyCritique = (critiqueText: string) => {
    navigator.clipboard.writeText(critiqueText)
      .then(() => { alert("Critique copied!"); })
      .catch(err => { console.error("Failed to copy critique:", err); alert("Failed to copy critique."); });
  };

  if (!shouldDisplay) return null;

  return (
    <div className="mt-4 p-3 border-t bg-blue-50 rounded-b-md"> 
       <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><Bot className="h-4 w-4 text-blue-600"/> AI Feedback</h4>
       
       {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-600 animate-pulse">
             <Loader2 className="h-4 w-4 animate-spin" />
             <span>Analyzing...</span>
          </div>
       )}

       {error && !isLoading && (
          <div className="text-sm text-red-600">
             Error during analysis: {error}
          </div>
       )}
       
       {/* Display feedback based on the SPECIFIC subsectionResult */}
       {subsectionResult && !isLoading && !error && (
          <div className="text-sm text-gray-700 space-y-2">
            {/* Compliance Status & Score */}
            <p>
                Status: 
                <span className={cn("font-medium", subsectionResult.isCompliant ? "text-green-600" : "text-red-600")}>
                   {subsectionResult.isCompliant ? "Compliant" : "Requires Attention"}
                </span>
                {subsectionResult.score !== undefined && ` (Score: ${subsectionResult.score})`}
            </p>
            {/* Suggestions / Critique List */}
            {subsectionResult.suggestions && subsectionResult.suggestions.length > 0 ? (
              <div>
                <p className="font-medium">Critique:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                   {subsectionResult.suggestions.map((critique: string, index: number) => (
                      <li key={index} className="flex justify-between items-start group">
                        <span>{critique}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" onClick={() => handleCopyCritique(critique)} title="Copy critique">
                           <Copy className="h-4 w-4 text-blue-600" />
                        </Button>
                      </li> 
                   ))}
                </ul>
              </div>
            // Fallback messages if no suggestions
            ) : subsectionResult.isCompliant ? (
                 <p className="text-green-600 italic">No specific issues found.</p>
            ) : (
                 <p className="text-yellow-600 italic">Requires attention, but no specific suggestions provided.</p>
            )}
          </div>
       )}
       {/* Fallback if analysis ran but this subsection's result is missing */}
       {!subsectionResult && sectionState?.isAnalyzed && !isLoading && !error && (
           <p className="text-sm text-gray-500 italic">Analysis complete, specific feedback unavailable.</p>
       )}
    </div>
  );
};

// Single Section Display Component
const SectionDisplay = ({ section, commentsBySubsection, onUpdateStatus, userName, isExpanded, onToggleExpand }: {
  section: Section;
  commentsBySubsection: Record<string, Comment[]>; 
  onUpdateStatus: (sectionId: string, newStatus: Section['status']) => void;
  userName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) => (
  <div id={section.id} className="mb-6 border rounded-md bg-white shadow-sm overflow-hidden"> {/* Added overflow-hidden */} 
    <SectionHeader 
      section={section} 
      userName={userName} 
      onUpdateStatus={onUpdateStatus} 
      // Pass down expansion state and toggle handler
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    />
    {/* Conditionally render the content area */} 
    {isExpanded && (
      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-500 mb-2">Review the content below.</p>
        {section.subsections.map(subsection => {
          // Get comments specifically for this subsection
          const subsectionComments = commentsBySubsection[subsection.id] || []; 
          return (
            <div key={subsection.id} className="p-3 border rounded bg-gray-50/50 relative group">
              <h4 className="text-sm font-medium mb-1 text-gray-700">{subsection.title}</h4>
              <div className="text-sm text-gray-900 whitespace-pre-wrap">
                {subsection.content || "[No content]"}
              </div>
              <AIFeedback 
                subsectionId={subsection.id} 
                documentId={section.document_id} 
              />
              <div className="mt-2 border-t pt-2">
                 <CommentsSection 
                   subsectionId={subsection.id} 
                   documentId={section.document_id} 
                   // Pass down the pre-fetched comments
                   initialComments={subsectionComments} 
                 />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// --- Main Component ---
export default function DocumentSectionReview({ documentId }: DocumentSectionReviewProps) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { state: analysisState } = useDocumentAnalysis(); // Keep if AI analysis context is used
  const supabase = getSupabaseClient();
  const [userName, setUserName] = useState('User'); // Placeholder for user name
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Add state for sidebar collapse
  const [allComments, setAllComments] = useState<Record<string, Comment[]>>({});
  const [expandedContentSections, setExpandedContentSections] = useState<Record<string, boolean>>({}); // State for main content collapse

  // Initialize expanded state for content (e.g., start all collapsed or first one open)
  useEffect(() => {
      if (sections.length > 0) {
         // Start with first section expanded, rest collapsed
         const initialExpansionState: Record<string, boolean> = {};
         sections.forEach((section, index) => {
             initialExpansionState[section.id] = index === 0; // Expand only the first section
         });
         setExpandedContentSections(initialExpansionState);
      }
  }, [sections]); // Run when sections data changes

  // Fetch Document Data AND All Comments
  useEffect(() => {
    const fetchDocumentAndComments = async () => {
      if (!documentId) {
        setError('No document ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch user data (simplified - remove if not needed for TopBar)
        const { data: { user } } = await supabase.auth.getUser();
        setUserName(user?.email || 'User'); // Update TopBar user name

        // Fetch document content (listingdocumentdirectlisting)
        const { data: documentData, error: documentError } = await supabase
          .from('listingdocumentdirectlisting')
          .select('*')
          .eq('instrumentid', documentId)
          .single();

        if (documentError) throw documentError;
        if (!documentData) {
          setError('Document not found');
          setLoading(false);
          return;
        }

        // Fetch ALL comments for this document
        console.log(`[Main] Fetching all comments for doc: ${documentId}`);
        const { data: commentsData, error: commentsError } = await supabase
            .from('document_comments')
            .select('*') // Select all needed fields, including user_name
            .eq('document_id', documentId);
        
        if (commentsError) {
            console.error("--- Error Fetching ALL Comments --- ", commentsError);
            // Proceed without comments if fetch fails, or handle error more robustly
        }

        // Group comments by section_id (subsectionId)
        const groupedComments: Record<string, Comment[]> = {};
        commentsData?.forEach((c: any) => {
            const comment: Comment = {
                id: c.id,
                section_id: c.section_id, 
                user_id: c.user_id,
                user_name: c.user_name || 'Unknown User',
                content: c.content,
                created_at: c.created_at,
                status: 'open' as Comment['status']
            };
            if (!groupedComments[comment.section_id]) {
                groupedComments[comment.section_id] = [];
            }
            groupedComments[comment.section_id].push(comment);
        });
        setAllComments(groupedComments);
        console.log(`[Main] Grouped ${commentsData?.length || 0} comments.`);

        // Define TOC structure (can be moved outside if static)
        const tocStructure = [
          { id: 'sec1', title: 'Section 1: Document Overview', statusField: 'sec1_status', subsections: [
            { id: 'sec1_documentname', title: 'Document Name' },
            { id: 'sec1_generalinfo', title: 'General Information' },
            { id: 'sec1_corporateadvisors', title: 'Corporate Advisors' },
            { id: 'sec1_forwardlooking_statements', title: 'Forward Looking Statements' },
            { id: 'sec1_boardofdirectors', title: 'Board of Directors' },
            { id: 'sec1_salientpoints', title: 'Salient Points' },
            { id: 'sec1_purposeoflisting', title: 'Purpose of Listing' },
            { id: 'sec1_plansafterlisting', title: 'Plans After Listing' },
            { id: 'sec1_issuer_name', title: 'Issuer Name' },
            { id: 'sec1_warning', title: 'Warning' },
          ]},
          { id: 'sec2', title: 'Section 2: Securities Details', statusField: 'sec2_status', subsections: [
            { id: 'sec2_tableofcontents', title: 'Table of Contents' },
            { id: 'sec2_importantdatestimes', title: 'Important Dates & Times' },
            { id: 'sec2_generalrequirements', title: 'General Requirements' },
            { id: 'sec2_responsibleperson', title: 'Responsible Person' },
            { id: 'sec2_securitiesparticulars', title: 'Securities Particulars' },
            { id: 'sec2_securitiestowhichthisrelates', title: 'Securities To Which This Relates' },
          ]},
          { id: 'sec3', title: 'Section 3: Issuer Information', statusField: 'sec3_status', subsections: [
            { id: 'sec3_generalinfoissuer', title: 'General Information' },
            { id: 'sec3_issuerprinpactivities', title: 'Principal Activities' },
            { id: 'sec3_issuerfinanposition', title: 'Financial Position' },
            { id: 'sec3_issuersadministration_and_man', title: 'Administration & Management' },
            { id: 'sec3_recentdevelopments', title: 'Recent Developments' },
            { id: 'sec3_financialstatements', title: 'Financial Statements' },
          ]},
          { id: 'sec4', title: 'Section 4: Risk Factors', statusField: 'sec4_status', subsections: [
            { id: 'sec4_riskfactors1', title: 'Risk Factors 1' },
            { id: 'sec4_riskfactors2', title: 'Risk Factors 2' },
            { id: 'sec4_riskfactors3', title: 'Risk Factors 3' },
            { id: 'sec4_riskfactors4', title: 'Risk Factors 4' },
            { id: 'sec4_risks5', title: 'Risks 5' },
            { id: 'sec4_risks6', title: 'Risks 6' },
            { id: 'sec4_risks7', title: 'Risks 7' },
            { id: 'sec4_risks8', title: 'Risks 8' },
            { id: 'sec4_risks9', title: 'Risks 9' },
            { id: 'sec4_risks10', title: 'Risks 10' },
            { id: 'sec4_risks11', title: 'Risks 11' },
            { id: 'sec4_risks12', title: 'Risks 12' },
            { id: 'sec4_risks13', title: 'Risks 13' },
            { id: 'sec4_risks14', title: 'Risks 14' },
            { id: 'sec4_risks15', title: 'Risks 15' },
            { id: 'sec4_risks16', title: 'Risks 16' },
          ]},
          { id: 'sec5', title: 'Section 5: Securities Information', statusField: 'sec5_status', subsections: [
            { id: 'sec5_informaboutsecurts1', title: 'Information 1' },
            { id: 'sec5_informaboutsecurts2', title: 'Information 2' },
            { id: 'sec5_informaboutsecurts3', title: 'Information 3' },
            { id: 'sec5_informaboutsecurts4', title: 'Information 4' },
            { id: 'sec5_informaboutsecurts5', title: 'Information 5' },
            { id: 'sec5_informaboutsecurts6', title: 'Information 6' },
            { id: 'sec5_costs', title: 'Costs' },
          ]},
           { id: 'sec6', title: 'Section 6: Costs & Fees', statusField: null, subsections: [
            { id: 'sec6_exchange', title: 'Exchange' },
            { id: 'sec6_sponsoradvisorfees', title: 'Sponsor Advisor Fees' },
            { id: 'sec6_accountingandlegalfees', title: 'Accounting & Legal Fees' },
            { id: 'sec6_merjlistingapplication1styearfees', title: 'First Year Fees' },
            { id: 'sec6_marketingcosts', title: 'Marketing Costs' },
            { id: 'sec6_annualfees', title: 'Annual Fees' },
            { id: 'sec6_commissionforsubscription', title: 'Commission for Subscription' },
            { id: 'sec6_payingagent', title: 'Paying Agent' },
            { id: 'sec6_listingdocuments', title: 'Listing Documents' },
            { id: 'sec6_complianceapproved', title: 'Compliance Approved' },
          ]},
        ];

        // Transform data based on tocStructure including subsections
        const transformedSections: Section[] = tocStructure.map(mainSection => {
            const subsections: Subsection[] = mainSection.subsections.map(sub => ({
              id: sub.id,
              title: sub.title,
              content: documentData[sub.id] || '[No content]' 
            }));

            // FIX: Default status to 'pending'. Do NOT read from secX_status field for the keyword status.
            // const status = mainSection.statusField ? documentData[mainSection.statusField] || 'pending' : 'pending';
            const status: Section['status'] = 'pending'; // Default all to pending for now
            // TODO: Implement fetching actual keyword status from 'document_section_status' table if needed.

            return {
              id: mainSection.id,
              document_id: documentId,
              title: mainSection.title, 
              status: status, // Use the default or later fetched keyword status
              version: 1, // Placeholder
              created_at: documentData.created_at || new Date().toISOString(),
              updated_at: documentData.updated_at || new Date().toISOString(),
              subsections: subsections 
            };
        });

        setSections(transformedSections);
        if (transformedSections.length > 0) {
          setActiveSectionId(transformedSections[0].id);
        }
        setError(null);
      } catch (error: any) {
        console.error('Error fetching document:', error);
        setError(error.message || 'Failed to fetch document');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentAndComments(); // Call the updated function
  }, [documentId, supabase]);

  // Handler for updating section status
  const handleUpdateStatus = useCallback(async (sectionId: string, newStatus: Section['status']) => {
    const currentSection = sections.find(s => s.id === sectionId);
    if (!currentSection) return;

    // Optimistic UI Update
    setSections(prevSections => 
      prevSections.map(s => 
        s.id === sectionId ? { ...s, status: newStatus } : s
      )
    );

    // Construct the status column name (e.g., 'sec1_status')
    const statusColumn = `${sectionId}_status`;

    console.log(`[Status] Updating ${sectionId} to ${newStatus} (column: ${statusColumn})`);

    try {
      const { error } = await supabase
        .from('listingdocumentdirectlisting')
        .update({ 
            [statusColumn]: newStatus,
            updated_at: new Date().toISOString(),
         })
        .eq('instrumentid', documentId);

      if (error) {
        console.error(`[Status] Error updating status for ${sectionId}:`, error);
        // Revert optimistic update on error
        setSections(prevSections => 
          prevSections.map(s => 
            s.id === sectionId ? { ...s, status: currentSection.status } : s // Revert to original status
          )
        );
        // TODO: Show user-facing error message
      } else {
        console.log(`[Status] Successfully updated ${sectionId} to ${newStatus}`);
      }
    } catch (err) {
        console.error(`[Status] Unexpected error during status update for ${sectionId}:`, err);
         // Revert optimistic update on unexpected error
        setSections(prevSections => 
          prevSections.map(s => 
            s.id === sectionId ? { ...s, status: currentSection.status } : s
          )
        );
    }
  }, [sections, documentId, supabase]);

  // Handle Section Selection for Scrolling
  const handleSectionSelect = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleSidebar = useCallback(() => {
     setIsSidebarCollapsed(prev => !prev);
  }, []);

  // Handler to generate and view the full document HTML
  const handleViewFullDocument = useCallback(() => {
    console.log("[ViewFullDoc] Generating preview...");
    if (!sections || sections.length === 0) {
        console.warn("[ViewFullDoc] No sections data available to generate preview.");
        alert("Document data is not loaded yet.");
        return;
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Document Preview: ${documentId}</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: auto; }
          h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; color: #333; }
          h1 { border-bottom: 2px solid #eee; padding-bottom: 0.3em; font-size: 2em; }
          h2 { border-bottom: 1px solid #eee; padding-bottom: 0.3em; font-size: 1.5em; }
          h3 { font-size: 1.2em; color: #555; }
          pre { background-color: #f8f8f8; padding: 1em; border: 1px solid #ddd; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; font-family: monospace; }
        </style>
      </head>
      <body>
        <h1>Document Preview</h1>
    `;

    try {
      sections.forEach(section => {
        htmlContent += `<h2>${section.title} (Status: ${section.status})</h2>\n`;
        section.subsections.forEach(subsection => {
          // Basic escaping for HTML characters within the content
          const escapedContent = subsection.content
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;") || "[No content]";
              
          htmlContent += `<h3>${subsection.title}</h3>\n`;
          htmlContent += `<pre>${escapedContent}</pre>\n`; 
        });
      });

      htmlContent += `
        </body>
        </html>
      `;
      
      console.log("[ViewFullDoc] HTML Generated. Attempting to open window...");
      // console.log(htmlContent); // Uncomment to debug generated HTML

      const newWindow = window.open("", "_blank"); // Explicitly target blank
      if (newWindow) {
        newWindow.document.open(); // Explicit open
        newWindow.document.write(htmlContent);
        newWindow.document.close(); 
        console.log("[ViewFullDoc] New window opened and content written.");
      } else {
        console.error("[ViewFullDoc] window.open() failed. Likely blocked by popup blocker.");
        alert("Could not open new window. Please check your browser's popup blocker settings.");
      }
    } catch (error) {
        console.error("[ViewFullDoc] Error during HTML generation or window writing:", error);
        alert("An error occurred while generating the document preview.");
    }
  }, [sections, documentId]);

  // Handler to generate and download the document as HTML
  const handleExportDocument = useCallback(() => {
    console.log("[ExportDoc] Generating HTML...");
    if (!sections || sections.length === 0) {
        console.warn("[ExportDoc] No sections data available.");
        alert("Document data is not loaded yet.");
        return;
    }

    // Re-use the HTML generation logic from handleViewFullDocument
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Document: ${documentId}</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: auto; }
          h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; color: #333; }
          h1 { border-bottom: 2px solid #eee; padding-bottom: 0.3em; font-size: 2em; }
          h2 { border-bottom: 1px solid #eee; padding-bottom: 0.3em; font-size: 1.5em; }
          h3 { font-size: 1.2em; color: #555; }
          pre { background-color: #f8f8f8; padding: 1em; border: 1px solid #ddd; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; font-family: monospace; }
        </style>
      </head>
      <body>
        <h1>Document: ${documentId}</h1>
    `;

    try {
      sections.forEach(section => {
        htmlContent += `<h2>${section.title} (Status: ${section.status})</h2>\n`;
        section.subsections.forEach(subsection => {
          const escapedContent = subsection.content
              .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;").replace(/'/g, "&#039;") || "[No content]";
          htmlContent += `<h3>${subsection.title}</h3>\n`;
          htmlContent += `<pre>${escapedContent}</pre>\n`; 
        });
      });
      htmlContent += `</body></html>`;

      console.log("[ExportDoc] HTML Generated. Triggering download...");

      // Create a Blob from the HTML string
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' }); // Set type to text/html

      // Create a temporary URL
      const url = URL.createObjectURL(blob);

      // Create a temporary anchor element
      const link = document.createElement("a");
      link.href = url;
      const fileName = `document-${documentId}.html`; // Change extension to .html
      link.download = fileName; 

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      console.log(`[ExportDoc] Download triggered as ${fileName}.`);

    } catch (error) {
        console.error("[ExportDoc] Error during HTML generation or download:", error);
        alert("An error occurred while exporting the document.");
    }
  }, [sections, documentId]);

  // Handler to toggle content section expansion
  const toggleContentSection = useCallback((sectionId: string) => {
    setExpandedContentSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  // --- Render Logic ---
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col bg-gray-100 min-h-screen">
      <TopBar 
        userName={userName} 
        isSidebarCollapsed={isSidebarCollapsed} 
        toggleSidebar={toggleSidebar} 
        onViewFullDocument={handleViewFullDocument} 
        onExportDocument={handleExportDocument}
      /> 
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-4rem)]">
        <TableOfContents
          sections={sections}
          activeSectionId={activeSectionId}
          onSectionSelect={handleSectionSelect}
          isCollapsed={isSidebarCollapsed}
        />
        <main className={cn(
          "flex-1 overflow-auto p-6 transition-all duration-300 ease-in-out"
          )}>
          {sections.map(section => (
            <SectionDisplay 
              key={section.id}
              section={section}
              commentsBySubsection={allComments}
              onUpdateStatus={handleUpdateStatus}
              userName={userName}
              isExpanded={!!expandedContentSections[section.id]}
              onToggleExpand={() => toggleContentSection(section.id)}
            />
          ))}
        </main>
      </div>
    </div>
  );
} 