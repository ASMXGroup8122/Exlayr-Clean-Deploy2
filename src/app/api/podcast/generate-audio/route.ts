import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
import { 
  PodcastService, 
  PodcastError, 
  streamToBuffer, 
  PodcastGenerationParams,
  PodcastRecord
} from '@/lib/services/podcast.service';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * POST endpoint for generating podcast audio
 * Accepts either single voice or conversation podcast formats
 * Creates a record in podcast_audio_generations table
 */
export async function POST(req: NextRequest) {
  console.log('-------------------------------------------------------------');
  console.log('[Podcast] Starting podcast audio generation process');
  try {
    // Parse request body
    const body = await req.json();
    const {
      script,
      voiceId,
      hostVoiceId,
      guestVoiceId,
      organizationId,
      title = "Untitled Podcast",
      podcastFormat,
    } = body;

    console.log(`[Podcast] Received request for ${podcastFormat} podcast`);
    console.log(`[Podcast] Organization ID: ${organizationId}`);
    console.log(`[Podcast] Title: ${title}`);
    
    // Validate required parameters
    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    
    if (podcastFormat === 'single' && !voiceId) {
      return NextResponse.json({ error: 'Voice ID is required for single voice podcast' }, { status: 400 });
    }
    
    if (podcastFormat === 'conversation' && (!hostVoiceId || !guestVoiceId)) {
      return NextResponse.json({ 
        error: 'Host voice ID and guest voice ID are required for conversation podcast' 
      }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    // Get the ElevenLabs API key from organization_settings
    console.log(`[Podcast] Fetching ElevenLabs API key for organization ${organizationId}`);
    const { data: settingsData, error: settingsError } = await supabase
      .from('organization_settings')
      .select('elevenlabs_api_key')
      .eq('organization_id', organizationId)
      .maybeSingle();
    
    if (settingsError) {
      console.error('[Podcast] Error fetching ElevenLabs API key:', settingsError);
      return NextResponse.json({ 
        error: 'Failed to retrieve ElevenLabs API key',
        details: settingsError.message
      }, { status: 500 });
    }
    
    if (!settingsData?.elevenlabs_api_key) {
      console.error('[Podcast] ElevenLabs API key not found for organization');
      return NextResponse.json({ 
        error: 'ElevenLabs API key not configured for this organization' 
      }, { status: 400 });
    }
    
    const apiKey = settingsData.elevenlabs_api_key;
    
    // Create a record in podcast_audio_generations table first to get an ID
    console.log('[Podcast] Creating initial record in podcast_audio_generations');
    const { data: recordData, error: recordError } = await supabase
      .from('podcast_audio_generations')
      .insert({
        organization_id: organizationId,
        title: title,
        script_text: script,
        status: 'processing',
        voice_id: podcastFormat === 'single' ? voiceId : hostVoiceId,
        guest_voice_id: podcastFormat === 'conversation' ? guestVoiceId : null,
        format: podcastFormat,
      })
      .select()
      .single();
    
    if (recordError) {
      console.error('[Podcast] Error creating record:', recordError);
      return NextResponse.json({ 
        error: 'Failed to create podcast record',
        details: recordError.message
      }, { status: 500 });
    }
    
    const recordId = recordData.id;
    console.log(`[Podcast] Created record with ID: ${recordId}`);
    
    if (podcastFormat === 'single') {
      // Handle single voice podcast (synchronous generation)
      await handleSingleVoiceGeneration(apiKey, script, voiceId, recordId, title, organizationId);
      
      return NextResponse.json({ 
        message: 'Single voice podcast audio generation complete',
        podcastId: recordId
      });
    } else {
      // Handle conversation podcast using Studio API
      await handleConversationGeneration(apiKey, script, hostVoiceId, guestVoiceId, recordId, title);
      
      return NextResponse.json({ 
        message: 'Conversation podcast generation started and will be processed asynchronously',
        podcastId: recordId
      });
    }
  } catch (error) {
    console.error('[Podcast] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * Handle single voice podcast generation using ElevenLabs API
 * This is a synchronous operation that returns the audio URL
 */
async function handleSingleVoiceGeneration(
  apiKey: string,
  script: string,
  voiceId: string,
  recordId: string,
  title: string,
  organizationId: string
): Promise<void> {
  console.log(`[Podcast] Starting single voice generation for voice ${voiceId}`);
  
  // Initialize ElevenLabs client and generate audio
  try {
    console.log(`[Podcast] Initializing ElevenLabs client`);
    const elevenClient = new ElevenLabsClient({ apiKey });

    console.log(`[Podcast] Calling ElevenLabs generate API`);
    const audioStream = await elevenClient.generate({
      voice: voiceId,
      text: script,
      model_id: "eleven_multilingual_v2",
    });

    if (!audioStream) {
      throw new PodcastError('Audio stream generation failed or returned empty.', 'elevenlabs.generate');
    }
    console.log(`[Podcast] Successfully received audio stream`);

    // Convert stream to buffer
    console.log(`[Podcast] Converting audio stream to buffer`);
    const audioBuffer = await streamToBuffer(audioStream);
    console.log(`[Podcast] Audio buffer created, size: ${audioBuffer.length} bytes`);

    // Upload to storage
    console.log(`[Podcast] Uploading audio to Supabase Storage`);
    const { path, publicUrl } = await PodcastService.uploadAudioToStorage(
      organizationId, 
      audioBuffer
    );
    console.log(`[Podcast] Audio uploaded successfully, path: ${path}`);

    // Update record with success
    console.log(`[Podcast] Updating record with success status`);
    await PodcastService.updateRecordWithSuccess(recordId, publicUrl);
    console.log(`[Podcast] Record updated with audio URL`);
  } catch (error) {
    console.error(`[Podcast] Error in single voice generation: ${(error as Error).message}`, error);
    
    // Update record with failure status if we have a record ID
    if (recordId) {
      try {
        console.log(`[Podcast] Updating record ${recordId} with failure status`);
        await PodcastService.updateRecordWithFailure(
          recordId,
          error instanceof PodcastError 
            ? `${error.context}: ${error.message}` 
            : `Error: ${(error as Error).message}`
        );
      } catch (updateError) {
        console.error(`[Podcast] Failed to update record with error status:`, updateError);
      }
    }
    
    // Return appropriate error response
    if (error instanceof PodcastError) {
      throw error;
    } else {
      throw new PodcastError(
        `Failed to generate single voice podcast: ${(error as Error).message}`,
        'single_voice_generation',
        error
      );
    }
  }
}

/**
 * Handle conversation podcast generation via ElevenLabs Studio API
 */
async function handleConversationGeneration(
  apiKey: string,
  script: string,
  hostVoiceId: string,
  guestVoiceId: string,
  recordId: string,
  title: string
): Promise<void> {
  console.log(`[Podcast] Starting conversation podcast generation with ElevenLabs Studio API`);
  console.log(`[Podcast] Host Voice: ${hostVoiceId}, Guest Voice: ${guestVoiceId}`);
  
  try {
    // Make direct API call to ElevenLabs Studio API for podcast generation
    const response = await fetch('https://api.elevenlabs.io/v1/studio/podcasts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        model_id: 'eleven_monolingual_v1',
        name: title,
        mode: {
          name: 'conversation', 
          host_voice_id: hostVoiceId,
          guest_voice_id: guestVoiceId,
        },
        source: {
          type: 'text',
          text: script
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new PodcastError(
        `ElevenLabs Studio API error: ${response.status} ${response.statusText}`, 
        'handleConversationGeneration',
        { statusCode: response.status, errorText }
      );
    }
    
    const data = await response.json();
    console.log(`[Podcast] ElevenLabs Studio API response:`, data);
    
    if (!data.project || !data.project.id) {
      throw new PodcastError(
        'No project ID returned from ElevenLabs Studio API', 
        'handleConversationGeneration'
      );
    }
    
    // Store the project ID for status checking
    console.log(`[Podcast] Storing ElevenLabs project ID: ${data.project.id}`);
    await PodcastService.updateRecordWithProjectId(recordId, data.project.id);
    
    console.log(`[Podcast] Conversation podcast generation started successfully`);
  } catch (error) {
    console.error(`[Podcast] Error in conversation generation: ${(error as Error).message}`, error);
    
    // Update record with failure
    try {
      console.log(`[Podcast] Updating record ${recordId} with failure status`);
      await PodcastService.updateRecordWithFailure(
        recordId,
        error instanceof PodcastError 
          ? `${error.context}: ${error.message}` 
          : `Failed to create conversation podcast: ${(error as Error).message}`
      );
    } catch (updateError) {
      console.error(`[Podcast] Error updating failure status: ${(updateError as Error).message}`);
    }
    
    // Re-throw the error to be handled by the caller
    if (error instanceof PodcastError) {
      throw error;
    } else {
      throw new PodcastError(
        `Failed to generate conversation podcast: ${(error as Error).message}`,
        'conversation_generation',
        error
      );
    }
  }
}

/**
 * GET endpoint to check status of podcast generation
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const organization_id = searchParams.get('organization_id');
    
    if (!id && !organization_id) {
      return NextResponse.json({ error: 'Either id or organization_id is required' }, { status: 400 });
    }
    
    console.log(`[Podcast] Fetching podcast records for ${id ? `ID: ${id}` : `Organization: ${organization_id}`}`);

    if (id) {
      try {
        const record = await PodcastService.getPodcastRecord(id);
        return NextResponse.json({ data: record });
      } catch (error) {
        const podcastError = error as PodcastError;
        return NextResponse.json({ 
          error: podcastError.message,
          context: podcastError.context
        }, { status: 500 });
      }
    } else if (organization_id) {
      try {
        const records = await PodcastService.getPodcastRecords(organization_id!, 5);
        return NextResponse.json({ data: records });
      } catch (error) {
        const podcastError = error as PodcastError;
        return NextResponse.json({ 
          error: podcastError.message,
          context: podcastError.context
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('[Podcast] Error in GET endpoint:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred',
      details: error instanceof PodcastError ? error.details : undefined
    }, { status: 500 });
  }
} 