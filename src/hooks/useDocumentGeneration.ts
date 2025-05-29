import { useState, useCallback } from 'react';

export interface GenerationProgress {
  sessionId: string;
  stage: string;
  progress: number;
  message: string;
  error?: string;
  timestamp?: string;
}

export interface GenerationResult {
  success: boolean;
  sessionId: string;
  documentId?: string;
  instrumentid?: string;
  instrumentissuerid?: string;
  sectionsGenerated?: number;
  sectionsProcessed?: number;
  columnsUpdated?: string[];  // Database columns that were updated
  skippedSections?: string[]; // Sections that were skipped due to missing database columns
  message?: string;           // Status message from the server
  sections?: Array<{
    promptname: string;
    title: string;
    preview: string;
    content?: string;  // Full content when available
  }>;
  error?: string;
}

export interface GenerationParams {
  instrumentid: string;
  instrumentissuerid: string;
  sections: string[];           // ["sec1prompt", "sec2prompt", etc.]
  selectedDocuments?: string[]; // Knowledge base document IDs
  documentType?: string;
}

export const useDocumentGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start document generation
  const generateDocument = useCallback(async (params: GenerationParams): Promise<GenerationResult | null> => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Document generation failed');
      }

      // Enhanced result with full content
      const enhancedResult: GenerationResult = {
        ...data,
        sections: data.sections?.map((section: any) => ({
          promptname: section.promptname,
          title: section.title,
          preview: section.preview || section.content?.substring(0, 200) + '...',
          content: section.content || section.preview // Use full content if available
        }))
      };

      setResult(enhancedResult);
      return enhancedResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      setResult({ success: false, sessionId: '', error: errorMessage });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Check generation progress (for real-time updates)
  const checkProgress = useCallback(async (sessionId: string): Promise<GenerationProgress | null> => {
    try {
      const response = await fetch(`/api/ai/generate-document?sessionId=${sessionId}`);
      const data: GenerationProgress = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setProgress(data);
      return data;
    } catch (err: any) {
      console.error('[DocumentGeneration] Progress check failed:', err);
      return null;
    }
  }, []);

  // Start generation with progress tracking
  const generateWithProgress = useCallback(async (
    params: GenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GenerationResult | null> => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);
    setResult(null);

    try {
      // Start generation
      const response = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      const data: GenerationResult = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // If we have a sessionId, we could poll for progress
      // For now, we'll just return the final result
      setResult(data);
      return data;

    } catch (err: any) {
      console.error('[DocumentGeneration] Generation failed:', err);
      const errorMessage = err.message || 'Document generation failed';
      setError(errorMessage);
      setResult({
        success: false,
        sessionId: '',
        error: errorMessage
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    // State
    isGenerating,
    progress,
    result,
    error,
    
    // Actions
    generateDocument,
    generateWithProgress,
    checkProgress,
    reset,
    
    // Computed state
    isComplete: result?.success === true,
    hasError: !!error || result?.success === false,
    isInProgress: isGenerating || (progress && progress.progress < 100)
  };
}; 