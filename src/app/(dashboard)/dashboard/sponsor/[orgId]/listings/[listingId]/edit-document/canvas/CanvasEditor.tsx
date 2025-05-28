'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Share2, Download, Save, CheckCircle, Sparkles, Search, FileText, Edit3, Users, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Section, Subsection, Comment } from '@/types/documents';
import CanvasField from './CanvasField';
import CanvasPromptBar from './CanvasPromptBar';
import { ShareModal } from './ShareModal';
import { ResearchPanel } from './ResearchPanel';

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

  // Track local changes for unsaved indicator
  const [localChanges, setLocalChanges] = useState<Record<string, string | undefined>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // AI Prompt Bar state
  const [isPromptBarVisible, setIsPromptBarVisible] = useState(false);
  const [promptBarWidth, setPromptBarWidth] = useState(480);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldTitle, setActiveFieldTitle] = useState<string>('');
  const [activeFieldContent, setActiveFieldContent] = useState<string>('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isResearchPanelOpen, setIsResearchPanelOpen] = useState(false);
  const [researchPanelSuggestion, setResearchPanelSuggestion] = useState<{
    category?: string;
    label?: string;
  }>({});

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

    setLocalChanges(prev => ({
      ...prev,
      [fieldId]: content !== originalContent ? content : undefined,
    }));
  }, [initialSections]);

  // Handle field focus for AI context
  const handleFieldFocus = useCallback((fieldId: string, fieldTitle: string, content: string) => {
    setActiveFieldId(fieldId);
    setActiveFieldTitle(fieldTitle);
    setActiveFieldContent(content);
  }, []);

  // Handle saving a specific field
  const handleFieldSave = useCallback(async (fieldId: string, content: string): Promise<{ success: boolean }> => {
    try {
      const { error } = await supabase
        .from('listingdocumentdirectlisting')
        .update({ [fieldId]: content })
        .eq('instrumentid', documentId);

      if (error) throw error;

      // Clear the local change for this field
      setLocalChanges(prev => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });

      return { success: true };
    } catch (error) {
      console.error('Error saving field:', error);
      return { success: false };
    }
  }, [supabase, documentId]);

  // Handle saving all changes
  const handleSaveAll = useCallback(async () => {
    const updates: Record<string, string> = {};
    let changesMade = false;

    Object.entries(localChanges).forEach(([fieldId, content]) => {
      if (content !== undefined) {
        updates[fieldId] = content;
        changesMade = true;
      }
    });

    if (!changesMade) {
      toast({ description: "No unsaved changes.", duration: 2000 });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('listingdocumentdirectlisting')
        .update(updates)
        .eq('instrumentid', documentId);

      if (error) throw error;

      setLocalChanges({});
      toast({
        title: "All changes saved",
        description: "Your modifications have been successfully saved.",
      });
    } catch (error) {
      console.error('Error saving all changes:', error);
      toast({
        title: "Error Saving Changes",
        description: "Could not save all changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [localChanges, supabase, documentId, toast]);

  // Handle navigation back to box mode
  const handleBackToBoxMode = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        "You have unsaved changes. Are you sure you want to leave Canvas Mode?"
      );
      if (!confirmLeave) return;
    }
    
    // Navigate back to the box-mode editor
    const boxModeUrl = window.location.pathname.replace('/canvas', '');
    router.push(boxModeUrl);
  }, [hasUnsavedChanges, router]);

  // Handle share functionality (placeholder for Phase 4)
  const handleShare = useCallback(() => {
    toast({
      title: "Share Feature",
      description: "Document sharing will be available in Phase 4.",
    });
  }, [toast]);

  // Handle export functionality (placeholder for Phase 6)
  const handleExport = useCallback(() => {
    toast({
      title: "Export Feature",
      description: "Document export will be available in Phase 6.",
    });
  }, [toast]);

  // Handle AI prompt bar toggle
  const handlePromptBarToggle = useCallback(() => {
    setIsPromptBarVisible(!isPromptBarVisible);
  }, [isPromptBarVisible]);

  // Handle prompt bar width changes
  const handlePromptBarWidthChange = useCallback((width: number) => {
    setPromptBarWidth(width);
  }, []);

  // Handle research panel toggle
  const handleResearchPanelToggle = useCallback(() => {
    setIsResearchPanelOpen(!isResearchPanelOpen);
  }, [isResearchPanelOpen]);

  // Handle triggering research panel from Smart Agent
  const handleTriggerResearchPanel = useCallback((suggestedCategory?: string, suggestedLabel?: string) => {
    console.log('🤖 Canvas Editor: Triggering Research Panel with suggestions:', { suggestedCategory, suggestedLabel });
    
    setResearchPanelSuggestion({
      category: suggestedCategory,
      label: suggestedLabel
    });
    setIsResearchPanelOpen(true);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 overflow-x-hidden">
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Premium Header */}
      <div className="relative mb-4 sm:mb-6">
        <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-xl">
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col gap-4 sm:gap-6">
              {/* Top Row - Navigation and Title */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBackToBoxMode}
                    className="flex items-center gap-2 hover:bg-blue-50 text-gray-600 hover:text-blue-700 px-3 py-2 rounded-xl transition-all duration-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Box Mode</span>
                    <span className="sm:hidden">Box</span>
                  </Button>
                  <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                      <Edit3 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                        Canvas Mode
                      </h1>
                      <p className="text-sm text-gray-600">Full document editing experience</p>
                    </div>
                  </div>
                </div>

                {/* Save Status Indicator */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/50 border border-white/50">
                  {hasUnsavedChanges ? (
                    <>
                      <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                      <span className="text-amber-700 font-medium text-sm">Unsaved changes</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-700 font-medium text-sm">All saved</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  onClick={() => setIsShareModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-white/50 border-gray-200/50 text-gray-700 hover:bg-white/70 hover:text-blue-700 rounded-xl transition-all duration-200 h-10"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>

                <Button
                  onClick={handleSaveAll}
                  disabled={!hasUnsavedChanges || isSaving}
                  size="sm"
                  className={`flex items-center gap-2 rounded-xl transition-all duration-200 h-10 ${
                    hasUnsavedChanges 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl' 
                      : 'bg-white/50 border border-gray-200/50 text-gray-500'
                  }`}
                >
                  {isSaving ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save All'}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleResearchPanelToggle}
                  variant="outline"
                  className="flex items-center gap-2 bg-white/50 border-gray-200/50 text-gray-700 hover:bg-white/70 hover:text-blue-700 rounded-xl transition-all duration-200 h-10"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Research</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handlePromptBarToggle}
                  className={`flex items-center gap-2 rounded-xl transition-all duration-200 h-10 ${
                    isPromptBarVisible 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl' 
                      : 'bg-white/50 border border-gray-200/50 text-gray-700 hover:bg-white/70 hover:text-blue-700'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Assistant</span>
                  <span className="sm:hidden">AI</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <ScrollArea className="h-[calc(100vh-140px)] scrollbar-hide">
          <div 
            className="transition-all duration-300 ease-in-out"
            style={{
              paddingRight: isMounted && isPromptBarVisible && typeof window !== 'undefined' && window.innerWidth >= 1024 
                ? `${promptBarWidth}px` 
                : '0px'
            }}
          >
            <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-h-full ${
              isPromptBarVisible ? 'lg:max-w-5xl' : 'max-w-4xl'
            }`}>
              {/* Document Header Card */}
              <div className="mb-8 sm:mb-12">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg flex-shrink-0">
                      <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight mb-2">
                        {listingName || 'Listing Document'}
                      </h1>
                      <p className="text-gray-600 text-sm sm:text-base">
                        Collaborative document editing with AI assistance
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center space-x-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                      <FileText className="w-3 h-3" />
                      <span className="truncate">ID: {documentId.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium">
                      <Users className="w-3 h-3" />
                      <span className="truncate">{userName}</span>
                    </div>
                    <div className="flex items-center space-x-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm font-medium">
                      <Edit3 className="w-3 h-3" />
                      <span>{initialSections.length} sections</span>
                    </div>
                    <div className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs sm:text-sm font-medium">
                      <Clock className="w-3 h-3" />
                      <span>Last updated today</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Sections */}
              <div className="space-y-8 sm:space-y-12">
                {initialSections.map((section, sectionIndex) => (
                  <div key={section.id} className="relative">
                    {/* Section Card */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg border border-white/50 overflow-hidden hover:shadow-xl transition-all duration-300">
                      {/* Section Header */}
                      <div className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 p-4 sm:p-6 border-b border-gray-200/50">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg font-bold text-white text-sm sm:text-base">
                            {sectionIndex + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 truncate">
                              {section.title}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                                section.status === 'approved' ? 'bg-green-100 text-green-800' :
                                section.status === 'locked' ? 'bg-red-100 text-red-800' :
                                section.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {section.status?.replace('_', ' ') || 'pending'}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-500">
                                {section.subsections.length} field{section.subsections.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section Fields */}
                      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                        {section.subsections?.map((subsection, fieldIndex) => (
                          <CanvasField
                            key={subsection.id}
                            fieldId={subsection.id}
                            title={subsection.title}
                            content={subsection.content ?? ''}
                            isLocked={section.status === 'approved' || section.status === 'locked'}
                            onChange={handleFieldChange}
                            onSave={handleFieldSave}
                            onFocus={(fieldId, fieldTitle, content) => handleFieldFocus(fieldId, fieldTitle, content)}
                            comments={groupedComments[subsection.id] || []}
                            userId={userId}
                            fieldIndex={fieldIndex + 1}
                            isActive={activeFieldId === subsection.id}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Spacer */}
              <div className="h-24"></div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* AI Prompt Bar */}
      <CanvasPromptBar
        isVisible={isPromptBarVisible}
        onToggle={handlePromptBarToggle}
        activeFieldId={activeFieldId ?? undefined}
        activeFieldTitle={activeFieldTitle}
        activeFieldContent={activeFieldContent}
        onInsertContent={handleInsertContent}
        documentId={documentId}
        organizationId={organizationId}
        onWidthChange={handlePromptBarWidthChange}
        onTriggerResearchPanel={handleTriggerResearchPanel}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        listingId={documentId}
        listingName={listingName}
      />

      {/* Research Panel */}
      <ResearchPanel
        isOpen={isResearchPanelOpen}
        onClose={() => {
          setIsResearchPanelOpen(false);
          setResearchPanelSuggestion({});
        }}
        listingId={documentId}
        organizationId={organizationId}
        activeFieldId={activeFieldId ?? undefined}
        activeFieldTitle={activeFieldTitle}
        onInsertContent={handleInsertFromResearch}
        suggestedCategory={researchPanelSuggestion.category}
        suggestedLabel={researchPanelSuggestion.label}
      />
    </div>
  );
} 