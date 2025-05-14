import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
import { 
  PodcastService, 
  PodcastError, 
  streamToBuffer, 
  PodcastGenerationParams,
  PodcastRecord
} from '@/lib/services/podcast.service';

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
      podcastFormat,
      organizationId,
      title,
    } = body;

    console.log(`[Podcast] Processing ${podcastFormat} format request for organization ${organizationId}`);
    console.log(`[Podcast] Script length: ${script?.length || 0} chars, Title: ${title || 'Untitled'}`);

    // Parameter validation
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!podcastFormat || (podcastFormat !== 'single' && podcastFormat !== 'conversation')) {
      return NextResponse.json({ error: 'Valid podcastFormat (single or conversation) is required' }, { status: 400 });
    }
    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }
    
    // Format-specific validation
    if (podcastFormat === 'single' && !voiceId) {
      return NextResponse.json({ error: 'Voice ID is required for single voice podcast' }, { status: 400 });
    }
    if (podcastFormat === 'conversation') {
      const actualHostVoiceId = hostVoiceId || voiceId;
      if (!actualHostVoiceId) {
        return NextResponse.json({ error: 'Host Voice ID is required for conversation podcast' }, { status: 400 });
      }
      if (!guestVoiceId) {
        return NextResponse.json({ error: 'Guest Voice ID is required for conversation podcast' }, { status: 400 });
      }
    }

    // Get ElevenLabs API key from organization settings
    let elevenLabsApiKey: string;
    try {
      console.log(`[Podcast] Fetching organization API key`);
      elevenLabsApiKey = await PodcastService.getOrganizationApiKey(organizationId);
    } catch (error) {
      const podcastError = error as PodcastError;
      console.error(`[Podcast] API key error: ${podcastError.message}`, podcastError.details);
      return NextResponse.json({ 
        error: podcastError.message,
        context: podcastError.context 
      }, { status: 500 });
    }

    // Process based on podcast format
    if (podcastFormat === 'single') {
      return await handleSingleVoiceGeneration({
        script,
        voiceId,
        organizationId,
        title: title || 'Untitled Podcast',
        podcastFormat: 'single'
      }, elevenLabsApiKey);
    } else if (podcastFormat === 'conversation') {
      return await handleConversationGeneration({
        script,
        voiceId: hostVoiceId || voiceId,
        hostVoiceId: hostVoiceId || voiceId,
        guestVoiceId,
        organizationId,
        title: title || 'Untitled Conversation Podcast',
        podcastFormat: 'conversation'
      }, elevenLabsApiKey);
    }

    return NextResponse.json({ error: 'Invalid podcast format' }, { status: 400 });
  } catch (error: any) {
    console.error('[Podcast] Unhandled error in podcast generation:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred',
      details: error instanceof PodcastError ? error.details : undefined
    }, { status: 500 });
  }
}

/**
 * Handle single voice podcast generation
 */
