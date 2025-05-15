import { useState, useEffect, useCallback } from 'react';

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
  console.log(`[usePodcastStatus] Hook initialized with recordId: ${recordId}, organizationId: ${organizationId}`);
  
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stopPolling, setStopPolling] = useState(false);
  
  const checkStatus = useCallback(async (skipPolling = false) => {
    if (!recordId || !organizationId) {
      console.log('[usePodcastStatus] Missing recordId or organizationId, aborting');
      setIsLoading(false);
      return false;
    }
    
    try {
      console.log(`[usePodcastStatus] Checking status for podcastId: ${recordId}`);
      setIsLoading(true);
      
      // Ensure we're sending properly formatted JSON
      const payload = JSON.stringify({ 
        recordId, 
        organizationId,
        timestamp: new Date().toISOString() // Add timestamp to prevent caching
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
      
      // Handle error response
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Update state with response data
      setStatus(data.status);
      setIsLoading(false);
      
      if (data.progress !== undefined) {
        setProgress(data.progress);
        console.log(`[usePodcastStatus] Updated progress: ${data.progress}`);
      }
      
      if (data.status === 'completed' && data.audioUrl) {
        console.log(`[usePodcastStatus] Podcast completed with audioUrl: ${data.audioUrl}`);
        setAudioUrl(data.audioUrl);
        
        if (skipPolling) {
          setStopPolling(true);
        }
        
        return true; // Status checking complete
      }
      
      // One-time operation completed
      if (data.oneTimeOperation) {
        console.log(`[usePodcastStatus] One-time operation completed, stopping polling`);
        setStopPolling(true);
        return true;
      }
      
      return false; // Continue checking
    } catch (error) {
      console.error('[usePodcastStatus] Error checking podcast status:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
      return false;
    }
  }, [recordId, organizationId]);
  
  // Manual refetch function that can be called by components
  const refetch = useCallback(async () => {
    console.log(`[usePodcastStatus] Manual refetch triggered`);
    // Pass true to indicate this is a manual refetch and we should stop polling afterward
    return checkStatus(true);
  }, [checkStatus]);
  
  useEffect(() => {
    if (!recordId || !organizationId) {
      console.log('[usePodcastStatus] Missing recordId or organizationId, aborting');
      setIsLoading(false);
      return;
    }
    
    console.log(`[usePodcastStatus] Setting up status polling for podcastId: ${recordId}`);
    
    // Initial check
    console.log(`[usePodcastStatus] Performing initial status check`);
    checkStatus();
    
    // Set up polling only if not explicitly stopped
    if (stopPolling) {
      console.log(`[usePodcastStatus] Polling disabled by user action`);
      return;
    }
    
    console.log(`[usePodcastStatus] Setting up polling interval: ${pollInterval}ms`);
    const intervalId = setInterval(async () => {
      // Don't poll if stopPolling is true
      if (stopPolling) {
        console.log(`[usePodcastStatus] Stopping polling based on user action`);
        clearInterval(intervalId);
        return;
      }
      
      console.log(`[usePodcastStatus] Polling for status update`);
      const isDone = await checkStatus();
      if (isDone) {
        console.log(`[usePodcastStatus] Polling complete, clearing interval`);
        clearInterval(intervalId);
      }
    }, pollInterval);
    
    // Clean up interval on unmount
    return () => {
      console.log(`[usePodcastStatus] Cleaning up - clearing interval`);
      clearInterval(intervalId);
    };
  }, [recordId, organizationId, pollInterval, checkStatus, stopPolling]);
  
  return { status, audioUrl, progress, error, isLoading, refetch };
} 