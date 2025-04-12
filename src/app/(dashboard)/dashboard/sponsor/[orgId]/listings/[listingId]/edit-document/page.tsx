'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, CheckCircle, Clock, Lock as LockIcon, MessageSquare, PanelLeftClose, PanelLeftOpen, Loader2, ChevronDown, ChevronUp, FileText, Printer, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";

// --- Interfaces (Copied and adapted from DocumentSectionReview) ---
interface Subsection {
  id: string;
  title: string;
  content: string;
}

interface Section {
  id: string;
  document_id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress' | 'draft' | 'locked' | 'ai_reviewed'; // Keep status type for checking locks
  subsections: Subsection[];
}

interface Comment {
  id: string;
  section_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  created_at: string;
}

interface TocSubsection {
    id: string;
    title: string;
}
interface TocSection {
    id: string;
    title: string;
    statusField: string | null; // Field name for the section's approval status
    subsections: TocSubsection[];
}

// --- TOC Structure Definition ---
const tocStructure: TocSection[] = [
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
     { id: 'sec6', title: 'Section 6: Costs & Fees', statusField: 'sec6_status', subsections: [
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

// --- Sub-Components (Adapted for Sponsor Editing) ---

// CommentsSection Component (Largely reusable from DocumentSectionReview)
const CommentsSection = ({ subsectionId, documentId, initialComments }: {
  subsectionId: string;
  documentId: string;
  initialComments: Comment[];
}) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const supabase = getSupabaseClient();
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    const fetchCurrentUser = async () => {
        let fetchedUserId: string | null = null;
        let fetchedUserName: string | null = null;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                fetchedUserId = user.id;
                // Fetch profile for name if available
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                fetchedUserName = profile?.full_name || user.email || 'Sponsor User';
            }
        } catch (authError) {
             console.error("Error fetching authenticated user:", authError);
        }
        if (isMounted) {
            setCurrentUser(fetchedUserId ? { id: fetchedUserId, name: fetchedUserName || 'Sponsor User' } : null);
        }
    };
    fetchCurrentUser();

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
                const newCommentData = payload.new;
                const formattedComment: Comment = {
                    id: newCommentData.id,
                    section_id: newCommentData.section_id,
                    user_id: newCommentData.user_id,
                    user_name: newCommentData.user_name || 'Unknown User',
                    content: newCommentData.content || '',
                    created_at: newCommentData.created_at || new Date().toISOString(),
                };
                setComments(prevComments => {
                     // Avoid duplicates from subscription + optimistic update
                     if (prevComments.some(c => c.id === formattedComment.id)) {
                        return prevComments;
                    }
                    return [...prevComments, formattedComment];
                });
            }
        )
        .subscribe();

    return () => {
        isMounted = false;
        supabase.removeChannel(channel);
    };
  }, [subsectionId, documentId, supabase]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
        id: tempId,
        section_id: subsectionId,
        user_id: currentUser.id,
        user_name: currentUser.name,
        content: newComment.trim(),
        created_at: new Date().toISOString(),
    };

    setComments(prevComments => [...prevComments, optimisticComment]);
    const originalCommentText = newComment;
    setNewComment('');

    const commentToInsert = {
      document_id: documentId,
      section_id: subsectionId,
      user_id: currentUser.id,
      user_name: currentUser.name,
      content: optimisticComment.content,
    };

    const { data, error } = await supabase
      .from('document_comments')
      .insert(commentToInsert)
      .select()
      .single();

    if (error) {
      console.error("[Comments] Error posting comment:", error);
      setComments(prevComments => prevComments.filter(c => c.id !== tempId));
      setNewComment(originalCommentText);
      toast({ title: "Error", description: "Failed to post comment.", variant: "destructive" });
    } else {
        // Update optimistic comment with real data if needed (ID, created_at)
        if (data) {
           const confirmedComment: Comment = { ...optimisticComment, id: data.id, created_at: data.created_at };
           setComments(prevComments => prevComments.map(c => c.id === tempId ? confirmedComment : c));
        }
    }
  };

  return (
     <div className="mt-4 p-3 border-t bg-white">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><MessageSquare className="h-4 w-4"/> Comments ({comments.length})</h4>
        <div className="space-y-3 mb-3 max-h-60 overflow-y-auto pr-2"> {/* Added max height and scroll */}
            {comments.map(comment => (
                <div key={comment.id} className="flex gap-2 items-start text-sm group relative">
                    <Avatar className="h-6 w-6 mt-1">
                         <AvatarFallback className="text-xs">{comment.user_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-gray-100 rounded p-2">
                         <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{comment.user_name || 'User'}</span>
                            <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    {/* Add delete button if needed, respecting permissions */}
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
                disabled={!currentUser} // Disable if user info not loaded
            />
            <Button onClick={handlePostComment} disabled={!newComment.trim() || !currentUser} size="sm">Post</Button>
        </div>
     </div>
  );
};

// --- Main Page Component ---
export default function SponsorEditDocumentPage() {
    const params = useParams();
    const router = useRouter();
    const { orgId, listingId } = params as { orgId: string; listingId: string };
    const supabase = getSupabaseClient();
    const { user } = useAuth(); // Get authenticated sponsor user
    const { toast } = useToast();

    // State for sections, comments, loading, errors, etc.
    const [sections, setSections] = useState<Section[]>([]);
    const [commentsBySubsection, setCommentsBySubsection] = useState<Record<string, Comment[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [userName, setUserName] = useState<string>('Sponsor'); // Default or fetch profile
    const [expandedContentSections, setExpandedContentSections] = useState<Record<string, boolean>>({});
    const [overallDocumentStatus, setOverallDocumentStatus] = useState<string | null>(null);
    const [localChanges, setLocalChanges] = useState<Record<string, string>>({});

    // NEW state for hierarchical TOC and View Full Document Modal
    const [expandedTocSections, setExpandedTocSections] = useState<Record<string, boolean>>({});
    const [isViewFullDocumentModalOpen, setIsViewFullDocumentModalOpen] = useState(false);

    // NEW state for individual subsection saving
    const [savingSubsectionId, setSavingSubsectionId] = useState<string | null>(null);

    // Helper to map DB status (likely irrelevant here but kept for consistency)
    const mapDbStatusToSectionStatus = (dbStatus: string | null): Section['status'] => {
         if (dbStatus === 'approved') return 'approved';
         // Treat other statuses generally as editable unless approved
         return 'pending';
    };

    // Fetch Data (Document Content, Section Statuses, Comments)
    const fetchData = useCallback(async () => {
        if (!listingId || !user) {
            setError('Missing listing ID or user information.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
             // Fetch user name from profile
             const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
             setUserName(profile?.full_name || user.email || 'Sponsor');

            // Fetch listing document content AND section statuses
            const { data: listingDocData, error: listingDocError } = await supabase
                .from('listingdocumentdirectlisting')
                .select('*') // Select all columns (content + statuses)
                .eq('instrumentid', listingId)
                .single();

            if (listingDocError) throw new Error(`Failed to fetch document details: ${listingDocError.message}`);
            if (!listingDocData) throw new Error('Document data not found.');

             // Fetch overall status (needed? Maybe not for editing logic)
             const { data: listingData, error: listingError } = await supabase
                .from('listing')
                .select('instrumentsecuritiesadmissionstatus')
                .eq('instrumentid', listingId)
                .single();
            if (listingError) console.warn("Could not fetch overall status", listingError.message);
            setOverallDocumentStatus(listingData?.instrumentsecuritiesadmissionstatus);

            // Fetch comments
            const { data: commentsData, error: commentsError } = await supabase
                .from('document_comments')
                .select('*') // Select all columns directly, including user_name
                .eq('document_id', listingId);

            if (commentsError) throw new Error(`Failed to fetch comments: ${commentsError.message}`);

            // Group comments
            const groupedComments: Record<string, Comment[]> = {};
            (commentsData || []).forEach((comment: any) => {
                const sectionId = comment.section_id;
                if (!groupedComments[sectionId]) groupedComments[sectionId] = [];
                groupedComments[sectionId].push({
                    id: comment.id,
                    section_id: comment.section_id,
                    user_id: comment.user_id,
                    user_name: comment.user_name || 'Unknown User', // Access direct field
                    content: comment.content,
                    created_at: comment.created_at,
                });
            });
            setCommentsBySubsection(groupedComments);

            // Transform DB data into Section[] state using tocStructure
             const transformedSections: Section[] = tocStructure.map(mainSection => {
                const subsections: Subsection[] = mainSection.subsections.map(sub => ({
                    id: sub.id,
                    title: sub.title,
                    content: listingDocData[sub.id] || '', // Get content from DB data
                }));

                const statusField = mainSection.statusField;
                const dbStatus = statusField ? listingDocData[statusField] : 'pending'; // Get section status

                return {
                    id: mainSection.id,
                    document_id: listingId,
                    title: mainSection.title,
                    status: mapDbStatusToSectionStatus(dbStatus), // Store the section status
                    subsections: subsections,
                };
            });
            setSections(transformedSections);

            // Set initial active/expanded states
            if (transformedSections.length > 0) {
                const firstSectionId = transformedSections[0].id;
                 setActiveSectionId(firstSectionId);
                 setExpandedContentSections({ [firstSectionId]: true });
                 setExpandedTocSections({ [firstSectionId]: true }); // Expand first section in TOC too
            }

        } catch (err) {
            console.error("Error loading document edit page:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    }, [listingId, supabase, user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Handlers ---
    const handleContentChange = (subsectionId: string, newContent: string) => {
        setLocalChanges(prev => ({ ...prev, [subsectionId]: newContent }));
        // Update the sections state visually immediately
        setSections(prevSections => prevSections.map(sec => ({
            ...sec,
            subsections: sec.subsections.map(sub =>
                sub.id === subsectionId ? { ...sub, content: newContent } : sub
            )
        })));
    };

    // Handler for the main "Save Changes" button (saves all pending changes)
    const handleSaveChanges = async () => {
        if (Object.keys(localChanges).length === 0) {
            toast({ title: "No Changes", description: "No modifications were made.", variant: "default" });
            return;
        }
        setIsSaving(true); // Use the general saving state for the main button
        try {
            const { error } = await supabase
                .from('listingdocumentdirectlisting')
                .update(localChanges) // Send all accumulated changes
                .eq('instrumentid', listingId);

            if (error) throw error;

            setLocalChanges({}); // Clear local changes tracker
            toast({ title: "Success", description: "All document changes saved successfully." });

        } catch (err) {
             console.error("Error saving document changes:", err);
             toast({ title: "Save Error", description: `Failed to save changes: ${err instanceof Error ? err.message : 'Unknown error'}`, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // NEW Handler for saving individual subsections
    const handleSaveSubsection = async (subsectionId: string) => {
        const newContent = localChanges[subsectionId];
        if (newContent === undefined) { // Should not happen if button is enabled correctly
            toast({ title: "Info", description: "No changes detected for this section.", variant: "default"});
            return;
        }

        setSavingSubsectionId(subsectionId); // Set loading state for this specific subsection
        try {
            const { error } = await supabase
                .from('listingdocumentdirectlisting')
                .update({ [subsectionId]: newContent }) // Update only the specific field
                .eq('instrumentid', listingId);

            if (error) throw error;

            // Clear the change from the main tracker on success
            setLocalChanges(prev => {
                const { [subsectionId]: _, ...rest } = prev;
                return rest;
            });
            toast({ title: "Subsection Saved", description: `Changes to section saved successfully.` });

        } catch (err) {
             console.error(`Error saving subsection ${subsectionId}:`, err);
             toast({ title: "Save Error", description: `Failed to save this section: ${err instanceof Error ? err.message : 'Unknown error'}`, variant: "destructive" });
             // Keep the change in localChanges on error, so user can retry
        } finally {
            setSavingSubsectionId(null); // Clear loading state regardless of outcome
        }
    };

    const handleSectionSelect = (sectionId: string, isSubsection: boolean = false) => {
        const element = document.getElementById(sectionId);
        if (element) {
             const mainSectionId = isSubsection ? sectionId.split('_')[0] : sectionId; // Find parent section if subsection

             // Ensure the main content section is expanded
             if (!expandedContentSections[mainSectionId]) {
                 toggleContentSection(mainSectionId);
             }
             // Ensure the TOC section is expanded if selecting a subsection
             if (isSubsection && !expandedTocSections[mainSectionId]){
                 toggleTocSection(mainSectionId);
             }

             // Set active section (could be main or sub)
             setActiveSectionId(sectionId);

             // Scroll after potential state updates
             setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
             }, 150); // Increased timeout slightly
        }
    };

    const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
    const toggleContentSection = (sectionId: string) => setExpandedContentSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    const toggleTocSection = (sectionId: string) => setExpandedTocSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] })); // Handler for TOC expansion

    const handleViewFullDocument = () => setIsViewFullDocumentModalOpen(true);
    const handlePrint = () => window.print();

    // --- Render Logic ---
    if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin inline-block mr-2"/> Loading document...</div>;
    if (error) return <div className="p-8 text-center text-red-600">Error loading document: {error}</div>;

    // Prepare content for the modal
    const fullDocumentHtml = sections.map(section => (
        `<div class="mb-8">` +
        `<h2 class="text-2xl font-semibold border-b pb-2 mb-4">${section.title}</h2>` +
        section.subsections.map(sub => (
            `<div class="mb-4">` +
            `<h3 class="text-lg font-medium mb-1">${sub.title}</h3>` +
            // Basic HTML conversion (replace newlines with <br>)
            `<div class="prose prose-sm max-w-none text-gray-800">${sub.content.replace(/\n/g, '<br />')}</div>` +
            `</div>`
        )).join('') +
        `</div>`
    )).join('');

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100">
            {/* Hierarchical Table of Contents */}
             <ScrollArea className={cn(
                "border-r h-full bg-gray-50 sticky top-0 transition-all duration-300 ease-in-out",
                isSidebarCollapsed ? "w-0 opacity-0 p-0 border-none" : "w-72 p-4 opacity-100"
                )}>
                 {!isSidebarCollapsed && (
                    <div>
                        <h2 className="font-semibold mb-4 text-sm text-gray-600">Document Sections</h2>
                         <div className="space-y-1">
                           {tocStructure.map((mainSection) => {
                                const sectionData = sections.find(s => s.id === mainSection.id);
                                const isLocked = sectionData?.status === 'approved';
                                const isTocExpanded = !!expandedTocSections[mainSection.id];

                                return (
                                    <div key={mainSection.id}>
                                        {/* Main Section Header in TOC */}
                                        <div
                                            className={cn(
                                                "p-2 rounded cursor-pointer hover:bg-gray-200 flex items-center justify-between",
                                                activeSectionId === mainSection.id && !activeSectionId.includes('_') ? "bg-blue-100 hover:bg-blue-200" : "",
                                                isLocked && "text-gray-500"
                                            )}
                                            onClick={() => handleSectionSelect(mainSection.id, false)}
                                            title={isLocked ? 'Approved / Locked' : mainSection.title}
                                        >
                                            <span className="text-sm font-medium truncate flex-1 mr-2">
                                                {mainSection.title}
                                            </span>
                                            <div className='flex items-center'>
                                                {isLocked && <LockIcon className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />}
                                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); toggleTocSection(mainSection.id); }}>
                                                    {isTocExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Subsections in TOC (conditionally rendered) */}
                                        {isTocExpanded && (
                                            <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                                                {mainSection.subsections.map(subSection => (
                                                    <div
                                                        key={subSection.id}
                                                        className={cn(
                                                            "p-1.5 rounded cursor-pointer hover:bg-gray-200 text-xs truncate",
                                                            activeSectionId === subSection.id ? "bg-blue-100 hover:bg-blue-200 font-medium" : "text-gray-600",
                                                            isLocked && "text-gray-500 cursor-not-allowed"
                                                        )}
                                                        onClick={(e) => { e.stopPropagation(); handleSectionSelect(subSection.id, true); }}
                                                        title={subSection.title}
                                                    >
                                                        {subSection.title}
                                                    </div>
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

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                 {/* Adapted Top Bar */}
                 <div className="flex justify-between items-center p-4 border-b bg-white sticky top-0 z-10 h-16">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2">
                            {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                        </Button>
                         <h1 className="text-xl font-semibold text-gray-900">Edit Listing Document</h1>
                     </div>
                     <div className="flex items-center gap-4">
                         <Button variant="outline" onClick={handleViewFullDocument}> {/* View Full Doc Button */}
                             <FileText className="mr-2 h-4 w-4"/> View Full Document
                         </Button>
                        <Button onClick={handleSaveChanges} disabled={isSaving || Object.keys(localChanges).length === 0}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                            Save Changes
                         </Button>
                         {/* Maybe add a 'Cancel' or 'Back to Listings' button */}
                         <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                     </div>
                </div>

                {/* Scrollable Edit Area */}
                <ScrollArea className="flex-1 overflow-y-auto bg-white">
                     <div className="p-6 space-y-4 max-w-4xl mx-auto">
                         {sections.map((section) => {
                             const isSectionLocked = section.status === 'approved';
                             const isExpanded = !!expandedContentSections[section.id];

                             return (
                                <div key={section.id} id={section.id} className="border rounded-md overflow-hidden scroll-mt-20">
                                    {/* Section Header with Toggle Button */}
                                    <div
                                        className="flex items-center justify-between p-4 bg-gray-100 cursor-pointer hover:bg-gray-200"
                                        onClick={() => toggleContentSection(section.id)} // Toggle on header click
                                    >
                                        <h2 className="text-lg font-semibold text-gray-800">{section.title}</h2>
                                        <div className="flex items-center gap-2">
                                            {isSectionLocked && (
                                                <span className="text-xs font-medium text-gray-500 flex items-center">
                                                    <LockIcon className="h-3 w-3 mr-1" /> Approved / Locked
                                                </span>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-6 w-6"> {/* Toggle Button */}
                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Conditionally Rendered Section Content */}
                                    {isExpanded && (
                                        <div className="p-4 border-t space-y-6 bg-white">
                                            {section.subsections.map(subsection => {
                                                const hasUnsavedChange = localChanges[subsection.id] !== undefined;
                                                const isSavingThis = savingSubsectionId === subsection.id;
                                                return (
                                                    <div key={subsection.id} id={subsection.id} className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <label className="block text-sm font-medium text-gray-700">{subsection.title}</label>
                                                            {/* Individual Save Button */}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleSaveSubsection(subsection.id)}
                                                                disabled={isSectionLocked || !hasUnsavedChange || isSavingThis || isSaving} // Disable if section locked, no changes, saving this, or main save running
                                                                className="h-7 text-xs px-2"
                                                            >
                                                                {isSavingThis ? (
                                                                    <Loader2 className="mr-1 h-3 w-3 animate-spin"/>
                                                                ) : (
                                                                    <Save className="mr-1 h-3 w-3" />
                                                                )}
                                                                Save Section
                                                            </Button>
                                                        </div>
                                                        <Textarea
                                                             value={subsection.content} // Display current content (updated visually by onChange)
                                                             onChange={(e) => handleContentChange(subsection.id, e.target.value)}
                                                             readOnly={isSectionLocked} // Make readOnly if section is locked
                                                             rows={6} // Adjust rows as needed
                                                             className={cn(
                                                                 "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500",
                                                                 isSectionLocked && "bg-gray-100 cursor-not-allowed",
                                                                 hasUnsavedChange && !isSectionLocked && "border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500" // Highlight unsaved changes
                                                             )}
                                                         />
                                                         {/* Comments Section */}
                                                         <CommentsSection
                                                             subsectionId={subsection.id}
                                                             documentId={listingId}
                                                             initialComments={commentsBySubsection[subsection.id] || []}
                                                         />
                                                    </div>
                                                );
                                             })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {sections.length === 0 && <div className="text-center text-gray-500 py-16">No document sections found or loaded.</div>}
                    </div>
                </ScrollArea>
            </div>

             {/* View Full Document Modal */}
             <Dialog open={isViewFullDocumentModalOpen} onOpenChange={setIsViewFullDocumentModalOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Full Document Preview</DialogTitle>
                        <DialogDescription>
                            Read-only view of the entire document content. Use the button below to print or save as PDF.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 my-4 pr-6 -mr-6">
                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: fullDocumentHtml }} />
                    </ScrollArea>
                    <DialogFooter className="sm:justify-between">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4"/> Print / Save as PDF
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 