import { usePodcastStatus } from '@/hooks/usePodcastStatus';
import { ArrowDownToLine, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface PodcastPlayerProps {
  podcastId: string;
  organizationId: string;
}

export default function PodcastPlayer({ podcastId, organizationId }: PodcastPlayerProps) {
  console.log(`[PodcastPlayer] Initialized with podcastId: ${podcastId}, organizationId: ${organizationId}`);
  
  const { status, audioUrl, progress, error, isLoading, refetch } = usePodcastStatus(podcastId, organizationId);
  const [retrieving, setRetrieving] = useState(false);
  const [retrieveError, setRetrieveError] = useState<string | null>(null);
  const [retrieveSuccess, setRetrieveSuccess] = useState(false);
  const [fixAttempted, setFixAttempted] = useState(false);
  
  console.log(`[PodcastPlayer] Status: ${status}, Progress: ${progress}, Error: ${error}, Loading: ${isLoading}`);
  console.log(`[PodcastPlayer] AudioUrl: ${audioUrl || 'none'}`);
  
  // Function to manually retrieve and fix podcast audio - as a one-time operation
  const retrieveAndFixAudio = async () => {
    // Don't proceed if already retrieving or already fixed successfully
    if (retrieving || retrieveSuccess) return;
    
    setRetrieving(true);
    setRetrieveError(null);
    setRetrieveSuccess(false);
    setFixAttempted(true);
    
    try {
      console.log(`[PodcastPlayer] MANUALLY RETRIEVING podcast audio for ${podcastId}`);
      
      // Ensure we're sending properly formatted JSON with timestamp to prevent caching
      const payload = JSON.stringify({
        recordId: podcastId,
        organizationId,
        forceRetrieve: true, // This forces download regardless of current status
        timestamp: new Date().toISOString()
      });
      
      // Call the API to force download and fix - as a one-time operation
      const response = await fetch('/api/podcast/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: payload
      });
      
      if (!response.ok) {
        let errorMessage = `Failed to retrieve audio: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('[PodcastPlayer] Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      let data;
      try {
        data = await response.json();
        console.log(`[PodcastPlayer] API response:`, data);
      } catch (parseError) {
        console.error('[PodcastPlayer] Failed to parse API response:', parseError);
        throw new Error('Invalid JSON response from API');
      }
      
      // Handle error in response
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.audioUrl) {
        setRetrieveSuccess(true);
        // Use a one-time refetch after a delay rather than polling
        setTimeout(() => {
          refetch(); // Refresh to show the new audio player
        }, 1000);
      } else {
        throw new Error('No audio URL in response');
      }
    } catch (error) {
      console.error('[PodcastPlayer] Error retrieving audio:', error);
      setRetrieveError(error instanceof Error ? error.message : String(error));
      setRetrieving(false); // Ensure we clear the retrieving state on error
    }
  };
  
  // URGENT FIX BUTTON - Always displayed at the top if needed
  const fixButton = (
    <div className="my-2 p-2 bg-red-600 text-white rounded-md shadow-md">
      <button 
        onClick={retrieveAndFixAudio}
        disabled={retrieving || retrieveSuccess}
        className="w-full py-2 font-bold text-center uppercase tracking-wide"
      >
        {retrieving ? (
          <span className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            FIXING AUDIO...
          </span>
        ) : retrieveSuccess ? (
          <span className="flex items-center justify-center">
            ✅ AUDIO FIXED
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <RefreshCw className="h-5 w-5 mr-2" />
            FIX PODCAST AUDIO
          </span>
        )}
      </button>
      {retrieveError && (
        <div className="mt-2 p-2 bg-white text-red-600 rounded text-sm">
          Error: {retrieveError}
        </div>
      )}
      {retrieveSuccess && (
        <div className="mt-2 p-2 bg-green-100 text-green-800 rounded text-sm">
          Audio successfully fixed! Refreshing...
        </div>
      )}
    </div>
  );
  
  // Show loading state
  if (isLoading && !audioUrl) {
    return (
      <div>
        {fixButton}
        <div className="space-y-4 mt-4">
          <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md"></div>
          <div className="h-20 w-full bg-gray-200 animate-pulse rounded-md"></div>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div>
        {fixButton}
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded my-4">
          Error checking podcast status: {error}
        </div>
      </div>
    );
  }
  
  // Show processing state with progress bar
  if (status === 'processing') {
    return (
      <div>
        {fixButton}
        <div className="podcast-processing space-y-3 my-4 p-4 bg-gray-50 rounded-md">
          <div className="flex items-center gap-2 text-amber-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm font-medium">Your podcast is being generated...</p>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${Math.max(5, Math.round(progress * 100))}%` }}
            ></div>
          </div>
          
          <p className="text-xs text-gray-500">
            {Math.round(progress * 100)}% complete. ElevenLabs is processing your conversation podcast.
          </p>
        </div>
      </div>
    );
  }
  
  // Show retrieving state (when manually retrieving)
  if (retrieving) {
    return (
      <div className="podcast-retrieving space-y-3 my-4 p-4 bg-blue-100 border border-blue-300 rounded-md">
        <div className="flex items-center gap-2 text-blue-800 font-bold">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>FIXING PODCAST AUDIO...</p>
        </div>
        <p className="text-sm text-blue-700">
          Downloading from ElevenLabs, storing in database, and updating URL...
        </p>
      </div>
    );
  }
  
  // Show failed state
  if (status === 'failed') {
    return (
      <div>
        {fixButton}
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded my-4">
          Podcast generation failed. Please try again.
        </div>
      </div>
    );
  }
  
  // Show completed state with audio player
  if (status === 'completed' && audioUrl) {
    const hasInsecureUrl = audioUrl.includes('api.elevenlabs.io') || audioUrl.includes('{history_item_id}');
    
    return (
      <div>
        {hasInsecureUrl ? fixButton : null}
        <div className="podcast-player space-y-3 my-4 p-4 bg-gray-50 rounded-md">
          {hasInsecureUrl ? (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
              <p className="font-bold">WARNING: Insecure URL detected</p>
              <p className="text-sm">This podcast has an insecure URL with an API key. Please use the FIX button above.</p>
            </div>
          ) : (
            <p className="text-sm font-medium text-emerald-600">Your podcast is ready!</p>
          )}
          
          <audio 
            controls 
            src={audioUrl}
            className="w-full"
          >
            Your browser does not support the audio element.
          </audio>
          
          <div className="flex justify-end">
            <a 
              href={audioUrl} 
              download 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              Download
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // Show missing audio state
  if (status === 'completed' && !audioUrl) {
    return (
      <div>
        {fixButton}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4">
          <p className="font-bold">Missing Audio URL</p>
          <p className="text-sm">This podcast is marked as completed but has no audio URL. Use the FIX button above.</p>
        </div>
      </div>
    );
  }
  
  // Fallback for unexpected state
  return (
    <div>
      {fixButton}
      <div className="my-4 p-4 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-500">Loading podcast information...</p>
      </div>
    </div>
  );
} 