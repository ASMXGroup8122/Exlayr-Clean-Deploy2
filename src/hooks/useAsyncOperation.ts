import { useState, useCallback, useRef, useEffect } from 'react';
import { withTimeout, RequestTimeoutError } from '@/lib/utils/requestTimeout';

// FORCE RECOMPILE: 2024-01-XX - Fixed infinite loop issue
// This ensures the browser loads the corrected version

export interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export interface AsyncOperationOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  operationName?: string;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  enableDebugLogging?: boolean;
}

// Debug utility to track dependency changes and prevent infinite loops
const useDebugDependencyChanges = (name: string, deps: any[], enabled = false) => {
  const prevDeps = useRef<any[]>([]);
  const renderCount = useRef(0);
  
  useEffect(() => {
    if (!enabled) return;
    
    renderCount.current++;
    
    if (renderCount.current > 50) {
      console.error(`🚨 INFINITE LOOP DETECTED in ${name}! Rendered ${renderCount.current} times`);
      console.error('Dependencies that changed:', deps);
    }
    
    const changedDeps = deps.reduce((acc, dep, index) => {
      if (prevDeps.current[index] !== dep) {
        acc.push({ index, from: prevDeps.current[index], to: dep });
      }
      return acc;
    }, [] as any[]);
    
    if (changedDeps.length > 0 && renderCount.current > 5) {
      console.warn(`⚠️  ${name} dependency changes:`, changedDeps);
    }
    
    prevDeps.current = [...deps];
  });
};

export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
) {
  const {
    timeout = 15000,
    retryCount = 2,
    retryDelay = 1000,
    operationName = 'Async operation',
    onError,
    onSuccess,
    enableDebugLogging = false
  } = options;

  // Debug logging for development
  useDebugDependencyChanges(
    `useAsyncOperation(${operationName})`,
    [operation, onError, onSuccess, timeout, retryCount, retryDelay],
    enableDebugLogging
  );

  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    isInitialized: false
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const operationRef = useRef(operation);
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  
  // Store timeout and retry options in refs to avoid dependencies
  const optionsRef = useRef({ timeout, retryCount, retryDelay, operationName });

  // Update refs when values change - this doesn't affect execute function stability
  useEffect(() => {
    operationRef.current = operation;
  }, [operation]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    optionsRef.current = { timeout, retryCount, retryDelay, operationName };
  }, [timeout, retryCount, retryDelay, operationName]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // CRITICAL FIX: Make execute function completely stable by removing all dependencies
  // All dynamic values are accessed via refs, ensuring the function reference never changes
  const execute = useCallback(async (skipLoadingState = false) => {
    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { timeout, retryCount, retryDelay, operationName } = optionsRef.current;

    if (!skipLoadingState && mountedRef.current) {
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null 
      }));
    }

    let attempts = 0;
    const maxAttempts = retryCount + 1;

    while (attempts < maxAttempts && mountedRef.current) {
      try {
        let operationPromise: Promise<T>;
        
        try {
          operationPromise = operationRef.current();
        } catch (syncError) {
          // Handle synchronous errors from the operation function
          throw syncError;
        }

        const result = await withTimeout(operationPromise, {
          timeout,
          abortController: abortControllerRef.current,
          operationName
        });

        if (mountedRef.current) {
          setState({
            data: result,
            loading: false,
            error: null,
            isInitialized: true
          });
          onSuccessRef.current?.();
        }
        return result;

      } catch (error) {
        attempts++;
        
        if (!mountedRef.current) return null;

        // Don't retry if aborted or if it's the last attempt
        const isAbortError = (
          (error instanceof Error && error.name === 'AbortError') ||
          (error && typeof error === 'object' && 'message' in error && 
           typeof error.message === 'string' && error.message.includes('aborted')) ||
          (typeof error === 'string' && error.includes('aborted'))
        );

        if (isAbortError || attempts >= maxAttempts) {
          let errorMessage: string;
          let errorObject: Error;

          if (error instanceof RequestTimeoutError) {
            errorMessage = 'Request timed out. Please check your connection and try again.';
            errorObject = error;
          } else if (error instanceof Error) {
            errorMessage = error.message;
            errorObject = error;
          } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = String(error.message);
            errorObject = new Error(errorMessage);
          } else if (typeof error === 'string') {
            errorMessage = error;
            errorObject = new Error(error);
          } else {
            errorMessage = 'An unexpected error occurred';
            errorObject = new Error(errorMessage);
          }

          setState({
            data: null,
            loading: false,
            error: errorMessage,
            isInitialized: true
          });
          
          try {
            onErrorRef.current?.(errorObject);
          } catch (callbackError) {
            console.error('Error in onError callback:', callbackError);
          }
          
          return null;
        }

        // Wait before retrying
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
        }
      }
    }

    return null;
  }, []); // CRITICAL: Empty dependency array ensures stable function reference

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState({
      data: null,
      loading: false,
      error: null,
      isInitialized: false
    });
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (mountedRef.current) {
      setState(prev => ({ 
        ...prev, 
        loading: false 
      }));
    }
  }, []);

  return {
    ...state,
    execute,
    reset,
    cancel
  };
} 