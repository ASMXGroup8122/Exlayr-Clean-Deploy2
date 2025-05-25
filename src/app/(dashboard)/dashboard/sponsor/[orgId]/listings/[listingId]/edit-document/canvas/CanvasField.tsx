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
      "group relative transition-all duration-200",
      isActive && "ring-2 ring-blue-500 ring-opacity-50 rounded-lg"
    )}>
      {/* Field Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {fieldIndex && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Hash className="h-3 w-3" />
              <span className="font-mono">{fieldIndex}</span>
            </div>
          )}
          <h3 className={cn(
            "text-base font-medium transition-colors",
            isActive ? "text-blue-700" : "text-gray-900"
          )}>
            {title}
          </h3>
          {isLocked && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-md" title="This field is locked">
              <Lock className="h-3 w-3 text-red-500" />
              <span className="text-xs text-red-700 font-medium">Locked</span>
            </div>
          )}
          {hasComments && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>

        {/* Save Status and Manual Save Button */}
        <div className="flex items-center gap-3">
          {/* Save Status Indicator */}
          <div className="flex items-center gap-2 text-xs">
            {saveStatus === 'saving' && (
              <>
                <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full text-blue-600" />
                <span className="text-blue-600 font-medium">Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-green-600 font-medium">Saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <div className="h-3 w-3 bg-red-500 rounded-full" />
                <span className="text-red-600 font-medium">Error</span>
              </>
            )}
            {saveStatus === 'idle' && hasChanges && (
              <>
                <div className="h-3 w-3 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-amber-600 font-medium">Unsaved</span>
              </>
            )}
          </div>

          {/* Manual Save Button */}
          {!isLocked && hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSave}
              className="h-7 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Field Content */}
      <div className="relative">
        <Textarea
          value={localContent}
          onChange={handleContentChange}
          onFocus={handleFocus}
          disabled={isLocked}
          placeholder={isLocked ? "This field is locked" : `Enter ${title.toLowerCase()}...`}
          className={cn(
            "min-h-[160px] resize-none transition-all duration-200",
            "border-gray-200 focus:border-blue-500 focus:ring-blue-500",
            isLocked && "bg-gray-50 cursor-not-allowed opacity-70",
            hasChanges && !isLocked && "border-amber-300 bg-amber-50",
            isActive && !isLocked && "border-blue-300 bg-blue-50",
            "text-gray-900 placeholder:text-gray-400"
          )}
          rows={9}
        />

        {/* Field ID indicator (for debugging) */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
          {fieldId}
        </div>
      </div>

      {/* Comments Section */}
      {showComments && hasComments && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-blue-900">
              Comments ({comments.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(false)}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              ×
            </Button>
          </div>
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-white p-3 rounded-md border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-blue-800 text-sm">{comment.user_name}</span>
                  <span className="text-blue-600 text-xs">
                    {new Date(comment.created_at).toLocaleDateString()} at{' '}
                    {new Date(comment.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-blue-700 text-sm leading-relaxed">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 