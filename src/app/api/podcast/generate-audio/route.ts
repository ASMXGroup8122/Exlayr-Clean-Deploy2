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
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize Supabase admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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

    // Use regular supabase client for fetching API key since this doesn't need admin privileges
    const supabase = getSupabaseClient();
    
    // Get the ElevenLabs API key from oauth_tokens first, then from organization_settings
    console.log(`[Podcast] Fetching ElevenLabs API key for organization ${organizationId}`);
    
    let apiKey;
    try {
      // Use the PodcastService method that already handles checking both sources
      apiKey = await PodcastService.getOrganizationApiKey(organizationId);
      console.log(`[Podcast] Successfully retrieved API key`);
    } catch (error) {
      console.error('[Podcast] Error fetching ElevenLabs API key:', error);
      return NextResponse.json({ 
        error: error instanceof PodcastError ? error.message : 'Failed to retrieve ElevenLabs API key',
        details: error instanceof PodcastError ? error.details : (error instanceof Error ? error.message : undefined)
      }, { status: 400 });
    }
    
    // Create a record in podcast_audio_generations table first to get an ID
    // Use supabaseAdmin to bypass RLS policies
    console.log('[Podcast] Creating initial record in podcast_audio_generations');
    const { data: recordData, error: recordError } = await supabaseAdmin
      .from('podcast_audio_generations')
      .insert({
        organization_id: organizationId,
        title: title,
        description: script,
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
      // Handle single voice podcast generation (synchronous generation)
      await handleSingleVoiceGeneration(apiKey, script, voiceId, recordId, title, organizationId, supabaseAdmin);
      
      return NextResponse.json({ 
        message: 'Single voice podcast audio generation complete',
        podcastId: recordId
      });
    } else {
      // Handle conversation podcast generation via ElevenLabs Studio API
      await handleConversationGeneration(apiKey, script, hostVoiceId, guestVoiceId, recordId, title, supabaseAdmin);
      
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
  organizationId: string,
  adminClient: any
): Promise<void> {
  console.log(`[Podcast] Starting single voice generation for voice ${voiceId}`);
  
  // Initialize ElevenLabs client and generate audio
  try {
    console.log(`[Podcast] Initializing ElevenLabs client`);
    const elevenClient = new ElevenLabsClient({ apiKey });

    console.log(`[Podcast] Calling ElevenLabs generate API`);
    const audioStreamPromise = elevenClient.generate({
      voice: voiceId,
      text: script,
      model_id: "eleven_multilingual_v2",
    });
    
    // Set a timeout promise to cancel if it takes too long
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        reject(new Error('ElevenLabs API call timed out after 10 minutes'));
      }, 600000); // 10 minutes timeout (increased from 3 minutes)
    });
    
    try {
      // Race between the actual API call and the timeout
      const audioStream = await Promise.race([audioStreamPromise, timeoutPromise]);
  
      if (!audioStream) {
        throw new PodcastError('Audio stream generation failed or returned empty.', 'elevenlabs.generate');
      }
      console.log(`[Podcast] Successfully received audio stream`);
  
      // Convert stream to buffer
      console.log(`[Podcast] Converting audio stream to buffer`);
      const audioBuffer = await streamToBuffer(audioStream);
      console.log(`[Podcast] Audio buffer created, size: ${audioBuffer.length} bytes`);
  
      // Upload to storage - use admin client for storage operations
      console.log(`[Podcast] Uploading audio to Supabase Storage`);
      
      // Use admin client for storage upload
      const audioFileName = `podcast_audio_${crypto.randomUUID()}.mp3`;
      const filePath = `${organizationId}/${audioFileName}`;
      
      const { data: uploadData, error: uploadError } = await adminClient.storage
        .from('podcast_audio')
        .upload(filePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false,
        });
        
      if (uploadError) {
        throw new PodcastError(
          `Failed to upload audio to storage: ${uploadError.message}`,
          'uploadAudioToStorage',
          uploadError
        );
      }
      
      const { data: publicUrlData } = adminClient.storage
        .from('podcast_audio')
        .getPublicUrl(uploadData.path);
        
      if (!publicUrlData?.publicUrl) {
        throw new PodcastError(
          'Failed to generate public URL for uploaded audio',
          'uploadAudioToStorage'
        );
      }
      
      const publicUrl = publicUrlData.publicUrl;
      console.log(`[Podcast] Audio uploaded successfully, path: ${uploadData.path}`);
  
      // Update record with success - use admin client for database update
      console.log(`[Podcast] Updating record with success status`);
      const { error: updateError } = await adminClient
        .from('podcast_audio_generations')
        .update({
          status: 'completed',
          audio_url: publicUrl
        })
        .eq('id', recordId);
        
      if (updateError) {
        throw new PodcastError(
          `Failed to update podcast record with success: ${updateError.message}`,
          'updateRecordWithSuccess',
          updateError
        );
      }
      
      console.log(`[Podcast] Record updated with audio URL`);
    } catch (error) {
      // If it's a timeout error, we'll move the podcast to use the asynchronous flow
      if ((error as Error).message && (error as Error).message.includes('timed out')) {
        console.log(`[Podcast] API call timed out - switching to async processing mode`);
        
        try {
          // Switch to conversation mode (async) for longer scripts
          console.log(`[Podcast] Creating ElevenLabs project for async processing`);
          
          // Make a call to create a project for asynchronous processing
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
                name: 'single', 
                voice_id: voiceId
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
              'single_voice_fallback',
              { statusCode: response.status, errorText }
            );
          }
          
          const data = await response.json();
          
          if (!data.project || !data.project.id) {
            throw new PodcastError(
              'No project ID returned from ElevenLabs Studio API', 
              'single_voice_fallback'
            );
          }
          
          // Update the record with the project ID
          const { error: updateError } = await adminClient
            .from('podcast_audio_generations')
            .update({
              elevenlabs_project_id: data.project.id,
              status: 'processing'
            })
            .eq('id', recordId);
            
            console.log(`[Podcast] Successfully created async project with ID: ${data.project.id}`);
            
            if (updateError) {
              console.error(`[Podcast] Failed to update record with project ID: ${updateError.message}`);
            }
            
            // Now the check-status endpoint will handle completing this
            console.log(`[Podcast] Podcast will be processed asynchronously`);
            return;
        } catch (asyncError) {
          console.error(`[Podcast] Error setting up async processing: ${(asyncError as Error).message}`);
          throw asyncError;
        }
      } else {
        // It's a non-timeout error, rethrow it
        throw error;
      }
    }
  } catch (error) {
    console.error(`[Podcast] Error in single voice generation: ${(error as Error).message}`, error);
    
    // Update record with failure status if we have a record ID - use admin client
    if (recordId) {
      try {
        console.log(`[Podcast] Updating record ${recordId} with failure status`);
        
        const { error: updateError } = await adminClient
          .from('podcast_audio_generations')
          .update({
            status: 'failed',
            description: error instanceof PodcastError 
              ? `${error.context}: ${error.message}` 
              : `Error: ${(error as Error).message}`
          })
          .eq('id', recordId);
          
        if (updateError) {
          console.error(`[Podcast] Failed to update record with error status:`, updateError);
        }
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
  title: string,
  adminClient: any
): Promise<void> {
  console.log(`[Podcast] Starting conversation podcast generation with ElevenLabs Studio API`);
  console.log(`[Podcast] Host Voice: ${hostVoiceId}, Guest Voice: ${guestVoiceId}`);
  
  try {
    // Make direct API call to ElevenLabs Studio API for podcast generation
    console.log(`[Podcast] Making request to ElevenLabs Studio API for conversation podcast`);
    
    // Create promise for the fetch call
    const fetchPromise = fetch('https://api.elevenlabs.io/v1/studio/podcasts', {
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
    
    // Set a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        reject(new Error('ElevenLabs Studio API call timed out after 10 minutes'));
      }, 600000); // 10 minutes timeout (increased from 3 minutes)
    });
    
    // Race between the fetch call and the timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);

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
    
    // Store the project ID for status checking - use admin client
    console.log(`[Podcast] Storing ElevenLabs project ID: ${data.project.id}`);
    
    const { error: updateError } = await adminClient
      .from('podcast_audio_generations')
      .update({
        elevenlabs_project_id: data.project.id
      })
      .eq('id', recordId);
      
    if (updateError) {
      throw new PodcastError(
        `Failed to update podcast record with project ID: ${updateError.message}`,
        'updateRecordWithProjectId',
        updateError
      );
    }
    
    console.log(`[Podcast] Conversation podcast generation started successfully`);
  } catch (error) {
    console.error(`[Podcast] Error in conversation generation: ${(error as Error).message}`, error);
    
    // Update record with failure - use admin client
    try {
      console.log(`[Podcast] Updating record ${recordId} with failure status`);
      
      const { error: updateError } = await adminClient
        .from('podcast_audio_generations')
        .update({
          status: 'failed',
          description: error instanceof PodcastError 
            ? `${error.context}: ${error.message}` 
            : `Failed to create conversation podcast: ${(error as Error).message}`
        })
        .eq('id', recordId);
        
      if (updateError) {
        console.error(`[Podcast] Error updating failure status: ${updateError.message}`);
      }
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

    // Use admin client to bypass RLS for reads as well
    if (id) {
      try {
        const { data: record, error } = await supabaseAdmin
          .from('podcast_audio_generations')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) {
          throw new PodcastError(
            `Failed to fetch podcast record: ${error.message}`,
            'getPodcastRecord',
            error
          );
        }
        
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
        const { data: records, error } = await supabaseAdmin
          .from('podcast_audio_generations')
          .select('*')
          .eq('organization_id', organization_id!)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (error) {
          throw new PodcastError(
            `Failed to fetch podcast records: ${error.message}`,
            'getPodcastRecords',
            error
          );
        }
        
        return NextResponse.json({ data: records || [] });
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