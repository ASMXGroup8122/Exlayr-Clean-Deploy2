'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Share2, Download, Save, CheckCircle, Sparkles, Search, FileText, Edit3, Users, Clock, ChevronLeft, ChevronRight, X, Menu, GripVertical, Copy, Check, Eye, MessageSquare, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Section, Subsection, Comment } from '@/types/documents';
import CanvasField from './CanvasField';
import CanvasPromptBar from './CanvasPromptBar';
import { ResearchPanel } from './ResearchPanel';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CanvasEditorProps {
  initialSections: Section[];
  groupedComments: Record<string, Comment[]>;
  documentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  documentData: Record<string, any>;
  listingName: string;
}

// Define the desired subsection order for proper document structure
const SUBSECTION_ORDER: Record<string, string[]> = {
  sec1: [
    'sec1_documentname',
    'sec1_warning',
    'sec1_listingparticulars',
    'sec1_generalinfo',
    'sec1_corporateadvisors',
    'sec1_forwardlooking_statements',
    'sec1_boardofdirectors',
    'sec1_salientpoints',
    'sec1_purposeoflisting',
    'sec1_plansafterlisting',
    'sec1_issuer_name',
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
    'sec4_risks1',
    'sec4_risks2',
    'sec4_risks3',
    'sec4_risks4',
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

// ShareLink interface for the proper ShareModal
interface ShareLink {
  token: string;
  shareUrl: string;
  accessLevel: 'view' | 'comment';
  expiresAt: string | null;
}

// Professional ShareModal component with guest and commenter functionality
function ShareModal({ isOpen, onClose, listingId, listingName }: { 
  isOpen: boolean; 
  onClose: () => void; 
  listingId: string; 
  listingName: string; 
}) {
  const [accessLevel, setAccessLevel] = useState<'view' | 'comment'>('view');
  const [expiresInHours, setExpiresInHours] = useState<string>('48');
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
          accessLevel,
          expiresInHours: expiresInHours && expiresInHours !== 'never' ? parseInt(expiresInHours) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create share link');
      }

      setShareLink(data);
      toast({
        title: "Share link generated successfully!",
      });
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to generate share link',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink.shareUrl);
      setCopied(true);
      toast({
        title: "Link copied to clipboard!",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setShareLink(null);
    setCopied(false);
    onClose();
  };

  const formatExpiryDate = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never';
    return new Date(expiresAt).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-900">{listingName}</p>
            <p className="text-xs text-gray-500">Listing Document</p>
          </div>

          {!shareLink ? (
            <>
              {/* Access Level Selection */}
              <div className="space-y-2">
                <Label htmlFor="access-level">Access Level</Label>
                <Select value={accessLevel} onValueChange={(value: 'view' | 'comment') => setAccessLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <div>
                          <div className="font-medium">View Only</div>
                          <div className="text-xs text-gray-500">Recipients can only read the document</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="comment">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <div>
                          <div className="font-medium">View & Comment</div>
                          <div className="text-xs text-gray-500">Recipients can read and add comments</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiration Selection */}
              <div className="space-y-2">
                <Label htmlFor="expires">Expires In</Label>
                <Select value={expiresInHours} onValueChange={setExpiresInHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 Hours</SelectItem>
                    <SelectItem value="48">48 Hours</SelectItem>
                    <SelectItem value="168">1 Week</SelectItem>
                    <SelectItem value="720">30 Days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <div className="flex gap-2">
                <Button onClick={handleClose} className="flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerateLink} 
                  disabled={isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Link'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Generated Link Display */}
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Share link generated!</span>
                  </div>
                  
                  <div className="bg-white border rounded p-3 mb-3">
                    <code className="text-xs break-all text-gray-700">{shareLink.shareUrl}</code>
                  </div>
                  
                  <Button 
                    onClick={handleCopyLink}
                    className="w-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs mt-3">
                    <div>
                      <span className="text-gray-600">Access Level:</span>
                      <div className="font-medium capitalize">{shareLink.accessLevel}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Expires:</span>
                      <div className="font-medium">{formatExpiryDate(shareLink.expiresAt)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setShareLink(null)} className="flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                    Generate Another
                  </Button>
                  <Button onClick={handleClose} className="flex-1">
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Canvas Mode Editor - Provides a full-document scrollable editing experience
 * with real-time auto-save and AI integration capabilities.
 */
export default function CanvasEditor({
  initialSections,
  groupedComments,
  documentId,
  organizationId,
  userId,
  userName,
  documentData,
  listingName
}: CanvasEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  // Collapsible sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // AI Assistant state with resizable functionality
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiAssistantWidth, setAiAssistantWidth] = useState(400); // Default width
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  // Research panel state  
  const [researchPanelOpen, setResearchPanelOpen] = useState(false);

  // Local state for document editing
  const [localChanges, setLocalChanges] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // AI Prompt Bar state
  const [isPromptBarVisible, setIsPromptBarVisible] = useState(false);
  const [promptBarWidth, setPromptBarWidth] = useState(400);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldTitle, setActiveFieldTitle] = useState<string | null>(null);
  const [activeFieldContent, setActiveFieldContent] = useState('');
  const [researchPanelSuggestion, setResearchPanelSuggestion] = useState<{
    category?: string;
    label?: string;
  }>({});

  // Mobile detection hook
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-open sidebar on desktop, close on mobile
      if (!mobile && !sidebarOpen) {
        setSidebarOpen(true);
      } else if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [sidebarOpen]);

  // Sort sections and subsections in proper order
  const sortedSections = useMemo(() => {
    return initialSections.map(section => {
      // Get the ordering for this section
      const orderedSubsectionIds = (SUBSECTION_ORDER as any)[section.id] || [];
      
      // Sort subsections according to the defined order
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

      return {
        ...section,
        subsections: sortedSubsections
      };
    }).sort((a, b) => {
      // Sort sections by number (sec1, sec2, etc.)
      const numA = parseInt(a.id.replace('sec', ''), 10);
      const numB = parseInt(b.id.replace('sec', ''), 10);
      return numA - numB;
    });
  }, [initialSections]);

  // Calculate if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => 
    Object.values(localChanges).some(change => change !== undefined), 
    [localChanges]
  );

  // Handle field content changes
  const handleFieldChange = useCallback((fieldId: string, content: string) => {
    // Find original content to compare
    let originalContent = '';
    for (const section of initialSections) {
      for (const subsection of section.subsections) {
        if (subsection.id === fieldId) {
          originalContent = subsection.content ?? '';
          break;
        }
      }
    }

    setLocalChanges(prev => {
      const updated = { ...prev };
      if (content !== originalContent) {
        updated[fieldId] = content;
      } else {
        delete updated[fieldId];
      }
      return updated;
    });
  }, [initialSections]);

  // Handle field focus for AI context
  const handleFieldFocus = useCallback((fieldId: string, fieldTitle: string, content: string) => {
    setActiveFieldId(fieldId);
    setActiveFieldTitle(fieldTitle);
    setActiveFieldContent(content);
  }, []);

  // Handle individual field save
  const handleFieldSave = useCallback(async (fieldId: string, content: string): Promise<{ success: boolean }> => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('listingdocumentdirectlisting')
        .update({ 
          [fieldId]: content,
          updated_at: new Date().toISOString()
        })
        .eq('instrumentid', documentId);

      if (error) throw error;

      // Clear local changes for this field
      setLocalChanges(prev => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });

      toast({
        title: "Field Saved",
        description: "Your changes have been saved successfully.",
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving field:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  }, [supabase, documentId, toast]);

  // Handle saving all changes
  const handleSaveAll = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      const updates = Object.entries(localChanges).reduce((acc, [fieldId, content]) => {
        if (content !== undefined) {
          acc[fieldId] = content;
        }
        return acc;
      }, {} as Record<string, string>);

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('listingdocumentdirectlisting')
          .update(updates)
          .eq('instrumentid', documentId);

        if (error) throw error;

        // Clear all local changes
        setLocalChanges({});

        toast({
          title: "All Changes Saved",
          description: `Successfully saved ${Object.keys(updates).length - 1} field(s).`,
        });
      }
    } catch (error) {
      console.error('Error saving all changes:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save some changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, localChanges, supabase, documentId, toast]);

  // Handle navigation back to box mode
  const handleBackToBoxMode = useCallback(() => {
    const currentPath = window.location.pathname;
    const boxModePath = currentPath.replace('/canvas', '/blueprint');
    router.push(boxModePath);
  }, [router]);

  // Handle prompt bar toggle
  const handlePromptBarToggle = useCallback(() => {
    setIsPromptBarVisible(!isPromptBarVisible);
  }, [isPromptBarVisible]);

  // Handle prompt bar width changes
  const handlePromptBarWidthChange = useCallback((width: number) => {
    setPromptBarWidth(width);
  }, []);

  // Handle research panel toggle
  const handleResearchPanelToggle = useCallback(() => {
    setResearchPanelOpen(!researchPanelOpen);
  }, [researchPanelOpen]);

  // Handle triggering research panel with suggestions
  const handleTriggerResearchPanel = useCallback((suggestedCategory?: string, suggestedLabel?: string) => {
    setResearchPanelSuggestion({
      category: suggestedCategory,
      label: suggestedLabel
    });
    setResearchPanelOpen(true);
  }, []);

  // Handle content insertion from research panel
  const handleInsertFromResearch = useCallback((content: string) => {
    if (activeFieldId) {
      // Update the active field with the research content
      setActiveFieldContent(prev => prev + '\n\n' + content);
      handleFieldChange(activeFieldId, activeFieldContent + '\n\n' + content);
    }
  }, [activeFieldId, activeFieldContent, handleFieldChange]);

  // Handle AI content insertion
  const handleInsertContent = useCallback(async (fieldId: string, content: string, mode: 'insert' | 'replace') => {
    const supabase = getSupabaseClient();
    
    try {
      let newContent = content;
      
      if (mode === 'insert') {
        const currentContent = documentData[fieldId] || '';
        newContent = currentContent + (currentContent ? '\n\n' : '') + content;
      }

      const { error } = await supabase
        .from('listingdocumentdirectlisting')
        .update({ 
          [fieldId]: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('instrumentid', documentId);

      if (error) throw error;

      // Update local state
      documentData[fieldId] = newContent;
      
      toast({
        title: "Content Updated",
        description: `Content ${mode === 'insert' ? 'inserted into' : 'replaced in'} ${activeFieldTitle}.`,
      });
    } catch (error) {
      console.error('Error updating content:', error);
      toast({
        title: "Error",
        description: "Failed to update content. Please try again.",
        variant: "destructive",
      });
    }
  }, [documentId, documentData, activeFieldTitle, toast]);

  // Resize functionality for AI Assistant
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      // Constrain width between 300px and 800px
      const minWidth = 300;
      const maxWidth = 800;
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      
      setAiAssistantWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const flattenedFields = useMemo(() => {
    const fields: Array<{
      id: string;
      title: string;
      content: string;
      sectionTitle: string;
      sectionNumber: number;
      isLocked: boolean;
      comments: Comment[];
    }> = [];

    sortedSections.forEach((section, sectionIndex) => {
      section.subsections?.forEach(subsection => {
        const fieldId = subsection.id;
        if (fieldId) {
          const currentContent = localChanges[fieldId] !== undefined 
            ? localChanges[fieldId] || ''
            : (documentData[fieldId] || '');
          
          fields.push({
            id: fieldId,
            title: subsection.title,
            content: currentContent,
            sectionTitle: section.title,
            sectionNumber: sectionIndex + 1,
            isLocked: false,
            comments: groupedComments[fieldId] || []
          });
        }
      });
    });

    return fields;
  }, [sortedSections, documentData, localChanges, groupedComments]);

  // Calculate dynamic styles for content area
  const dynamicStyles = useMemo(() => {
    if (isMobile) {
      return { width: '100%', marginRight: '0px' };
    }
    
    const sidebarWidth = sidebarOpen ? 320 : 64;
    const aiWidth = aiAssistantOpen ? aiAssistantWidth : 0;
    const totalMargin = sidebarWidth + aiWidth;
    
    return {
      width: `calc(100% - ${totalMargin}px)`,
      marginRight: `${aiWidth}px`,
      transition: 'all 0.3s ease-in-out'
    };
  }, [isMobile, sidebarOpen, aiAssistantOpen, aiAssistantWidth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-2 sm:p-4 md:p-6 overflow-x-hidden">
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
              <Button 
                onClick={handleBackToBoxMode}
                className="flex items-center gap-2 bg-white/70 border border-gray-200/50 text-gray-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300 px-3 py-2 rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Blueprint Mode</span>
                <span className="sm:hidden">Blueprint</span>
              </Button>
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
              <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                <Edit3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight">
                  Canvas Mode
                </h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm">
                  Full document editing experience
                </p>
              </div>
            </div>
            
            {/* Mobile Toggle Button */}
            <div className="md:hidden">
              <Button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 rounded-lg"
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 flex-1 min-h-0 relative">
        {/* Main Content Area */}
        <div 
          className="flex-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col min-h-[400px] md:min-h-[500px]"
          style={dynamicStyles}
        >
          <ScrollArea className="flex-1 scrollbar-hide">
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
              {/* Document Header */}
              <div className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 rounded-xl p-4 sm:p-6 border border-gray-200/50">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg flex-shrink-0">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight mb-2">
                      {listingName || 'Listing Document'}
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Collaborative document editing with AI assistance
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                    <FileText className="w-3 h-3" />
                    <span className="truncate">ID: {documentId.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium">
                    <Users className="w-3 h-3" />
                    <span className="truncate">{userName}</span>
                  </div>
                  <div className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm font-medium">
                    <Edit3 className="w-3 h-3" />
                    <span>{initialSections.length} sections</span>
                  </div>
                  <div className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs sm:text-sm font-medium">
                    <Clock className="w-3 h-3" />
                    <span>Last updated today</span>
                  </div>
                </div>
              </div>

              {/* Document Fields */}
              <div className="space-y-6 sm:space-y-8">
                {flattenedFields.map((field, index) => (
                  <div key={field.id} className="relative">
                    {/* Field Card */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden hover:shadow-xl transition-all duration-300">
                      {/* Field Header */}
                      <div className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 p-4 sm:p-6 border-b border-gray-200/50">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg font-bold text-white text-sm sm:text-base">
                            {field.sectionNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 truncate">
                              {field.title}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <span className="text-sm text-gray-600">
                                Section {field.sectionNumber}: {field.sectionTitle}
                              </span>
                              {field.comments.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  • {field.comments.length} comment{field.comments.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Field Content */}
                      <div className="p-4 sm:p-6">
                        <CanvasField
                          fieldId={field.id}
                          title={field.title}
                          content={field.content}
                          isLocked={field.isLocked}
                          comments={field.comments}
                          onChange={handleFieldChange}
                          onSave={handleFieldSave}
                          onFocus={(fieldId, fieldTitle, content) => handleFieldFocus(fieldId, fieldTitle, content)}
                          userId={userId}
                          isActive={activeFieldId === field.id}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Collapsible Sidebar */}
        <div className={cn(
          "bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col transition-all duration-300",
          // Mobile: Full screen overlay
          isMobile ? cn(
            "fixed inset-0 z-50 m-4",
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          ) : cn(
            // Desktop: Sidebar
            "min-h-[500px]",
            sidebarOpen ? "w-80" : "w-16"
          )
        )}>
          {/* Sidebar Header */}
          <div className="flex-shrink-0 p-3 border-b border-gray-200/50 flex items-center justify-between bg-white/50">
            {sidebarOpen && (
              <h2 className="font-semibold text-gray-900 text-sm truncate mr-2 min-w-0">Document Actions</h2>
            )}
            <Button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg touch-manipulation flex-shrink-0",
                !sidebarOpen && "ml-auto"
              )}
            >
              {isMobile ? (
                <X className="h-4 w-4" />
              ) : sidebarOpen ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
            {sidebarOpen ? (
              <>
                {/* Share Document */}
                <div className="border border-white/50 rounded-xl p-3 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <Share2 className="h-4 w-4 text-gray-900" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm truncate text-gray-900">Share Document</h4>
                        <p className="text-xs truncate mt-0.5 text-gray-500">Collaborate with team</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        onClick={() => setShareModalOpen(true)}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      >
                        <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Save Changes */}
                <div className={cn(
                  "border rounded-xl p-3 transition-all duration-300 backdrop-blur-sm hover:shadow-lg",
                  hasUnsavedChanges 
                    ? "border-green-200/50 bg-green-50/80 hover:bg-green-100/80" 
                    : "border-white/50 bg-white/80 hover:bg-white/90"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <Save className="h-4 w-4 text-gray-900" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm truncate text-gray-900">Save Changes</h4>
                        <p className="text-xs truncate mt-0.5 text-gray-500">
                          {hasUnsavedChanges ? 'Unsaved changes' : 'All saved'}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        onClick={handleSaveAll}
                        disabled={!hasUnsavedChanges || isSaving}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border border-current border-t-transparent rounded-full" />
                        ) : (
                          <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Research Panel */}
                <div className="border border-white/50 rounded-xl p-3 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <Search className="h-4 w-4 text-gray-900" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm truncate text-gray-900">Research Panel</h4>
                        <p className="text-xs truncate mt-0.5 text-gray-500">Find relevant data</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        onClick={handleResearchPanelToggle}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                      >
                        <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* AI Assistant - Enhanced Button */}
                <div className="border border-white/50 rounded-xl p-3 transition-all duration-300 bg-gradient-to-br from-orange-50/80 to-pink-50/80 backdrop-blur-sm hover:shadow-lg group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="relative">
                        <div className="p-2 bg-gradient-to-r from-orange-500 to-pink-600 rounded-lg shadow-lg">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                          AI Assistant ✨
                        </h4>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {aiAssistantOpen ? 'Active & Ready' : 'Click to activate'}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        onClick={() => {
                          setAiAssistantOpen(!aiAssistantOpen);
                          setIsPromptBarVisible(!aiAssistantOpen);
                        }}
                        className="p-2 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-600 hover:via-pink-600 hover:to-purple-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        <Sparkles className="h-4 w-4 relative z-10" />
                      </Button>
                    </div>
                  </div>
                  
                  {aiAssistantOpen && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-orange-100/50 to-pink-100/50 rounded-lg border border-orange-200/30">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-gray-700">AI Assistant Active</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Resizable panel is open on the right! Click on any document section to get AI suggestions.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Collapsed state - icon only
              <>
                <button className="p-2 hover:bg-white/50 rounded-lg transition-all duration-300 w-full">
                  <Share2 className="h-4 w-4 text-gray-900 mx-auto" />
                </button>
                <button className="p-2 hover:bg-white/50 rounded-lg transition-all duration-300 w-full">
                  <Save className="h-4 w-4 text-gray-900 mx-auto" />
                </button>
                <button className="p-2 hover:bg-white/50 rounded-lg transition-all duration-300 w-full">
                  <Search className="h-4 w-4 text-gray-900 mx-auto" />
                </button>
                <button
                  onClick={() => {
                    setAiAssistantOpen(!aiAssistantOpen);
                    setIsPromptBarVisible(!aiAssistantOpen);
                  }}
                  className="p-2 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-600 hover:via-pink-600 hover:to-purple-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 relative overflow-hidden group w-full"
                >
                  <Sparkles className="h-4 w-4 mx-auto" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Overlay Background */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Resizable AI Assistant Panel */}
      {aiAssistantOpen && !isMobile && (
        <div className="fixed top-0 right-0 h-full flex z-30">
          {/* Resize Handle */}
          <div
            className="w-2 bg-transparent hover:bg-blue-500/20 cursor-ew-resize transition-colors duration-200 flex items-center justify-center group"
            onMouseDown={startResize}
          >
            <div className="w-1 h-8 bg-gray-300 group-hover:bg-blue-500 rounded-full transition-colors duration-200 flex items-center justify-center">
              <GripVertical className="h-4 w-4 text-gray-400 group-hover:text-white" />
            </div>
          </div>

          {/* AI Assistant Content Panel */}
          <div 
            className="bg-white/95 backdrop-blur-sm border-l border-gray-200 flex flex-col overflow-hidden shadow-2xl"
            style={{ width: `${aiAssistantWidth}px` }}
          >
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-pink-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-pink-600 rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">AI Assistant</h3>
                    <p className="text-xs text-gray-600">Intelligent document editing</p>
                  </div>
                </div>
                <Button
                  onClick={() => setAiAssistantOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors border-0 bg-transparent"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Welcome to AI Assistant!</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    I can help you improve your document content, check for compliance issues, and suggest better phrasing.
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs text-blue-700">
                      • Click on any field to get AI suggestions
                    </div>
                    <div className="text-xs text-blue-700">
                      • Use the chat below for questions
                    </div>
                    <div className="text-xs text-blue-700">
                      • Drag the left edge to resize this panel
                    </div>
                  </div>
                </div>

                {activeFieldId && (
                  <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <h4 className="font-semibold text-orange-900 mb-2">Active Field</h4>
                    <p className="text-sm text-orange-800">
                      Currently focused: <strong>{activeFieldTitle}</strong>
                    </p>
                  </div>
                )}

                {/* AI Chat Interface placeholder */}
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600 text-center">
                    AI chat interface will appear here when you interact with document fields.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* AI Prompt Bar */}
      <CanvasPromptBar
        isVisible={isPromptBarVisible}
        onToggle={handlePromptBarToggle}
        activeFieldId={activeFieldId ?? undefined}
        activeFieldTitle={activeFieldTitle ?? ''}
        activeFieldContent={activeFieldContent}
        onInsertContent={handleInsertContent}
        documentId={documentId}
        organizationId={organizationId}
        onWidthChange={handlePromptBarWidthChange}
        onTriggerResearchPanel={handleTriggerResearchPanel}
      />

      {/* Share Modal */}
      {shareModalOpen && (
        <ShareModal 
          isOpen={shareModalOpen} 
          onClose={() => setShareModalOpen(false)}
          listingId={documentId}
          listingName={listingName}
        />
      )}

      {/* Research Panel */}
      <ResearchPanel 
        isOpen={researchPanelOpen} 
        onClose={() => setResearchPanelOpen(false)}
        listingId={documentId}
        organizationId={organizationId}
        activeFieldId={activeFieldTitle ?? ''}
        activeFieldTitle={activeFieldTitle ?? ''}
        onInsertContent={(content) => {
          console.log('Insert content:', content);
        }}
        suggestedCategory={researchPanelSuggestion.category}
        suggestedLabel={researchPanelSuggestion.label}
      />
    </div>
  );
} 