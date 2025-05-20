import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
import { 
  PodcastService, 
  PodcastError, 
  streamToBuffer, 
  nodeStreamToBuffer,
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
      voiceId,
      hostVoiceId,
      guestVoiceId,
      organizationId,
      title = "Untitled Podcast",
      podcastFormat,
      sourceType,
      sourceValue,
      script,
    } = body;

    console.log(`[Podcast] Received request for ${podcastFormat} podcast`);
    console.log(`[Podcast] Organization ID: ${organizationId}`);
    console.log(`[Podcast] Title: ${title}`);
    if (podcastFormat === 'conversation') {
      console.log(`[Podcast] Conversation Source Type: ${sourceType}`);
      if (sourceType === 'url') {
        console.log(`[Podcast] Conversation Source Value (URL): ${sourceValue}`);
      }
    } else {
      console.log(`[Podcast] Single voice script: provided (length: ${script?.length || 0})`);
    }
    
    // Validate required parameters
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    
    let descriptionForDb = "";

    if (podcastFormat === 'single') {
      if (!script) {
        return NextResponse.json({ error: 'Script is required for single voice podcast' }, { status: 400 });
      }
      if (!voiceId) {
        return NextResponse.json({ error: 'Voice ID is required for single voice podcast' }, { status: 400 });
      }
      descriptionForDb = script;
    } else if (podcastFormat === 'conversation') {
      if (!hostVoiceId || !guestVoiceId) {
        return NextResponse.json({ 
          error: 'Host voice ID and guest voice ID are required for conversation podcast' 
        }, { status: 400 });
      }
      if (!sourceType || !sourceValue) {
        return NextResponse.json({ error: 'Source type and source value are required for conversation podcast' }, { status: 400 });
      }
      if (!['url', 'file', 'text'].includes(sourceType)) {
        return NextResponse.json({ error: 'Invalid source type for conversation podcast. Must be url, file, or text.' }, { status: 400 });
      }
      if (sourceType === 'url') {
        descriptionForDb = sourceValue;
      } else {
        descriptionForDb = sourceValue;
      }
    } else {
      return NextResponse.json({ error: 'Invalid podcast format specified.' }, { status: 400 });
    }

    // Use regular supabase client for fetching API key since this doesn't need admin privileges
    // const supabase = getSupabaseClient(); // Not used directly here, PodcastService handles it
    
    // Get the ElevenLabs API key
    console.log(`[Podcast] Fetching ElevenLabs API key for organization ${organizationId}`);
    let apiKey;
    try {
      apiKey = await PodcastService.getOrganizationApiKey(organizationId);
      console.log(`[Podcast] Successfully retrieved API key`);
    } catch (error) {
      console.error('[Podcast] Error fetching ElevenLabs API key:', error);
      return NextResponse.json({ 
        error: error instanceof PodcastError ? error.message : 'Failed to retrieve ElevenLabs API key',
        details: error instanceof PodcastError ? error.details : (error instanceof Error ? error.message : undefined)
      }, { status: 400 });
    }
    
    console.log('[Podcast] Creating initial record in podcast_audio_generations');
    const { data: recordData, error: recordError } = await supabaseAdmin
      .from('podcast_audio_generations')
      .insert({
        organization_id: organizationId,
        title: title,
        description: descriptionForDb,
        status: 'processing',
        voice_id: podcastFormat === 'single' ? voiceId : hostVoiceId,
        guest_voice_id: podcastFormat === 'conversation' ? guestVoiceId : null,
        format: podcastFormat,
        source_type: podcastFormat === 'conversation' ? sourceType : null,
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
      handleSingleVoiceGeneration(apiKey, script, voiceId, recordId, title, organizationId, supabaseAdmin);
      
      return NextResponse.json({ 
        message: 'Single voice podcast generation initiated and will be processed asynchronously.',
        podcastId: recordId
      });
    } else {
      handleConversationGeneration(apiKey, sourceType, sourceValue, hostVoiceId, guestVoiceId, recordId, title, organizationId, supabaseAdmin);
      
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
  console.log(`[Podcast] API Route: Initiating single voice generation for record ${recordId}.`);
  
  try {
    const elevenClient = new ElevenLabsClient({ apiKey });

    // Fire-and-forget the ElevenLabs generation process.
    (async () => {
      try {
        console.log(`[Podcast] Background: Sending command to ElevenLabs to generate audio for record ${recordId}`);
        // Only initiate the call. Do not await the stream or process it here.
        // Attach a catch to this specific promise to handle immediate rejection from ElevenLabs API.
        elevenClient.generate({
      voice: voiceId,
      text: script,
      model_id: "eleven_multilingual_v2",
        }).catch(async (initiationError) => {
          // This catch is for errors if ElevenLabs immediately rejects the generation request (e.g., bad voice_id, quota issue).
          console.error(`[Podcast] Background: ElevenLabs generate() call immediately failed for record ${recordId}:`, initiationError);
          try {
            await adminClient
              .from('podcast_audio_generations')
              .update({
                status: 'failed',
                error_message: `ElevenLabs Initiation Error: ${(initiationError as Error).message}`
              })
              .eq('id', recordId);
            console.log(`[Podcast] Background: Record ${recordId} marked as 'failed' due to ElevenLabs initiation error.`);
          } catch (dbError) {
            console.error(`[Podcast] Background: DB error updating record ${recordId} to 'failed' after ElevenLabs initiation error:`, dbError);
          }
        });

        // If we reach here, the command has been sent to ElevenLabs.
        // The record remains 'processing'. Manual retrieval will handle completion/failure based on ElevenLabs history.
        console.log(`[Podcast] Background: Command to generate audio for ${recordId} sent to ElevenLabs. No further processing in this async block.`);

      } catch (internalError) {
        // This catch is for unexpected errors within this specific IIAFE block setup, NOT for ElevenLabs generation errors themselves (handled above).
        console.error(`[Podcast] Background: Internal error in detached async block for record ${recordId}:`, internalError);
        // This is an unexpected state, try to mark as failed.
        try {
          await adminClient
            .from('podcast_audio_generations')
            .update({
              status: 'failed',
              error_message: `Internal Background Error: ${(internalError as Error).message}`
            })
            .eq('id', recordId);
        } catch (dbError) {
          // Log, but don't let this crash anything further.
          console.error(`[Podcast] Background: DB error attempting to mark ${recordId} as failed after internal error:`, dbError);
        }
      }
    })(); // End of detached async IIAFE

    console.log(`[Podcast] API Route: Fire-and-forget for record ${recordId} dispatched. API will respond now.`);

  } catch (setupError) {
    // This catch is for synchronous errors during the setup in this function (e.g., new ElevenLabsClient fails).
    console.error(`[Podcast] API Route: Synchronous setup error for record ${recordId}:`, setupError);
    try {
      await adminClient
        .from('podcast_audio_generations')
        .update({
          status: 'failed',
          error_message: `API Setup Error: ${(setupError as Error).message}`
        })
        .eq('id', recordId);
      console.log(`[Podcast] API Route: Record ${recordId} marked as 'failed' due to setup error.`);
    } catch (dbUpdateError) {
      console.error(`[Podcast] API Route: DB error updating record ${recordId} after setup error:`, dbUpdateError);
    }
  }
}

/**
 * Handle conversation podcast generation via ElevenLabs Studio API
 */
async function handleConversationGeneration(
  apiKey: string,
  sourceType: string, 
  sourceValue: string,
  hostVoiceId: string,
  guestVoiceId: string,
  recordId: string,
  title: string,
  organizationId: string,
  adminClient: any
): Promise<void> {
  console.log(`[Podcast] API Route: Initiating conversation generation for record ${recordId}.`);
  const elevenClient = new ElevenLabsClient({ apiKey });
  
  // Fire-and-forget
  (async () => {
    try {
      let podcastSource;

      // Prepare source content
      let actualTextContent = "";
      if (sourceType === 'url') {
        // Placeholder: In a real implementation, fetch and parse the URL content here.
        // This is a critical step. 
        console.warn(`[Podcast] Background: URL processing for ${sourceValue} is a placeholder. Implement actual fetching and text extraction.`);
        actualTextContent = `Content from ${sourceValue}`; // Replace with actual fetched content
         podcastSource = {
          type: "text" as const, // Assuming we process the URL to text
          text: actualTextContent
        };
      } else { // 'text' or 'file' content (assuming file content is passed as text by client)
        actualTextContent = sourceValue;
        podcastSource = {
          type: "text" as const,
          text: actualTextContent
        };
        }
      
      console.log(`[Podcast] Background: Sending command to ElevenLabs Studio to create podcast for record ${recordId}`);
      
      const elevenLabsPayload = {
        model_id: "eleven_multilingual_v2", // As per PodcastImplementationPlan.md
        title: title, // Add title to the payload
        mode: {
          type: "conversation" as const, // Use "as const" for literal type
          conversation: {
            host_voice_id: hostVoiceId,
            guest_voice_id: guestVoiceId,
          },
        },
        source: podcastSource, // Use the prepared source
        quality_preset: "ultra" as const, // Also use "as const" for enums if needed by SDK
        // duration_scale: "default", // Optional, as per PodcastImplementationPlan.md
      };

      console.log("[Podcast] Background: ElevenLabs Payload for conversation:", JSON.stringify(elevenLabsPayload, null, 2));

      const response = await elevenClient.studio.createPodcast(elevenLabsPayload);

      // const response = await elevenClient.studio.createPodcast({
      //   model_id: "eleven_multilingual_v2", // Or your selected model
      //   title: title, 
      //   mode: { // Old incorrect structure
      //     conversation: {
      //       host_voice_id: hostVoiceId,
      //       guest_voice_id: guestVoiceId,
      //     },
      //   },
      //   // source: { text: sourceValue }, // Assuming sourceValue is the actual text content
      //   source: podcastSource,
      //   quality_preset: "ultra", 
      //   // duration_scale: "default" 
      // });
      
      console.log(`[Podcast] Background: ElevenLabs Studio API response for record ${recordId}:`, response);

      // If successful, ElevenLabs returns a project object. We need the project_id.
      // The actual audio generation happens in the background on ElevenLabs' side.
      // We'll update our record with the project_id for status checking.
      // The webhook or polling mechanism will later update with audio_url.

      if (response && response.project && response.project.project_id) {
        await adminClient
          .from('podcast_audio_generations')
          .update({
            status: 'submitted_to_elevenlabs', // New status indicating it's with ElevenLabs
            elevenlabs_project_id: response.project.project_id,
            // audio_url: null, // audio_url will be set by webhook or polling
            // error_message: null 
          })
          .eq('id', recordId);
        console.log(`[Podcast] Background: Record ${recordId} updated with ElevenLabs project ID: ${response.project.project_id}`);
      } else {
        // This case should ideally not happen if API call was successful (200-299)
        // but the response structure is not as expected.
        console.error(`[Podcast] Background: ElevenLabs API call succeeded but response format unexpected for record ${recordId}:`, response);
        await adminClient
        .from('podcast_audio_generations')
        .update({
              status: 'failed',
              error_message: 'ElevenLabs API response format unexpected after creation.'
        })
        .eq('id', recordId);
      }

    } catch (error: any) {
      const errorResponse = error.response; // Axios-like error structure from ElevenLabs client
      let errorMessage = 'Unknown error during ElevenLabs conversation generation.';
      let errorDetails = error.message;

      if (errorResponse && errorResponse.data && errorResponse.data.detail) {
        errorMessage = `ElevenLabs Studio API error: ${errorResponse.status} ${errorResponse.statusText}`;
        errorDetails = JSON.stringify(errorResponse.data.detail);
        console.error(`[Podcast] Background: ElevenLabs Studio API error for record ${recordId}: ${errorResponse.status} ${errorResponse.statusText}`, errorResponse.data.detail);
      } else {
        console.error(`[Podcast] Background: ElevenLabs conversation generation failed for record ${recordId}:`, error);
      }

      try {
        await adminClient
          .from('podcast_audio_generations')
          .update({
            status: 'failed',
            error_message: `${errorMessage} - ${errorDetails}`
          })
          .eq('id', recordId);
        console.log(`[Podcast] Background: Record ${recordId} marked as 'failed' due to ElevenLabs conversation initiation error.`);
      } catch (dbError) {
        console.error(`[Podcast] Background: DB error updating record ${recordId} to 'failed':`, dbError);
      }
    }
  })(); // End of detached async IIAFE

  console.log(`[Podcast] API Route: Fire-and-forget for conversation record ${recordId} dispatched. API will respond now.`);
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