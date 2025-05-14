import { useState, useEffect } from 'react';

/**
 * Hook for polling podcast generation status
 * @param recordId The ID of the podcast record to check
 * @param organizationId The organization ID for API key access
 * @param pollInterval Polling interval in milliseconds (default: 10000)
 */
export function usePodcastStatus(
  recordId?: string,
  organizationId?: string,
  pollInterval = 10000
) {
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!recordId || !organizationId) {
      setIsLoading(false);
      return;
    }
    
    const checkStatus = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/podcast/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordId, organizationId })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to check status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update state with response data
        setStatus(data.status);
        setIsLoading(false);
        
        if (data.progress !== undefined) {
          setProgress(data.progress);
        }
        
        if (data.status === 'completed' && data.audioUrl) {
          setAudioUrl(data.audioUrl);
          return true; // Status checking complete
        }
        
        return false; // Continue checking
      } catch (error) {
        console.error('Error checking podcast status:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setIsLoading(false);
        return false;
      }
    };
    
    // Initial check
    checkStatus();
    
    // Set up polling
    const intervalId = setInterval(async () => {
      const isDone = await checkStatus();
      if (isDone) clearInterval(intervalId);
    }, pollInterval);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [recordId, organizationId, pollInterval]);
  
  return { status, audioUrl, progress, error, isLoading };
} 