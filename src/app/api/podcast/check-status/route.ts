import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
import { PodcastService, PodcastError } from '@/lib/services/podcast.service';

/**
 * API endpoint for checking podcast generation status
 * Particularly useful for conversation podcasts that process asynchronously
 */
export async function POST(req: NextRequest) {
  console.log('[Podcast] Checking podcast status');
  try {
    const { recordId, organizationId } = await req.json();
    
    if (!recordId || !organizationId) {
      return NextResponse.json({ error: 'Record ID and organization ID are required' }, { status: 400 });
    }
    
    console.log(`[Podcast] Checking status for record ${recordId}`);
    
    // Get record
    const record = await PodcastService.getPodcastRecord(recordId);
    
    // Return current status if already completed or failed, or if not a conversation podcast
    if (record.status === 'completed' || record.status === 'failed') {
      return NextResponse.json({ 
        status: record.status,
        audioUrl: record.audio_url,
        errorMessage: record.error_message
      });
    }
    
    // Return immediately if no project ID for conversation format
    if (record.format === 'conversation' && !record.elevenlabs_project_id) {
      return NextResponse.json({ 
        status: 'processing',
        progress: 0,
        message: 'Conversation podcast is being initialized'
      });
    }
    
    // Get API key
    console.log(`[Podcast] Fetching organization API key`);
    const apiKey = await PodcastService.getOrganizationApiKey(organizationId);
    
    // For conversation podcasts with project IDs, check status with ElevenLabs
    if (record.format === 'conversation' && record.elevenlabs_project_id) {
      console.log(`[Podcast] Checking conversation podcast status with project ID ${record.elevenlabs_project_id}`);
      
      const projectStatus = await PodcastService.checkPodcastProjectStatus(
        record.elevenlabs_project_id,
        apiKey
      );
      
      console.log(`[Podcast] Project status:`, projectStatus);
      
      // If done, update the record and return success
      if (projectStatus.status === 'done' && projectStatus.audioUrl) {
        console.log(`[Podcast] Conversation podcast completed, updating with URL: ${projectStatus.audioUrl}`);
        await PodcastService.updateRecordWithSuccess(record.id!, projectStatus.audioUrl);
        
        return NextResponse.json({
          status: 'completed',
          audioUrl: projectStatus.audioUrl,
          progress: 1
        });
      }
      
      // If failed, update the record and return failure
      if (projectStatus.status === 'failed') {
        console.log(`[Podcast] Conversation podcast failed: ${projectStatus.errorMessage}`);
        await PodcastService.updateRecordWithFailure(
          record.id!,
          projectStatus.errorMessage || 'Unknown error in podcast generation'
        );
        
        return NextResponse.json({
          status: 'failed',
          errorMessage: projectStatus.errorMessage
        });
      }
      
      // Otherwise return processing status
      return NextResponse.json({
        status: 'processing',
        progress: projectStatus.progress
      });
    }
    
    // For single voice podcasts that are stuck in processing
    return NextResponse.json({
      status: record.status,
      message: `Podcast ${record.id} is in ${record.status} state`
    });
  } catch (error) {
    console.error('[Podcast] Error checking status:', error);
    return NextResponse.json({ 
      error: error instanceof PodcastError ? error.message : 'Error checking podcast status',
      details: error instanceof PodcastError ? error.details : undefined
    }, { status: 500 });
  }
} 