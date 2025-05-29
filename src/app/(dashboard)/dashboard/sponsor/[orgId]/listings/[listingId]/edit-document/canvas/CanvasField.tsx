'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, CheckCircle, MessageCircle, Lock, Hash, Edit3, User } from 'lucide-react';
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
      "bg-white/90 backdrop-blur-sm border border-green-200/50 rounded-xl shadow-lg hover:shadow-xl",
      isActive && "ring-2 ring-green-500/50 border-green-400/50 shadow-xl bg-green-50/30",
      isLocked && "bg-gray-50/80 border-gray-300/50"
    )}>
      {/* Field Header - Match Generation Section Style */}
      <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-green-200/30">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
          {fieldIndex && (
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg text-xs sm:text-sm font-bold shadow-lg flex-shrink-0 mt-0.5 sm:mt-0">
              {fieldIndex}
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <h3 className={cn(
              "text-base sm:text-lg font-semibold transition-colors leading-tight",
              isActive ? "bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent" : "text-gray-900",
              isLocked && "text-gray-600"
            )}>
              {title}
            </h3>
            {isLocked && (
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-red-100 border border-red-200/50 rounded-lg self-start backdrop-blur-sm" title="This field is locked">
                <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                <span className="text-xs text-red-700 font-medium">Locked</span>
              </div>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Comments Button */}
          {hasComments && (
            <Button
              onClick={() => setShowComments(!showComments)}
              className="h-8 px-3 text-xs sm:text-sm bg-white/70 border border-green-200/50 text-green-600 hover:text-green-800 hover:bg-green-50 hover:border-green-300 rounded-lg transition-all duration-200"
            >
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
              {comments.length}
            </Button>
          )}

          {/* Save Status */}
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-2 text-xs sm:text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">
                <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full" />
                <span className="font-medium hidden sm:inline">Saving...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-2 text-xs sm:text-sm px-2 py-1 bg-green-100 text-green-700 rounded-lg">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-medium hidden sm:inline">Saved</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-xs sm:text-sm px-2 py-1 bg-red-100 text-red-700 rounded-lg">
                <div className="h-3 w-3 sm:h-4 sm:w-4 bg-red-500 rounded-full" />
                <span className="font-medium hidden sm:inline">Error</span>
              </div>
            )}
            {saveStatus === 'idle' && hasChanges && (
              <div className="flex items-center gap-2 text-xs sm:text-sm px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">
                <div className="h-3 w-3 sm:h-4 sm:w-4 bg-amber-500 rounded-full animate-pulse" />
                <span className="font-medium hidden sm:inline">Unsaved</span>
              </div>
            )}
          </div>

          {/* Manual Save Button */}
          {!isLocked && hasChanges && (
            <Button
              onClick={handleManualSave}
              className="h-8 px-3 text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/50 border border-green-200/50 text-green-700 hover:bg-green-50 hover:border-green-300 rounded-lg"
            >
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          )}
        </div>
      </div>

      {/* Field Content - Enhanced Styling */}
      <div className="p-4 sm:p-6">
        <div className="relative">
          <Textarea
            value={localContent}
            onChange={handleContentChange}
            onFocus={handleFocus}
            disabled={isLocked}
            placeholder={isLocked ? "This field is locked and cannot be edited" : `Enter ${title.toLowerCase()}...`}
            className={cn(
              "min-h-[120px] sm:min-h-[160px] lg:min-h-[180px] resize-none transition-all duration-200 text-sm sm:text-base leading-relaxed",
              "border-2 border-green-200/50 bg-white/80 focus:bg-white focus:ring-2 focus:ring-green-500/50 focus:border-green-400",
              "rounded-xl p-4 w-full backdrop-blur-sm",
              "hover:border-green-300/50 hover:bg-white/90",
              isLocked && "bg-gray-100/50 cursor-not-allowed opacity-70 text-gray-600 border-gray-300/50",
              hasChanges && !isLocked && "bg-green-50/50 border-green-300/50 ring-2 ring-green-200/50",
              isActive && !isLocked && "border-green-400/50 ring-2 ring-green-300/50"
            )}
          />
        </div>
      </div>

      {/* Comments Section */}
      {showComments && hasComments && (
        <div className="border-t border-gray-200/30 bg-gradient-to-r from-green-50/50 to-emerald-50/50 backdrop-blur-sm">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                Comments ({comments.length})
              </h4>
              <Button
                onClick={() => setShowComments(false)}
                className="h-8 w-8 p-0 bg-white/70 border border-green-200/50 text-green-600 hover:text-green-800 hover:bg-green-100/50 rounded-lg transition-all duration-200"
              >
                ×
              </Button>
            </div>
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">{comment.user_name}</span>
                      <div className="text-gray-500 text-xs">
                        {new Date(comment.created_at).toLocaleDateString()} at{' '}
                        {new Date(comment.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed pl-11">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 