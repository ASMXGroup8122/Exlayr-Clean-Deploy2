import { useState, useCallback, useRef, useEffect } from 'react';
import { supabaseWithTimeout, RequestTimeoutError } from '@/lib/utils/requestTimeout';
import { getSupabaseClient } from '@/lib/supabase/client';

export interface DocumentLoaderState {
  loading: boolean;
  error: string | null;
  progress: number;
  currentOperation: string | null;
}

export interface DocumentLoaderOptions {
  timeout?: number;
  retryCount?: number;
  onProgress?: (progress: number, operation: string) => void;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export function useDocumentLoader(options: DocumentLoaderOptions = {}) {
  const {
    timeout = 15000,
    retryCount = 2,
    onProgress,
    onError,
    onSuccess
  } = options;

  const [state, setState] = useState<DocumentLoaderState>({
    loading: false,
    error: null,
    progress: 0,
    currentOperation: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const updateProgress = useCallback((progress: number, operation: string) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, progress, currentOperation: operation }));
      onProgress?.(progress, operation);
    }
  }, [onProgress]);

  const setLoading = useCallback((loading: boolean) => {
    if (mountedRef.current) {
      setState(prev => ({ 
        ...prev, 
        loading,
        progress: loading ? 0 : 100,
        currentOperation: loading ? 'Initializing...' : null,
        error: loading ? null : prev.error
      }));
    }
  }, []);

  const setError = useCallback((error: string | null) => {
    if (mountedRef.current) {
      setState(prev => ({ 
        ...prev, 
        error,
        loading: false,
        progress: 0,
        currentOperation: null
      }));
    }
  }, []);

  const loadDocument = useCallback(async (documentId: string) => {
    if (!documentId || !mountedRef.current) return null;

    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);

    let attempts = 0;
    const maxAttempts = retryCount + 1;

    while (attempts < maxAttempts && mountedRef.current) {
      try {
        updateProgress(10, 'Fetching document details...');

        // Fetch main document data
        const documentResult = await supabaseWithTimeout(
          async () => {
            const result = await supabase
              .from('listing')
              .select('*')
              .eq('instrumentid', documentId)
              .single();
            return result;
          },
          timeout
        );

        if (documentResult.error) {
          throw new Error(`Document not found: ${documentResult.error.message}`);
        }

        updateProgress(40, 'Loading document content...');

        // Fetch document content
        const contentResult = await supabaseWithTimeout(
          async () => {
            const result = await supabase
              .from('listingdocumentdirectlisting')
              .select('*')
              .eq('instrumentid', documentId)
              .single();
            return result;
          },
          timeout
        );

        updateProgress(70, 'Loading comments and metadata...');

        // Fetch comments (optional - don't fail if this fails)
        let comments = [];
        try {
          const commentsResult = await supabaseWithTimeout(
            async () => {
              const result = await supabase
                .from('document_comments')
                .select('*')
                .eq('document_id', documentId)
                .order('created_at', { ascending: true });
              return result;
            },
            timeout / 2 // Shorter timeout for comments
          );

          if (!commentsResult.error) {
            comments = commentsResult.data || [];
          }
        } catch (error) {
          console.warn('Failed to load comments, continuing without them:', error);
        }

        updateProgress(100, 'Complete');

        const result = {
          document: documentResult.data,
          content: contentResult.data,
          comments
        };

        if (mountedRef.current) {
          setState({
            loading: false,
            error: null,
            progress: 100,
            currentOperation: null
          });
          onSuccess?.();
        }

        return result;

      } catch (error) {
        attempts++;
        
        if (!mountedRef.current) return null;

        const isAborted = error instanceof Error && 
          (error.name === 'AbortError' || error.message.includes('aborted'));
        
        if (isAborted || attempts >= maxAttempts) {
          const errorMessage = error instanceof RequestTimeoutError
            ? 'Document loading timed out. Please check your connection and try again.'
            : error instanceof Error 
              ? error.message 
              : 'Failed to load document';

          setError(errorMessage);
          onError?.(error instanceof Error ? error : new Error(errorMessage));
          return null;
        }

        // Wait before retrying
        updateProgress(0, `Retrying... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    return null;
  }, [timeout, retryCount, updateProgress, setLoading, setError, onError, onSuccess, supabase]);

  const loadKnowledgeBase = useCallback(async (organizationId: string, category?: string) => {
    if (!organizationId || !mountedRef.current) return [];

    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);

    try {
      updateProgress(20, 'Initializing knowledge base...');

      let query = supabase
        .from('knowledge_base_documents')
        .select('*')
        .eq('organization_id', organizationId);

      if (category) {
        query = query.eq('category', category);
      }

      updateProgress(50, 'Fetching documents...');

      const result = await supabaseWithTimeout(
        async () => {
          const queryResult = await query.order('created_at', { ascending: false });
          return queryResult;
        },
        timeout
      );

      if (result.error) {
        throw new Error(`Failed to load knowledge base: ${result.error.message}`);
      }

      updateProgress(100, 'Complete');

      if (mountedRef.current) {
        setState({
          loading: false,
          error: null,
          progress: 100,
          currentOperation: null
        });
        onSuccess?.();
      }

      return result.data || [];

    } catch (error) {
      const errorMessage = error instanceof RequestTimeoutError
        ? 'Knowledge base loading timed out. Please try again.'
        : error instanceof Error 
          ? error.message 
          : 'Failed to load knowledge base';

      setError(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      return [];
    }
  }, [timeout, updateProgress, setLoading, setError, onError, onSuccess, supabase]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (mountedRef.current) {
      setState({
        loading: false,
        error: null,
        progress: 0,
        currentOperation: null
      });
    }
  }, []);

  return {
    ...state,
    loadDocument,
    loadKnowledgeBase,
    cancel,
    setError
  };
} 