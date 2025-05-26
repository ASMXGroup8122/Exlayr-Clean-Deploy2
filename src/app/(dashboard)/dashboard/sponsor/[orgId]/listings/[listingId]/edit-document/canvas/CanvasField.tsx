'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, CheckCircle, MessageCircle, Lock, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import type { Comment } from '@/types/documents';
import { useCanvasField } from './useCanvasField';

interface CanvasFieldProps {
  fieldId: string;
  title: string;
  content: string;
  isLocked: boolean;
  comments: Comment[];
  onChange: (fieldId: string, content: string) => void;
  onSave: (fieldId: string, content: string) => Promise<{ success: boolean }>;
  onFocus: (fieldId: string, fieldTitle: string, content: string) => void;
  userId: string;
  fieldIndex?: number;
  isActive?: boolean;
}

/**
 * Individual field component for Canvas Mode with auto-save functionality
 */
export default function CanvasField({
  fieldId,
  title,
  content,
  isLocked,
  comments,
  onChange,
  onSave,
  onFocus,
  userId,
  fieldIndex,
  isActive = false
}: CanvasFieldProps) {
  const { toast } = useToast();
  const [localContent, setLocalContent] = useState(content);
  const [showComments, setShowComments] = useState(false);

  // Use the custom hook for debounced auto-save
  const { saveStatus, triggerSave } = useCanvasField({
    fieldId,
    content: localContent,
    onSave,
    debounceMs: 1000
  });

  // Update local content when prop changes (from parent state updates)
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Handle content changes
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    onChange(fieldId, newContent);
    
    // Trigger auto-save through the hook
    triggerSave(newContent);
  }, [fieldId, onChange, triggerSave]);

  // Handle focus events for AI context
  const handleFocus = useCallback(() => {
    onFocus(fieldId, title, localContent);
  }, [onFocus, fieldId, title, localContent]);

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    const result = await onSave(fieldId, localContent);
    if (result.success) {
      toast({
        title: "Field saved",
        description: `"${title}" has been saved successfully.`,
        duration: 2000,
      });
    } else {
      toast({
        title: "Save failed",
        description: `Could not save "${title}". Please try again.`,
        variant: "destructive",
      });
    }
  }, [fieldId, localContent, onSave, title, toast]);

  // Calculate if content has changed from original
  const hasChanges = localContent !== content;
  const hasComments = comments.length > 0;

  return (
    <div className={cn(
      "group relative transition-all duration-300",
      "bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md",
      isActive && "ring-2 ring-blue-500 ring-opacity-30 border-blue-300 shadow-lg",
      isLocked && "bg-gray-50 border-gray-300"
    )}>
      {/* Field Header */}
      <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
          {fieldIndex && (
            <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 rounded-md sm:rounded-lg text-xs font-bold shadow-sm flex-shrink-0 mt-0.5 sm:mt-0">
              {fieldIndex}
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <h3 className={cn(
              "text-base sm:text-lg font-semibold transition-colors leading-tight",
              isActive ? "text-blue-700" : "text-gray-900",
              isLocked && "text-gray-600"
            )}>
              {title}
            </h3>
            {isLocked && (
              <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-red-50 border border-red-200 rounded-md sm:rounded-lg self-start" title="This field is locked">
                <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500" />
                <span className="text-xs text-red-700 font-medium">Locked</span>
              </div>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Comments Button */}
          {hasComments && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md sm:rounded-lg"
            >
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
              {comments.length}
            </Button>
          )}

          {/* Save Status */}
          <div className="flex items-center gap-1 sm:gap-2">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-blue-600">
                <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full" />
                <span className="font-medium hidden sm:inline">Saving...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-green-600">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-medium hidden sm:inline">Saved</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-red-600">
                <div className="h-3 w-3 sm:h-4 sm:w-4 bg-red-500 rounded-full" />
                <span className="font-medium hidden sm:inline">Error</span>
              </div>
            )}
            {saveStatus === 'idle' && hasChanges && (
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-amber-600">
                <div className="h-3 w-3 sm:h-4 sm:w-4 bg-amber-500 rounded-full animate-pulse" />
                <span className="font-medium hidden sm:inline">Unsaved</span>
              </div>
            )}
          </div>

          {/* Manual Save Button */}
          {!isLocked && hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSave}
              className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-blue-50 hover:border-blue-300"
            >
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          )}
        </div>
      </div>

      {/* Field Content */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="relative">
          <Textarea
            value={localContent}
            onChange={handleContentChange}
            onFocus={handleFocus}
            disabled={isLocked}
            placeholder={isLocked ? "This field is locked and cannot be edited" : `Enter ${title.toLowerCase()}...`}
            className={cn(
              "min-h-[120px] sm:min-h-[160px] lg:min-h-[180px] resize-none transition-all duration-200 text-sm sm:text-base leading-relaxed",
              "border-0 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20",
              "rounded-lg p-3 sm:p-4 w-full",
              isLocked && "bg-gray-100 cursor-not-allowed opacity-70 text-gray-600",
              hasChanges && !isLocked && "bg-amber-50 ring-2 ring-amber-200",
              isActive && !isLocked && "bg-blue-50 ring-2 ring-blue-200",
              "text-gray-900 placeholder:text-gray-500"
            )}
            rows={6}
          />

          {/* Field ID indicator (for debugging) */}
          <div className="absolute bottom-2 right-2 sm:right-3 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono bg-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded shadow-sm">
            {fieldId}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && hasComments && (
        <div className="border-t border-gray-200 bg-blue-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-blue-900">
                Comments ({comments.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(false)}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg"
              >
                ×
              </Button>
            </div>
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-semibold text-sm">
                        {comment.user_name?.charAt(0).toUpperCase() || 'A'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-blue-800 text-sm">{comment.user_name}</span>
                      <div className="text-blue-600 text-xs">
                        {new Date(comment.created_at).toLocaleDateString()} at{' '}
                        {new Date(comment.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <p className="text-blue-700 text-sm leading-relaxed pl-11">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 