'use client';

import { useEffect } from 'react';
import { initChunkErrorHandler, preloadCriticalChunks } from '@/utils/chunkError';

interface ChunkErrorHandlerProps {
  chunkIds?: string[];
}

export function ChunkErrorHandler({ chunkIds = [] }: ChunkErrorHandlerProps) {
  useEffect(() => {
    // Initialize the error handler
    initChunkErrorHandler();
    
    // Preload critical chunks after a short delay to allow initial rendering
    const timer = setTimeout(() => {
      preloadCriticalChunks(chunkIds);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [chunkIds]);

  // This component doesn't render anything
  return null;
} 