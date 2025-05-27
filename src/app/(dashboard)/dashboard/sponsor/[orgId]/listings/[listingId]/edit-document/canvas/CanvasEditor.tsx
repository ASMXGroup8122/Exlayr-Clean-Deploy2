'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Share2, Download, Save, CheckCircle, Sparkles, Search } from 'lucide-react';
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

  // This was used for a different rendering approach - now we render directly from sections

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 bg-white border-b border-gray-200 shadow-sm relative z-30">
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToBoxMode}
            className="flex items-center gap-1 sm:gap-2 hover:bg-gray-100 text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Box Mode</span>
            <span className="sm:hidden">Box</span>
          </Button>
          <div className="h-4 sm:h-5 w-px bg-gray-300" />
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              Canvas Mode
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {/* Save Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-gray-50">
            {hasUnsavedChanges ? (
              <>
                <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-amber-700 font-medium hidden lg:inline">Unsaved changes</span>
                <span className="text-amber-700 font-medium lg:hidden">Unsaved</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-700 font-medium hidden lg:inline">All saved</span>
                <span className="text-green-700 font-medium lg:hidden">Saved</span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              onClick={() => setIsShareModalOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 sm:gap-2 hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 px-2 sm:px-3"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <Button
              onClick={handleSaveAll}
              disabled={!hasUnsavedChanges || isSaving}
              size="sm"
              variant={hasUnsavedChanges ? "default" : "outline"}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
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
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Research</span>
            </Button>

            <Button
              size="sm"
              onClick={handlePromptBarToggle}
              variant={isPromptBarVisible ? "default" : "outline"}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 ${
                isPromptBarVisible 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Assistant</span>
              <span className="sm:hidden">AI</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden bg-white">
        <ScrollArea className="h-full">
          <div 
            className="transition-all duration-300 ease-in-out"
            style={{
              paddingRight: isMounted && isPromptBarVisible && typeof window !== 'undefined' && window.innerWidth >= 1024 
                ? `${promptBarWidth}px` 
                : '0px'
            }}
          >
            <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 min-h-full ${
              isPromptBarVisible ? 'lg:max-w-5xl' : 'max-w-4xl'
            }`}>
              {/* Document Header */}
              <div className="mb-8 sm:mb-10 lg:mb-12">
                <div className="flex items-start justify-between mb-4 sm:mb-6">
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">
                      {listingName || 'Listing Document'}
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="truncate">Document ID: {documentId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="truncate">Edited by: {userName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>{initialSections.length} sections</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
              </div>

              {/* Document Sections */}
              <div className="space-y-10 sm:space-y-12 lg:space-y-16">
                {initialSections.map((section, sectionIndex) => (
                  <div key={section.id} className="relative">
                    {/* Section Header */}
                    <div className="mb-6 sm:mb-8">
                      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 text-blue-700 rounded-lg font-semibold text-xs sm:text-sm">
                          {sectionIndex + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">
                            {section.title}
                          </h2>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                              section.status === 'approved' ? 'bg-green-100 text-green-800' :
                              section.status === 'locked' ? 'bg-red-100 text-red-800' :
                              section.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {section.status?.replace('_', ' ') || 'pending'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {section.subsections.length} field{section.subsections.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="h-px bg-gradient-to-r from-blue-200 via-blue-100 to-transparent ml-10 sm:ml-12"></div>
                    </div>

                    {/* Section Fields */}
                    <div className="ml-4 sm:ml-8 lg:ml-12 space-y-6 sm:space-y-8">
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