'use client';

/**
 * Utility to help handle JavaScript chunk loading errors
 */

// Define window.chunkLoadError to help track chunk loading issues globally
declare global {
  interface Window {
    chunkLoadError?: {
      lastError: string | null;
      retryCount: number;
      timestamp: number;
    };
  }
}

/**
 * Initialize the global chunk error handler
 * To be called in client components early in the application lifecycle
 */
export function initChunkErrorHandler() {
  // Skip if already initialized or not in browser
  if (typeof window === 'undefined' || window.chunkLoadError) return;

  // Initialize error tracking object
  window.chunkLoadError = {
    lastError: null,
    retryCount: 0,
    timestamp: Date.now()
  };

  // Handle unhandled errors to catch chunk loading issues
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Call original handler if it exists
    if (originalOnError) {
      originalOnError.apply(this, [message, source, lineno, colno, error]);
    }

    // Check if this is a chunk loading error
    const errorMessage = message?.toString() || '';
    const isChunkError = (
      errorMessage.includes('Loading chunk') || 
      errorMessage.includes('Failed to load') ||
      errorMessage.includes('Unexpected token')
    );

    if (isChunkError && window.chunkLoadError) {
      // Update error tracking
      window.chunkLoadError.lastError = errorMessage;
      window.chunkLoadError.retryCount++;
      window.chunkLoadError.timestamp = Date.now();

      console.error('Chunk loading error detected:', errorMessage);

      // Handle based on retry count
      if (window.chunkLoadError.retryCount <= 2) {
        console.log(`Attempting to reload after chunk error (attempt ${window.chunkLoadError.retryCount})`);
        
        // Clear caches if available
        if (window.caches) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              caches.delete(cacheName);
            });
          });
        }
        
        // Reload the page after a small delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        return true; // Prevent default error handling
      }
    }
    
    return false; // Allow default error handling for non-chunk errors
  };

  console.log('Chunk error handler initialized');
}

/**
 * Preload critical chunks to ensure they're in the browser cache
 * @param chunkIds Array of chunk IDs to preload
 */
export function preloadCriticalChunks(chunkIds: string[] = []) {
  // Skip if not in browser
  if (typeof window === 'undefined') return;
  
  // Get the current origin
  const origin = window.location.origin;
  
  // Preload the main app chunks
  const preloadChunks = [
    // Common framework chunks
    'webpack-...',
    'framework-...',
    'main-...',
    // App specific chunks
    ...chunkIds
  ];
  
  // Find actual chunk IDs from current scripts
  const scripts = document.querySelectorAll('script[src*="_next/static/chunks"]');
  scripts.forEach(script => {
    const src = script.getAttribute('src');
    if (src) {
      // Extract chunk ID from script src
      const match = src.match(/_next\/static\/chunks\/([^.]+)/);
      if (match && match[1]) {
        preloadChunks.push(match[1]);
      }
    }
  });
  
  // Create preload links for chunks (using a Set to deduplicate)
  const uniqueChunks = [...new Set(preloadChunks)];
  uniqueChunks.forEach(chunkId => {
    if (!chunkId.includes('...')) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = `${origin}/_next/static/chunks/${chunkId}.js`;
      document.head.appendChild(link);
    }
  });
} 