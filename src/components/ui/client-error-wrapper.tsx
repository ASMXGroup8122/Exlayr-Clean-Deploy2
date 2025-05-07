'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';
import { ChunkErrorHandler } from './chunk-error-handler';

interface ClientErrorWrapperProps {
  children: ReactNode;
  chunkIds?: string[];
}

export function ClientErrorWrapper({ 
  children, 
  chunkIds = ['4094'] 
}: ClientErrorWrapperProps) {
  return (
    <>
      {/* Initialize chunk error handling */}
      <ChunkErrorHandler chunkIds={chunkIds} />
      
      {/* Wrap children in error boundary */}
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </>
  );
} 