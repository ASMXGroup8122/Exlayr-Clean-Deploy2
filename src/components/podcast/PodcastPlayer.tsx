import { usePodcastStatus } from '@/hooks/usePodcastStatus';
import { ArrowDownToLine, Loader2 } from 'lucide-react';

interface PodcastPlayerProps {
  podcastId: string;
  organizationId: string;
}

export default function PodcastPlayer({ podcastId, organizationId }: PodcastPlayerProps) {
  const { status, audioUrl, progress, error, isLoading } = usePodcastStatus(podcastId, organizationId);
  
  // Show loading state
  if (isLoading && !audioUrl) {
    return (
      <div className="space-y-4 mt-4">
        <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-20 w-full bg-gray-200 animate-pulse rounded-md"></div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded my-4">
        Error checking podcast status: {error}
      </div>
    );
  }
  
  // Show processing state with progress bar
  if (status === 'processing') {
    return (
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
    );
  }
  
  // Show failed state
  if (status === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded my-4">
        Podcast generation failed. Please try again.
      </div>
    );
  }
  
  // Show completed state with audio player
  if (status === 'completed' && audioUrl) {
    return (
      <div className="podcast-player space-y-3 my-4 p-4 bg-gray-50 rounded-md">
        <p className="text-sm font-medium text-emerald-600">Your podcast is ready!</p>
        
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
    );
  }
  
  // Fallback for unexpected state
  return (
    <div className="my-4 p-4 bg-gray-50 rounded-md">
      <p className="text-sm text-gray-500">Loading podcast information...</p>
    </div>
  );
} 