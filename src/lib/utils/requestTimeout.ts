export interface TimeoutOptions {
  timeout?: number;
  abortController?: AbortController;
}

export class RequestTimeoutError extends Error {
  constructor(message: string = 'Request timed out', operationContext?: string) {
    const enhancedMessage = operationContext 
      ? `${message} (Operation: ${operationContext})`
      : message;
    super(enhancedMessage);
    this.name = 'RequestTimeoutError';
    
    // Add stack trace context
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RequestTimeoutError);
    }
  }
}

/**
 * Wraps a promise with a timeout and optional abort controller
 */
export function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions & { operationName?: string } = {}
): Promise<T> {
  const { timeout = 15000, abortController, operationName = 'Unknown operation' } = options;

  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      const duration = performance.now() - startTime;
      console.error(`🚨 TIMEOUT: ${operationName} timed out after ${duration.toFixed(2)}ms (limit: ${timeout}ms)`);
      
      if (abortController && !abortController.signal.aborted) {
        abortController.abort();
      }
      reject(new RequestTimeoutError(`Operation timed out after ${timeout}ms`, operationName));
    }, timeout);

    // Handle abort signal if provided
    if (abortController) {
      if (abortController.signal.aborted) {
        clearTimeout(timeoutId);
        reject(new Error('Request was aborted'));
        return;
      }

      abortController.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Request was aborted'));
      });
    }

    promise
      .then((result) => {
        const duration = performance.now() - startTime;
        if (duration > 5000) {
          console.warn(`⚠️ SLOW: ${operationName} completed in ${duration.toFixed(2)}ms`);
        }
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        console.error(`❌ ERROR: ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Creates a fetch wrapper with timeout
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 15000
): Promise<Response> {
  const controller = new AbortController();
  
  return withTimeout(
    fetch(url, {
      ...options,
      signal: controller.signal,
    }),
    { timeout, abortController: controller }
  );
}

/**
 * Wraps Supabase operations with timeout
 */
export function supabaseWithTimeout<T>(
  operation: () => Promise<T>,
  timeout: number = 15000,
  operationName: string = 'Supabase query'
): Promise<T> {
  return withTimeout(operation(), { timeout, operationName });
} 