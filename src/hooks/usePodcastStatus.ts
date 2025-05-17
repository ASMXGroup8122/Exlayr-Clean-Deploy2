import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for polling podcast generation status
 * @param recordId The ID of the podcast record to check
 * @param organizationId The organization ID for API key access
 */
export function usePodcastStatus(
  recordId?: string,
  organizationId?: string
) {
  console.log(`[usePodcastStatus] Hook initialized for recordId: ${recordId}, organizationId: ${organizationId}`);
  
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [podcastFormat, setPodcastFormat] = useState<string | null>(null);
  
  const checkStatus = useCallback(async (isManualRefetch = false) => {
    if (!recordId || !organizationId) {
      console.log('[usePodcastStatus] Missing recordId or organizationId, aborting check.');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log(`[usePodcastStatus] Checking status for podcastId: ${recordId}, isManualRefetch: ${isManualRefetch}`);
      setIsLoading(true);
      
      const payload = JSON.stringify({ 
        recordId, 
        organizationId,
        forceRetrieve: isManualRefetch,
        timestamp: new Date().toISOString()
      });
      
      const response = await fetch('/api/podcast/check-status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' 
        },
        body: payload
      });
      
      console.log(`[usePodcastStatus] API response status: ${response.status}`);
      
      if (!response.ok) {
        let errorMessage = `Failed to check status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error(`[usePodcastStatus] API error:`, errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error(`[usePodcastStatus] Failed to parse error response:`, parseError);
        }
        throw new Error(errorMessage);
      }
      
      let data;
      try {
        data = await response.json();
        console.log(`[usePodcastStatus] API response data:`, data);
      } catch (parseError) {
        console.error(`[usePodcastStatus] Failed to parse API response:`, parseError);
        throw new Error('Invalid JSON response from API');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setStatus(data.status);
      setAudioUrl(data.audioUrl || null);
      setProgress(data.progress !== undefined ? data.progress : 0);
      setPodcastFormat(data.format || null);
      setError(data.message && data.status !== 'completed' ? data.message : null);
      setIsLoading(false);

      if (isManualRefetch && (data.status === 'completed' || data.status === 'failed')) {
        console.log(`[usePodcastStatus] Manual refetch processed, status: ${data.status}`);
      }

    } catch (err) {
      console.error('[usePodcastStatus] Error checking podcast status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error during status check');
      setIsLoading(false);
    }
  }, [recordId, organizationId]);
  
  const refetch = useCallback(async () => {
    console.log(`[usePodcastStatus] Manual refetch triggered for recordId: ${recordId}`);
    await checkStatus(true);
  }, [checkStatus, recordId]);
  
  useEffect(() => {
    if (recordId && organizationId) {
      console.log(`[usePodcastStatus] Performing initial status check for recordId: ${recordId}`);
      checkStatus(false);
    } else {
      console.log('[usePodcastStatus] recordId or organizationId not available for initial check.');
      setIsLoading(false);
    }
  }, [recordId, organizationId, checkStatus]);
  
  return { status, audioUrl, progress, error, isLoading, refetch, podcastFormat };
} 