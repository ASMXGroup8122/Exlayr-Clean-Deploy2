import { useState, useCallback, useRef, useEffect } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseCanvasFieldProps {
  fieldId: string;
  content: string;
  onSave: (fieldId: string, content: string) => Promise<{ success: boolean }>;
  debounceMs?: number;
}

interface UseCanvasFieldReturn {
  saveStatus: SaveStatus;
  triggerSave: (content: string) => void;
  forceSave: () => Promise<void>;
}

/**
 * Custom hook for managing debounced auto-save functionality in Canvas Mode fields.
 * Provides save status tracking and debounced save operations.
 */
export function useCanvasField({
  fieldId,
  content,
  onSave,
  debounceMs = 1000
}: UseCanvasFieldProps): UseCanvasFieldReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>(content);
  const pendingContentRef = useRef<string>(content);

  // Update refs when content prop changes
  useEffect(() => {
    lastSavedContentRef.current = content;
    pendingContentRef.current = content;
  }, [content]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Perform the actual save operation
  const performSave = useCallback(async (contentToSave: string) => {
    // Don't save if content hasn't changed
    if (contentToSave === lastSavedContentRef.current) {
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('saving');
    
    try {
      const result = await onSave(fieldId, contentToSave);
      
      if (result.success) {
        lastSavedContentRef.current = contentToSave;
        setSaveStatus('saved');
        
        // Auto-hide saved status after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } else {
        setSaveStatus('error');
        
        // Auto-hide error status after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving field:', error);
      setSaveStatus('error');
      
      // Auto-hide error status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  }, [fieldId, onSave]);

  // Trigger debounced save
  const triggerSave = useCallback((newContent: string) => {
    pendingContentRef.current = newContent;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Don't set up save if content hasn't changed
    if (newContent === lastSavedContentRef.current) {
      setSaveStatus('saved');
      return;
    }

    // Set status to indicate pending save
    setSaveStatus('idle');

    // Set up new debounced save
    timeoutRef.current = setTimeout(() => {
      performSave(pendingContentRef.current);
    }, debounceMs);
  }, [debounceMs, performSave]);

  // Force immediate save (for manual save button)
  const forceSave = useCallback(async () => {
    // Clear any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    await performSave(pendingContentRef.current);
  }, [performSave]);

  return {
    saveStatus,
    triggerSave,
    forceSave
  };
} 