async function handleSingleVoiceGeneration(
  params: PodcastGenerationParams,
  apiKey: string
): Promise<NextResponse> {
  console.log(`[Podcast] Starting single voice generation for voice ${params.voiceId}`);
  
  // Create initial record
  let podcastRecord: PodcastRecord;
  try {
    podcastRecord = await PodcastService.createProcessingRecord(params);
    console.log(`[Podcast] Created initial record with ID: ${podcastRecord.id}`);
  } catch (error) {
    const podcastError = error as PodcastError;
    console.error(`[Podcast] Database error: ${podcastError.message}`, podcastError.details);
    return NextResponse.json({ 
      error: podcastError.message,
      context: podcastError.context
    }, { status: 500 });
  }

  // Initialize ElevenLabs client and generate audio
  try {
    console.log(`[Podcast] Initializing ElevenLabs client`);
    const elevenClient = new ElevenLabsClient({ apiKey });

    console.log(`[Podcast] Calling ElevenLabs generate API`);
    const audioStream = await elevenClient.generate({
      voice: params.voiceId,
      text: params.script,
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
      params.organizationId, 
      audioBuffer
    );
    console.log(`[Podcast] Audio uploaded successfully, path: ${path}`);

    // Update record with success
    console.log(`[Podcast] Updating record with success status`);
    await PodcastService.updateRecordWithSuccess(podcastRecord.id!, publicUrl);
    console.log(`[Podcast] Record updated with audio URL`);

    return NextResponse.json({ 
      message: 'Single voice podcast audio generated and saved successfully.', 
      audioUrl: publicUrl,
      path: path,
      id: podcastRecord.id
    });
  } catch (error) {
    console.error(`[Podcast] Error in single voice generation: ${(error as Error).message}`, error);
    
    // Update record with failure status if we have a record ID
    if (podcastRecord?.id) {
      try {
        console.log(`[Podcast] Updating record ${podcastRecord.id} with failure status`);
        await PodcastService.updateRecordWithFailure(
          podcastRecord.id,
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
      return NextResponse.json({ 
        error: error.message,
        context: error.context,
        details: error.details
      }, { status: 500 });
    } else {
      return NextResponse.json({ 
        error: `Failed to generate single voice podcast: ${(error as Error).message}`,
        details: error
      }, { status: 500 });
    }
  }
}

/**
 * Handle conversation podcast generation via ElevenLabs Studio API
 */
async function handleConversationGeneration(
  params: PodcastGenerationParams,
  apiKey: string
): Promise<NextResponse> {
  console.log(`[Podcast] Starting conversation generation with host voice ${params.hostVoiceId} and guest voice ${params.guestVoiceId}`);
  
  // Create initial record
  let podcastRecord: PodcastRecord;
  try {
    podcastRecord = await PodcastService.createProcessingRecord(params);
    console.log(`[Podcast] Created initial record with ID: ${podcastRecord.id}`);
  } catch (error) {
    const podcastError = error as PodcastError;
    console.error(`[Podcast] Database error: ${podcastError.message}`, podcastError.details);
    return NextResponse.json({ 
      error: podcastError.message,
      context: podcastError.context
    }, { status: 500 });
  }

  // Call ElevenLabs Studio API for conversation
  try {
    // Studio API model ID for podcast
    const podcastModelId = "21m00Tcm4TlvDq8ikWAM";
    
    // Prepare request body
    const requestBody = {
      model_id: podcastModelId,
      name: params.title,
      mode: {
        type: "conversation",
        conversation: {
          host_voice_id: params.hostVoiceId!,
          guest_voice_id: params.guestVoiceId!,
        }
      },
      source: {
        text: params.script,
      }
    };

    console.log(`[Podcast] Calling ElevenLabs Studio API`);
    const studioResponse = await fetch("https://api.elevenlabs.io/v1/studio/podcasts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[Podcast] Studio API response status: ${studioResponse.status}`);
    if (!studioResponse.ok) {
      const errorBody = await studioResponse.text();
      console.error(`[Podcast] Studio API error (${studioResponse.status}):`, errorBody);
      
      // Try to parse error body as JSON
      try {
        const parsedError = JSON.parse(errorBody);
        throw new PodcastError(
          parsedError.detail || `ElevenLabs Studio API error (${studioResponse.status})`, 
          'elevenlabs.studio',
          parsedError
        );
      } catch (e) {
        throw new PodcastError(
          `ElevenLabs Studio API error (${studioResponse.status}): ${errorBody}`,
          'elevenlabs.studio',
          { rawError: errorBody }
        );
      }
    }

    // Parse successful response
    const responseData = await studioResponse.json();
    console.log(`[Podcast] Studio API response received`);
    
    const projectId = responseData.project?.project_id;
    if (!projectId) {
      throw new PodcastError(
        'ElevenLabs Studio API response did not include a project_id',
        'elevenlabs.studio.projectId',
        responseData
      );
    }
    
    console.log(`[Podcast] Studio project created, project_id: ${projectId}`);

    // Update record with project ID
    await PodcastService.updateRecordWithProjectId(podcastRecord.id!, projectId);
    console.log(`[Podcast] Record updated with project ID`);

    return NextResponse.json({ 
      message: 'Conversation podcast project created successfully. Audio is being processed.',
      elevenlabs_project_id: projectId,
      status: 'processing',
      id: podcastRecord.id
    });
  } catch (error) {
    console.error(`[Podcast] Error in conversation generation: ${(error as Error).message}`, error);
    
    // Update record with failure status if we have a record ID
    if (podcastRecord?.id) {
      try {
        console.log(`[Podcast] Updating record ${podcastRecord.id} with failure status`);
        await PodcastService.updateRecordWithFailure(
          podcastRecord.id,
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
      return NextResponse.json({ 
        error: error.message,
        context: error.context,
        details: error.details
      }, { status: 500 });
    } else {
      return NextResponse.json({ 
        error: `Failed to create conversation podcast: ${(error as Error).message}`,
        details: error
      }, { status: 500 });
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