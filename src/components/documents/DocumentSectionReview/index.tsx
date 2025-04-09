'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentAnalysis } from '@/contexts/DocumentAnalysisContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ArrowLeft, CheckCircle, XCircle, Clock, Lock as LockIcon, UserCircle, MessageSquare, Bot, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Trash2 } from 'lucide-react';
import { Editor } from '../../../components/ui/editor';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"

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
const TopBar = ({ userName, isSidebarCollapsed, toggleSidebar }: {
  userName: string;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}) => (
  <div className="flex justify-between items-center p-4 border-b bg-white sticky top-0 z-10">
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2">
        {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </Button>
      <Button variant="outline">View Full Document</Button>
      <Button variant="outline">Export</Button>
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
      ]},
    ];

  return (
    <ScrollArea className={cn(
      "border-r h-[calc(100vh-4rem)] bg-gray-50 sticky top-[65px] transition-all duration-300 ease-in-out",
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
const SectionHeader = ({ section, userName }: {
  section: Section;
  userName: string;
}) => (
  <div className="flex justify-between items-center mb-2 p-3 bg-gray-50 rounded-t-md border-b">
    <div className="flex items-center gap-2">
      {/* Icon based on section type could go here */}
      <h3 className="text-md font-semibold">{section.title} <span className="text-sm font-normal text-gray-500">({section.status})</span></h3>
    </div>
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        {/* <AvatarImage src={userAvatarUrl} /> */}
        <AvatarFallback className="text-xs">{userName.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <Button variant="outline" size="sm"><Bot className="h-4 w-4 mr-1"/> AI Analyse</Button>
      <Button variant="destructive" size="sm"><LockIcon className="h-4 w-4 mr-1"/> Lock</Button>
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
                onClick={() => handleDeleteComment(comment.id)}
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
  // TODO: Fetch AI feedback based on subsectionId / documentId / version
  const analysisResult = null; // Placeholder for fetched feedback
  const hasFeedback = !!analysisResult; // Determine if feedback exists

  // --- MOCK DISPLAY LOGIC --- 
  // Show mock feedback only for the very first subsection ('sec1_documentname')
  const showMockFeedback = subsectionId === 'sec1_documentname'; 
  // --- END MOCK DISPLAY LOGIC ---

  if (!showMockFeedback && !hasFeedback) return null; // Hide if not the target subsection and no real feedback

  return (
    <div className="mt-4 p-3 border-t bg-blue-50 rounded-b-md"> 
       <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><Bot className="h-4 w-4 text-blue-600"/> AI Feedback:</h4>
       {/* If real feedback exists, show it */} 
       {hasFeedback ? (
          <div className="text-sm text-gray-700">
             <p>AI analysis data would go here.</p>
          </div>
       ) 
       /* Otherwise, if it's the target subsection for mock display, show mock data */
       : showMockFeedback ? (
         <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Check for grammar and spelling errors.</li>
            <li>Ensure the content is clear and concise.</li>
            <li>Consider adding more details to support your claims.</li>
         </ul>
       )
       /* Otherwise, render nothing (shouldn't be reached due to top check, but safe fallback) */
       : null}
    </div>
  );
};

// Single Section Display Component
const SectionDisplay = ({ section, commentsBySubsection, onSaveChanges, userName }: {
  section: Section;
  commentsBySubsection: Record<string, Comment[]>; // Receive grouped comments
  onSaveChanges: (sectionId: string) => void;
  userName: string;
}) => (
  <div id={section.id} className="mb-6 border rounded-md bg-white shadow-sm">
    <SectionHeader section={section} userName={userName} />
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
  const [allComments, setAllComments] = useState<Record<string, Comment[]>>({}); // Store comments grouped by subsectionId

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
          ]},
        ];

        // Transform data based on tocStructure including subsections
        const transformedSections: Section[] = tocStructure.map(mainSection => {
            const subsections: Subsection[] = mainSection.subsections.map(sub => ({
              id: sub.id,
              title: sub.title,
              content: documentData[sub.id] || '[No content]' // Get content for this specific field
            }));

            const status = mainSection.statusField ? documentData[mainSection.statusField] || 'pending' : 'pending';

            return {
              id: mainSection.id,
              document_id: documentId,
              title: mainSection.title, 
              status: status as Section['status'],
              version: 1, // Placeholder
              created_at: documentData.created_at || new Date().toISOString(),
              updated_at: documentData.updated_at || new Date().toISOString(),
              subsections: subsections // Assign the created subsections array
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

  // Repurpose or remove handleSaveChanges
  const handleSaveChanges = useCallback(async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    console.log("Review action triggered for section:", sectionId, "Current Status:", section.status);
    // Implement review actions here, e.g., updating status in 'document_section_status' table
    // Example: Update status to 'in_progress' if it was 'pending'
    /*
    if (section.status === 'pending') {
      try {
        const { error } = await supabase
          .from('document_section_status') // Assuming this table tracks review status per main section
          .upsert({
             document_id: documentId,
             section_id: sectionId,
             status: 'in_progress', 
             updated_at: new Date().toISOString(),
             // updated_by: user?.id // Add user ID
           }, { onConflict: 'document_id, section_id' })
          .select();
        
        if (error) throw error;

        // Update local state
        setSections(prevSections => prevSections.map(s => 
          s.id === sectionId ? { ...s, status: 'in_progress' } : s
        ));

      } catch (err) {
        console.error("Error updating section status:", err);
      }
    }
    */

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

  // --- Render Logic ---
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">Error: {error}</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <TopBar 
        userName={userName} 
        isSidebarCollapsed={isSidebarCollapsed} 
        toggleSidebar={toggleSidebar} 
      /> 
      <div className="flex flex-1 overflow-hidden">
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
              onSaveChanges={handleSaveChanges}
              userName={userName}
            />
          ))}
        </main>
      </div>
    </div>
  );
} 