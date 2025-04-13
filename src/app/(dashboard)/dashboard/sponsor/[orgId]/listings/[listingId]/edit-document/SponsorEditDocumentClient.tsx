'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, TextareaHTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Lock as LockIcon, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Save, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import CommentSection from '@/components/documents/DocumentSectionReview/CommentSection';
import type { Comment } from '@/components/documents/DocumentSectionReview/types';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Combine all styles into a single string at the top
const combinedStyles = `
  /* Pulsing section indicator styles */
  @keyframes pulse {
    0% { opacity: 0.3; transform: scale(0.95); }
    50% { opacity: 1; transform: scale(1.05); }
    100% { opacity: 0.3; transform: scale(0.95); }
  }
  
  .section-analyzing-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #3b82f6;
    margin-left: 8px;
    animation: pulse 1.5s infinite ease-in-out;
  }
`;

// Define the desired MAIN section order
const SECTION_ORDER = ['sec1', 'sec2', 'sec3', 'sec4', 'sec5', 'sec6'];

// --- Interfaces ---
interface Subsection {
  id: string;
  title: string;
  content: string;
}

interface Section {
  id: string;
  document_id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress' | 'draft' | 'locked';
  version: number;
  created_at: string;
  updated_at: string;
  subsections: Subsection[];
}

export interface SponsorEditDocumentClientProps {
    initialSections: Section[];
  groupedComments: Record<string, Comment[]>;
  documentId: string;
  userId: string;
  userName: string;
}

// --- NEW AutosizeTextarea Component ---
interface AutosizeTextareaProps extends TextareaProps {
  // Inherit all props from Shadcn Textarea
}

const AutosizeTextarea = React.forwardRef<HTMLTextAreaElement, AutosizeTextareaProps>((
  { value, className, ...props }, 
  ref // Forwarded ref
) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  // Use forwarded ref if provided, otherwise use internal ref
  const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Temporarily reset height to allow shrinking
      textarea.style.height = 'auto'; 
      // Set height to scroll height
      textarea.style.height = `${textarea.scrollHeight}px`;
      // Ensure overflow is hidden to prevent scrollbar flash
      textarea.style.overflow = 'hidden'; 
    }
  }, [value, textareaRef]); // Re-run effect when value changes

  return (
    <Textarea
      ref={textareaRef} // Pass the ref to the underlying Textarea
      value={value}
      className={cn(
          "overflow-hidden", // Add overflow hidden here too
          className // Merge with passed class names
      )}
      rows={1} // Start with minimum rows, height will adjust
      {...props}
    />
  );
});
AutosizeTextarea.displayName = 'AutosizeTextarea';

// Define the desired subsection order for sorting the TOC - RE-ADDING
const SUBSECTION_ORDER: Record<string, string[]> = {
  sec1: [
    'sec1_documentname',
    'sec1_generalinfo',
    'sec1_corporateadvisors',
    'sec1_forwardlooking_statements',
    'sec1_boardofdirectors',
    'sec1_salientpoints',
    'sec1_purposeoflisting',
    'sec1_plansafterlisting',
    'sec1_issuer_name',
    'sec1_warning',
  ],
  sec2: [
    'sec2_tableofcontents',
    'sec2_importantdatestimes',
    'sec2_generalrequirements',
    'sec2_responsibleperson',
    'sec2_securitiesparticulars',
    'sec2_securitiestowhichthisrelates',
  ],
  sec3: [
    'sec3_generalinfoissuer',
    'sec3_issuerprinpactivities',
    'sec3_issuerfinanposition',
    'sec3_issuersadministration_and_man',
    'sec3_recentdevelopments',
    'sec3_financialstatements',
  ],
  sec4: [
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
    'sec4_risks16',
  ],
  sec5: [
    'sec5_informaboutsecurts1',
    'sec5_informaboutsecurts2',
    'sec5_informaboutsecurts3',
    'sec5_informaboutsecurts4',
    'sec5_informaboutsecurts5',
    'sec5_informaboutsecurts6',
    'sec5_costs',
  ],
  sec6: [
    'sec6_exchange',
    'sec6_sponsoradvisorfees',
    'sec6_accountingandlegalfees',
    'sec6_merjlistingapplication1styearfees',
    'sec6_marketingcosts',
    'sec6_annualfees',
    'sec6_commissionforsubscription',
    'sec6_payingagent',
    'sec6_listingdocuments',
    'sec6_complianceapproved',
  ],
};

