'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Share2, Download, Save, CheckCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Section, Subsection, Comment } from '@/types/documents';
import CanvasField from './CanvasField';
import CanvasPromptBar from './CanvasPromptBar';
import { ShareModal } from './ShareModal';

interface CanvasEditorProps {
  initialSections: Section[];
  groupedComments: Record<string, Comment[]>;
  documentId: string;
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
  
  // AI Prompt Bar state
  const [isPromptBarVisible, setIsPromptBarVisible] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldTitle, setActiveFieldTitle] = useState<string>('');
  const [activeFieldContent, setActiveFieldContent] = useState<string>('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm relative z-30">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToBoxMode}
            className="flex items-center gap-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Box Mode
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Canvas Mode
            </h1>
            <p className="text-sm text-gray-600">Document {documentId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Save Status Indicator */}
          <div className="flex items-center gap-2 text-sm">
            {hasUnsavedChanges ? (
              <>
                <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-amber-700 font-medium">Unsaved changes</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-700 font-medium">All changes saved</span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <Button
            onClick={() => setIsShareModalOpen(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 hover:bg-gray-100"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          <Button
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges || isSaving}
            size="sm"
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save All'}
          </Button>

          <Button
            size="sm"
            onClick={handlePromptBarToggle}
            className={`flex items-center gap-2 ${
              isPromptBarVisible ? 'bg-blue-600 hover:bg-blue-700' : ''
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI Assistant
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className={`mx-auto py-8 transition-all duration-300 ${
            isPromptBarVisible ? 'max-w-none pr-[420px] pl-2 space-y-6' : 'max-w-6xl px-8 space-y-8'
          }`}>
            {/* Document Title */}
            <div className="text-center border-b pb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Listing Document
              </h1>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                <span>Document ID: {documentId}</span>
                <span>•</span>
                <span>Edited by: {userName}</span>
                <span>•</span>
                <span>{initialSections.length} sections</span>
              </div>
            </div>

            {/* Render all sections and fields */}
            {initialSections.map((section, sectionIndex) => (
              <div key={section.id} className="space-y-6">
                {/* Section Header */}
                <div className="border-l-4 border-blue-500 pl-6 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                        {section.title}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          section.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                          section.status === 'locked' ? 'bg-red-100 text-red-800 border border-red-200' :
                          section.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {section.status?.replace('_', ' ') || 'pending'}
                        </span>
                        <span>•</span>
                        <span>{section.subsections.length} fields</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      Section {sectionIndex + 1}
                    </div>
                  </div>
                </div>

                {/* Section Fields (Subsections) */}
                <div className={`space-y-6 ${isPromptBarVisible ? 'ml-2' : 'ml-4'}`}>
                  {section.subsections?.map((subsection) => (
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
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Footer Spacer */}
            <div className="h-20" />
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
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        listingId={documentId}
        listingName={listingName}
      />
    </div>
  );
} 