// --- Sub-Components ---

// Top Bar Component
const TopBar = ({ userName, isSidebarCollapsed, toggleSidebar, onViewFullDocument, onSaveAll, hasUnsavedChanges, onSubmitForReview }: {
  userName: string;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  onViewFullDocument: () => void;
  onSaveAll: () => Promise<void>;
  hasUnsavedChanges: boolean;
  onSubmitForReview: () => Promise<void>;
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveAll();
            setIsSaving(false);
  };

  const handleSubmit = async () => {
      setIsSubmitting(true);
      await onSubmitForReview();
      setIsSubmitting(false);
  };

  return (
    <div className="flex justify-between items-center px-4 py-2 border-b bg-white sticky top-0 z-20 h-16 shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-gray-600 hover:text-gray-900">
          {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
        <Button variant="outline" onClick={onViewFullDocument}>View Full Document</Button>
      </div>
      <div className="flex items-center gap-3">
        <Button 
            variant="default"
            onClick={handleSubmit}
            disabled={hasUnsavedChanges || isSubmitting || isSaving}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
            {isSubmitting ? (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
                <CheckCircle className="h-4 w-4" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
        </Button>
        <Button 
          variant="default" 
          onClick={handleSave} 
          disabled={!hasUnsavedChanges || isSaving || isSubmitting} 
          className="gap-2"
        >
          {isSaving ? (
             <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
             !hasUnsavedChanges && !isSubmitting ? <CheckCircle className="h-4 w-4 text-green-300" /> : <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : (hasUnsavedChanges ? 'Save All Changes' : 'All Saved')}
        </Button>
        <Separator orientation="vertical" className="h-6 mx-2" />
        <div className="flex items-center gap-2">
           <Avatar className="h-8 w-8">
             <AvatarFallback>{userName ? userName.substring(0, 2).toUpperCase() : '...'}</AvatarFallback>
           </Avatar>
           <span className="text-sm font-medium text-gray-700">{userName || 'Loading...'}</span>
        </div>
      </div>
    </div>
  );
};

// Table of Contents Component - RE-ADDING SORTING based on predefined order
const TableOfContents = ({ sections, activeSubsectionId, onSubsectionSelect, isCollapsed }: {
  sections: Section[];
  activeSubsectionId: string | null;
  onSubsectionSelect: (subsectionId: string) => void;
  isCollapsed: boolean;
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
      const initialExpanded: Record<string, boolean> = {};
      if (activeSubsectionId) {
          const activeSection = sections.find(s => s.subsections.some(sub => sub.id === activeSubsectionId));
          if (activeSection) initialExpanded[activeSection.id] = true;
      } else if (sections.length > 0 && sections[0].subsections.length > 0) {
          const firstActiveSection = sections.find(s => s.subsections.some(sub => sub.content?.trim()));
          if (firstActiveSection) initialExpanded[firstActiveSection.id] = true;
      }
      return initialExpanded;
  });

  useEffect(() => {
      if (activeSubsectionId) {
          const activeSection = sections.find(s => s.subsections.some(sub => sub.id === activeSubsectionId));
          if (activeSection && !expandedSections[activeSection.id]) {
              setExpandedSections(prev => ({ ...prev, [activeSection.id]: true }));
          }
      }
  }, [activeSubsectionId, sections, expandedSections]);

  const toggleExpand = (sectionId: string) => {
      setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    return (
    <ScrollArea className={cn(
      "border-r h-[calc(100vh-4rem)] bg-gray-50 sticky top-16 transition-all duration-300 ease-in-out shrink-0",
      isCollapsed ? "w-0 opacity-0 p-0 border-none" : "w-72 p-4 opacity-100"
    )}>
      {!isCollapsed && (
        <div>
          <h2 className="font-semibold mb-4 text-sm text-gray-600">Table of Contents</h2>
          <nav className="space-y-1"> 
            {sections.map((section) => {
              const isExpanded = expandedSections[section.id];
              
              // *** RE-ADD Subsection Sorting Logic based on SUBSECTION_ORDER ***
              const orderedSubsectionIds = SUBSECTION_ORDER[section.id] || [];
              const sortedSubsections = [...section.subsections].sort((a, b) => {
                const indexA = orderedSubsectionIds.indexOf(a.id);
                const indexB = orderedSubsectionIds.indexOf(b.id);
                // If both are in the defined order, sort by that order
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                // If only A is in the order, it comes first
                if (indexA !== -1) return -1;
                // If only B is in the order, it comes first
                if (indexB !== -1) return 1;
                // Otherwise, maintain relative order or sort alphabetically as fallback
                return a.title.localeCompare(b.title);
              });

              return (
                <div key={section.id}> 
                            <button
                    onClick={() => toggleExpand(section.id)}
                    className="flex items-center w-full text-left py-2 px-2 hover:bg-gray-200 rounded-md gap-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />}
                    <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{section.title}</span>
                            </button>
                  {isExpanded && (
                    <div className="mt-1 pl-5 pr-1 space-y-1 border-l-2 border-gray-200 ml-[10px]">
                      {/* Map over SORTED subsections array */} 
                      {sortedSubsections.map((subsection) => (
                                        <button
                          key={subsection.id}
                          onClick={() => onSubsectionSelect(subsection.id)}
                          className={cn(
                            "w-full text-left py-1.5 px-2 text-sm hover:bg-gray-200 rounded-md truncate block", 
                            "focus:outline-none focus:ring-1 focus:ring-blue-300", 
                            activeSubsectionId === subsection.id 
                              ? "bg-blue-100 text-blue-800 font-medium"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                                        >
                                            {subsection.title}
                                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </ScrollArea>
  );
};

// Main Content Area - Apply Subsection Sorting
const MainContentArea = ({ 
    sections, // Receives main sections (already sorted by main ID)
    activeSubsectionId, 
    commentsBySubsection, 
    localChanges,
    onContentChange,
    onSaveSubsection,
    onAddComment,
    onDeleteComment,
    userId,
    expandedSections, 
    setExpandedSections,
    mainContentRef 
}: {
    sections: Section[];
    activeSubsectionId: string | null;
    commentsBySubsection: Record<string, Comment[]>;
    localChanges: Record<string, string | undefined>;
    onContentChange: (subsectionId: string, content: string) => void;
    onSaveSubsection: (subsectionId: string, content: string) => Promise<{ success: boolean }>;
    onAddComment: (subsectionId: string, text: string) => Promise<void>;
    onDeleteComment: (commentId: string, subsectionId: string) => Promise<void>;
    userId: string;
    expandedSections: Record<string, boolean>;
    setExpandedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    mainContentRef: React.RefObject<HTMLDivElement>;
}) => {
    const { toast } = useToast();
    const [isSavingMap, setIsSavingMap] = useState<Record<string, boolean>>({});

    const toggleExpand = (sectionId: string) => {
        setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    const handleSave = async (subsectionId: string) => {
        const newContent = localChanges[subsectionId];
        if (newContent === undefined) return;

        setIsSavingMap(prev => ({ ...prev, [subsectionId]: true }));
        const { success } = await onSaveSubsection(subsectionId, newContent);
        setIsSavingMap(prev => ({ ...prev, [subsectionId]: false }));

        const subsectionTitle = sections.flatMap(s => s.subsections).find(sub => sub.id === subsectionId)?.title;

        if (success) {
            toast({
                title: "Section saved",
                description: `Changes to "${subsectionTitle || subsectionId}" saved.`,
            });
        } else {
            toast({
                title: "Error saving section",
                description: "Could not save changes. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <ScrollArea className="flex-1 bg-muted/40" ref={mainContentRef}> 
            <TooltipProvider>
                <div className="px-6 py-8 max-w-none mx-auto space-y-6"> 
                    {sections.map((section) => { // Iterate over sorted main sections
                        const isExpanded = expandedSections[section.id] ?? false;
                        const isLocked = section.status === 'locked' || section.status === 'approved';

                        // *** SORT Subsections within MainContentArea ***
                        const orderedSubsectionIds = SUBSECTION_ORDER[section.id] || [];
                        const sortedSubsections = [...section.subsections].sort((a, b) => {
                          const indexA = orderedSubsectionIds.indexOf(a.id);
                          const indexB = orderedSubsectionIds.indexOf(b.id);
                          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                          if (indexA !== -1) return -1;
                          if (indexB !== -1) return 1;
                          return a.title.localeCompare(b.title);
                        });

                        return (
                            <div key={section.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                
                                <div 
                                    className="flex items-center p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors" 
                                    onClick={() => toggleExpand(section.id)}
                                    aria-expanded={isExpanded}
                                    aria-controls={`section-content-${section.id}`}
                                >
                                    <div className="mr-3">
                                        {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                                    </div>
                                    <h2 className="flex-1 text-base font-semibold tracking-tight text-foreground">{section.title}</h2>
                                    {isLocked && (
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <LockIcon className="h-5 w-5 text-destructive ml-3" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>This section is {section.status === 'approved' ? 'approved by the exchange' : 'locked'} and cannot be edited.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>

                                {isExpanded && (
                                    <div id={`section-content-${section.id}`} className="divide-y divide-border">
                                        {/* Map over SORTED subsections */} 
                                        {sortedSubsections.map((subsection) => {
                                            const hasUnsaved = localChanges[subsection.id] !== undefined;
                                            const isSaving = isSavingMap[subsection.id];
                                            const currentComments = commentsBySubsection[subsection.id] || [];

                                            return (
                                                <div key={subsection.id} id={subsection.id} className="p-6 space-y-4 relative"> 
                                                    {hasUnsaved && !isLocked && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 z-10 rounded-l-lg"></div>
                                                    )}

                                                    <div className="flex items-center justify-between mb-2"> 
                                                        <h3 className="text-sm font-semibold text-foreground/80">{subsection.title}</h3>
                                                        {!isLocked && (
                                                            <Button
                                                                onClick={() => handleSave(subsection.id)}
                                                                className="gap-1 px-2 h-6 text-xs font-medium"
                                                                disabled={!hasUnsaved || isSaving}
                                                                variant={hasUnsaved ? "secondary" : "ghost"}
                                                            >
                                                                {isSaving ? (
                                                                    <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></span>
                                                                ) : (
                                                                    hasUnsaved ? <Save className="h-3 w-3" /> : <CheckCircle className="h-3 w-3 text-green-600" /> 
                                                                )}
                                                                <span className="ml-1">{isSaving ? 'Saving...' : (hasUnsaved ? 'Save' : 'Saved')}</span> 
                                                            </Button>
                                                         )}
                                                    </div>

                                                    <AutosizeTextarea
                                                        value={localChanges[subsection.id] ?? subsection.content ?? ''} 
                                                        onChange={(e) => onContentChange(subsection.id, e.target.value)}
                                                        className={cn(
                                                            "w-full rounded-md border border-transparent focus-visible:border-input focus-visible:ring-1 focus-visible:ring-ring bg-transparent p-0 text-sm", 
                                                            "font-normal text-foreground/90 leading-relaxed resize-none",
                                                            isLocked ? "cursor-not-allowed opacity-70 bg-muted/50 rounded-md p-2" : "",
                                                            hasUnsaved && !isLocked ? "focus-visible:ring-yellow-500" : ""
                                                        )}
                                                        disabled={isLocked}
                                                        placeholder={isLocked ? "Section locked" : "Enter content here..."}
                                                        aria-label={`Content for ${subsection.title}`}
                                                    />

                                                    <div className="pt-4 mt-4 border-t border-dashed border-border"> 
                                                        <h4 className="text-sm font-semibold text-foreground/80 mb-3">Comments ({currentComments.length})</h4>
                                                        <CommentSection
                                                            userId={userId}
                                                            comments={currentComments}
                                                            onAddComment={(text) => onAddComment(subsection.id, text)} 
                                                            onDeleteComment={(commentId) => onDeleteComment(commentId, subsection.id)}
                                                         />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </TooltipProvider>
        </ScrollArea>
    );
}

// Main Component
export default function SponsorEditDocumentClient({
  initialSections,
  groupedComments: initialGroupedComments,
  documentId,
  userId,
  userName
}: SponsorEditDocumentClientProps) {
  // *** Create a MEMOIZED SORTED version of the INITIAL sections ***
  const sortedInitialSections = useMemo(() => {
      return [...initialSections].sort((a, b) => {
          const indexA = SECTION_ORDER.indexOf(a.id);
          const indexB = SECTION_ORDER.indexOf(b.id);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return 0;
      });
  }, [initialSections]); // Only re-sort if the initialSections prop itself changes

  // State for section data, initialized with the SORTED initial sections
  const [sections, setSections] = useState<Section[]>(sortedInitialSections); 
  
  // Update sections state if the sorted initial sections change (e.g., initial prop update)
  useEffect(() => {
    setSections(sortedInitialSections);
  }, [sortedInitialSections]);

  const [activeSubsectionId, setActiveSubsectionId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Initialize based on the SORTED initial sections
    const initial: Record<string, boolean> = {};
    let firstSubsectionId: string | null = null;
    sortedInitialSections.forEach(sec => { // Use sortedInitialSections here
        if (sec.subsections.length > 0 && !firstSubsectionId) {
           firstSubsectionId = sec.subsections[0].id; 
        }
        if (sec.subsections.some(sub => sub.content?.trim())) {
            initial[sec.id] = true;
        }
    });
    if (Object.keys(initial).length === 0 && sortedInitialSections.length > 0) { // Use sortedInitialSections here
         initial[sortedInitialSections[0].id] = true;
    }
    return initial;
  });
  const [localChanges, setLocalChanges] = useState<Record<string, string | undefined>>({});
  const [commentsBySubsection, setCommentsBySubsection] = useState(initialGroupedComments);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabaseClient();
  const { toast } = useToast();
  const router = useRouter();
  const [isFullDocumentModalOpen, setIsFullDocumentModalOpen] = useState(false);
  const [fullDocumentHtmlContent, setFullDocumentHtmlContent] = useState('');

  const hasUnsavedChanges = useMemo(() => 
      Object.values(localChanges).some(change => change !== undefined), 
  [localChanges]);

  // Remove the previous useMemo for sortedSections, we now use the sections state directly
  // const sortedSections = useMemo(() => { ... }, [sections]); 

  // --- Handlers --- 
  // Handlers (handleSubsectionSelect, handleContentChange, etc.) 
  // should operate on the `sections` state. The state itself 
  // maintains the sorted order established during initialization.
  
  const handleSubsectionSelect = useCallback((subsectionId: string) => {
    setActiveSubsectionId(subsectionId);
    // Find target section in the SORTED initial sections for reliable structure
    const targetSection = sortedInitialSections.find(s => s.subsections.some(sub => sub.id === subsectionId));
    if(targetSection && !expandedSections[targetSection.id]) {
        setExpandedSections(prev => ({...prev, [targetSection.id]: true }));
    }
    
    setTimeout(() => {
        const element = document.getElementById(subsectionId);
        if (element && mainContentRef.current) {
            const elementRect = element.getBoundingClientRect();
            const scrollAreaRect = mainContentRef.current.getBoundingClientRect();
            const headerHeight = 64;
            const desiredScrollTop = mainContentRef.current.scrollTop + elementRect.top - scrollAreaRect.top - headerHeight - 20; 
            
            mainContentRef.current.scrollTo({ top: desiredScrollTop, behavior: 'smooth' });
        } else {
            console.warn(`Element with ID ${subsectionId} not found for scrolling.`);
        }
    }, 150);
  // Depend on sortedInitialSections for finding the target section
  }, [sortedInitialSections, expandedSections]);

  const handleContentChange = useCallback((subsectionId: string, content: string) => {
     let originalContent = '';
     // Find original content from the SORTED initial sections
     outerLoop:
     for (const section of sortedInitialSections) {
       for (const subsection of section.subsections) {
         if (subsection.id === subsectionId) {
           originalContent = subsection.content ?? '';
           break outerLoop;
         }
       }
     }
    setLocalChanges(prev => ({
      ...prev,
      [subsectionId]: content !== originalContent ? content : undefined,
    }));
  // Depend on sortedInitialSections for comparison
  }, [sortedInitialSections]); 

  // Other handlers (handleSaveSubsection, handleSaveAll, handleAddComment, handleSubmitForReview) 
  // operate on the `sections` state which IS initialized sorted.
  // The map operations within them preserve order.

  // Set initial active subsection ID *after* initial render
  useEffect(() => {
      if (!activeSubsectionId) {
          // Base initial active ID on the SORTED initial sections
          const firstSectionWithSubsections = sortedInitialSections.find(s => s.subsections.length > 0);
          if (firstSectionWithSubsections) {
              setActiveSubsectionId(firstSectionWithSubsections.subsections[0].id);
          }
      }
  // Depend on sortedInitialSections
  }, [sortedInitialSections, activeSubsectionId]);

  const handleSaveSubsection = async (subsectionId: string, content: string): Promise<{ success: boolean }> => {
    const columnName = subsectionId;
    try {
      const { error } = await supabase
        .from('listingdocumentdirectlisting')
        .update({ [columnName]: content })
        .eq('instrumentid', documentId);
      if (error) throw error;

      setSections((prevSections: Section[]) => 
          prevSections.map((section: Section) => ({
              ...section,
              subsections: section.subsections.map((subsection: Subsection) => 
                  subsection.id === subsectionId
                      ? { ...subsection, content: content }
                      : subsection
              )
          }))
      );
      
      setLocalChanges(prev => {
          const updated = { ...prev };
          delete updated[subsectionId];
          return updated;
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving subsection:', error);
      return { success: false };
    }
  };

  const handleSaveAll = async () => {
    const updates: Record<string, string> = {};
    let changesMade = false;

    Object.entries(localChanges).forEach(([subsectionId, content]) => {
      if (content !== undefined) {
        updates[subsectionId] = content;
        changesMade = true;
      }
    });

    if (!changesMade) {
      toast({ description: "No unsaved changes.", duration: 2000 });
      return;
    }

    try {
      const { error } = await supabase
        .from('listingdocumentdirectlisting')
        .update(updates)
        .eq('instrumentid', documentId);
      if (error) throw error;

      const updatedSections = sections.map((section: Section) => ({
        ...section,
        subsections: section.subsections.map((subsection: Subsection) => 
          updates[subsection.id] !== undefined
            ? { ...subsection, content: updates[subsection.id] }
            : subsection
        )
      }));
      setSections(updatedSections);
      
      setLocalChanges({});
      toast({
        title: "All changes saved",
        description: "Your modifications have been successfully saved.",
      });
    } catch (error) {
      console.error('Error saving all changes:', error);
      toast({
        title: "Error Saving Changes",
        description: "Could not save all changes. Please check individual sections or try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async (subsectionId: string, text: string) => {
      if (!userId || !userName) {
          toast({ title: "Error", description: "User information not available.", variant: "destructive" });
          return;
      }
      if (!text.trim()) {
          toast({ description: "Comment cannot be empty.", variant: "default", duration: 2000 });
          return;
      }

      const newCommentData = {
          document_id: documentId,
          section_id: subsectionId,
          user_id: userId,
          user_name: userName,
          content: text.trim(),
          status: 'open' as Comment['status'],
      };

      const tempId = `temp-${Date.now()}`;

      // --- Corrected Optimistic Comment Structure (Round 3) ---
      const optimisticComment: Comment = {
        id: tempId,
        user_id: userId,
        user_name: userName,
        text: newCommentData.content,
        timestamp: new Date().toISOString(),
        status: newCommentData.status,
      };
      // --- End Correction ---

      // Optimistic UI update
      setCommentsBySubsection(prev => ({
          ...prev,
          [subsectionId]: [...(prev[subsectionId] || []), optimisticComment]
      }));

      try {
          // *** Ensure the object sent to DB uses the correct field name if necessary ***
          // Assuming DB expects 'content', but our type uses 'text'. Modify the insert object:
          const dataToInsert = {
            document_id: documentId,
            section_id: subsectionId,
            user_id: userId,
            user_name: userName,
            content: text.trim(),
            status: 'open' as Comment['status'],
          };

          const { data, error } = await supabase
              .from('document_comments')
              .insert(dataToInsert)
              .select()
              .single();

          if (error) {
              console.error("Supabase insert error object:", error);
              console.error("Stringified Supabase insert error:", JSON.stringify(error, null, 2));
              throw error;
          }

          // Update the comment in state mapping DB fields (content, created_at) to Type fields (text, timestamp)
          setCommentsBySubsection(prev => {
              const updatedComments = (prev[subsectionId] || []).map(comment =>
                  comment.id === tempId ? {
                      // Map fields from DB response (data) to the Comment type structure
                      id: data.id,
                      user_id: data.user_id,
                      user_name: data.user_name,
                      text: data.content,
                      timestamp: data.created_at,
                      status: data.status as Comment['status']
                   } : comment
              );
              return { ...prev, [subsectionId]: updatedComments };
          });

      } catch (error) {
          console.error("Error posting comment (in catch block):", error);
          console.error("Detailed add comment error (in catch block):", JSON.stringify(error, null, 2));
          toast({ title: "Error Posting Comment", description: "Could not save comment. Please try again.", variant: "destructive" });

          // Revert optimistic update
          setCommentsBySubsection(prev => {
              const revertedComments = (prev[subsectionId] || []).filter(comment => comment.id !== tempId);
              return { ...prev, [subsectionId]: revertedComments };
          });
      }
  };

  const handleSubmitForReview = async () => {
      if (hasUnsavedChanges) {
          toast({
              title: "Unsaved Changes",
              description: "Please save all changes before submitting for review.",
              variant: "destructive",
          });
          return;
      }

      try {
          const { error } = await supabase
              .from('listing')
              .update({ instrumentsecuritiesadmissionstatus: 'pending' })
              .eq('instrumentid', documentId);

          if (error) throw error;

          toast({
              title: "Submitted for Review",
              description: "The document has been sent to the exchange for review.",
          });
          router.push('/dashboard/listings');
      } catch (error) {
          console.error("Error submitting for review:", error);
          toast({
              title: "Submission Error",
              description: "Could not submit the document for review. Please try again.",
              variant: "destructive",
          });
      }
  };

  // *** NEW: Handler for Deleting Comments ***
  const handleDeleteComment = async (commentId: string, subsectionId: string) => {
      // Find the comment to be deleted for potential revert
      const originalComments = commentsBySubsection[subsectionId] || [];
      const commentToDelete = originalComments.find(c => c.id === commentId);
      if (!commentToDelete) return; // Should not happen

      // Optimistic UI Update: Remove the comment immediately
      setCommentsBySubsection(prev => ({
          ...prev,
          [subsectionId]: originalComments.filter(comment => comment.id !== commentId)
      }));

      try {
          // Attempt to delete from database
          const { error } = await supabase
              .from('document_comments')
              .delete()
              .eq('id', commentId);
              // Note: RLS policy should enforce that only the owner can delete

          if (error) {
              // Throw error to trigger catch block for revert
              throw error;
          }

          toast({
              title: "Comment Deleted",
              // description: "Your comment has been removed.", // Optional description
          });

      } catch (error) {
          console.error("Error deleting comment:", error);
          // Log the detailed error object
          console.error("Detailed delete error object:", JSON.stringify(error, null, 2));
          toast({
              title: "Error Deleting Comment",
              description: "Could not remove comment. Please try again.",
              variant: "destructive",
          });

          // Revert optimistic update on error
          setCommentsBySubsection(prev => ({
              ...prev,
              // Add the comment back in its original position (or end)
              // Ensure commentToDelete is valid before adding back
              [subsectionId]: commentToDelete ? [...(prev[subsectionId] || []), commentToDelete] : (prev[subsectionId] || [])
              // Consider more sophisticated revert logic if order matters significantly
          }));
      }
  };

  // Handle View Full Document
  const handleViewFullDocument = useCallback(() => {
    console.log("[ViewFullDoc] Generating preview...");
    if (!sections || sections.length === 0) {
      toast({ title: "Error", description: "Document data not loaded.", variant: "destructive" });
      return;
    }

    let htmlContent = `
      <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Document Preview: ${documentId}</title><style>body { font-family: system-ui, sans-serif; line-height: 1.6; padding: 2rem; max-width: 900px; margin: auto; color: #333; } h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; color: #111; } h1 { border-bottom: 2px solid #eee; padding-bottom: 0.3em; font-size: 2em; } h2 { border-bottom: 1px solid #eee; padding-bottom: 0.3em; font-size: 1.5em; } h3 { font-size: 1.2em; color: #444; } pre { background-color: #f8f8f8; padding: 1em; border: 1px solid #ddd; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 0.95em; } .section-header { margin-top: 2.5em; } .subsection { margin-left: 1em; }</style></head><body><h1>Document Preview: ${documentId}</h1>`;

    try {
      sections.forEach(section => {
        htmlContent += `<h2 class="section-header">${section.title} (Status: ${section.status})</h2>\n`;
        section.subsections.forEach(subsection => {
          const content = localChanges[subsection.id] ?? subsection.content ?? '';
          const escapedContent = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") || "[No content]";
          htmlContent += `<div class="subsection"><h3>${subsection.title}</h3><pre>${escapedContent}</pre></div>`; 
        });
      });
      htmlContent += `</body></html>`;
      
      console.log("[ViewFullDoc] HTML Generated. Setting state to open modal.");

      setFullDocumentHtmlContent(htmlContent);
      setIsFullDocumentModalOpen(true);

    } catch (error) {
      console.error("[ViewFullDoc] Error during HTML generation:", error);
      toast({ title: "Preview Error", description: "An error occurred generating the preview.", variant: "destructive" });
    }
  }, [sections, documentId, localChanges, toast]);

  return (
    <div className="flex h-screen bg-muted/40"> 
      <TableOfContents
        sections={sortedInitialSections} 
        activeSubsectionId={activeSubsectionId}
        onSubsectionSelect={handleSubsectionSelect}
        isCollapsed={isSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          userName={userName}
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onViewFullDocument={handleViewFullDocument}
          onSaveAll={handleSaveAll}
          hasUnsavedChanges={hasUnsavedChanges}
          onSubmitForReview={handleSubmitForReview}
        />
        <MainContentArea 
          sections={sections}
          activeSubsectionId={activeSubsectionId}
          commentsBySubsection={commentsBySubsection}
          localChanges={localChanges}
          onContentChange={handleContentChange}
          onSaveSubsection={handleSaveSubsection}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          userId={userId}
          expandedSections={expandedSections}
          setExpandedSections={setExpandedSections}
          mainContentRef={mainContentRef}
        />
      </div>
      
      {/* Full Document Modal */}
      <Dialog open={isFullDocumentModalOpen} onOpenChange={setIsFullDocumentModalOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Document Preview: {documentId}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-4 mb-4 border rounded-md p-4 bg-gray-50"> 
            <div
              dangerouslySetInnerHTML={{ __html: fullDocumentHtmlContent }}
              className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none"
            />
          </ScrollArea>
          <DialogFooter className="mt-auto pt-4 border-t">
             <Button 
               variant="outline" 
               onClick={() => window.print()}
             >
                Print / Save as PDF
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 