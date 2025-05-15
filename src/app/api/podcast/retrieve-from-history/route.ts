import { NextRequest, NextResponse } from 'next/server';
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
 * Helper function to convert stream to buffer
 */
async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  return Buffer.concat(chunks);
}

/**
 * POST endpoint to retrieve podcast audio from ElevenLabs history
 * This handles finding audio in ElevenLabs history, downloading it,
 * storing it in Supabase Storage, and updating the database with the permanent URL
 */
export async function POST(req: NextRequest) {
  console.log('[Podcast] Starting history retrieval and storage process');
  try {
    // Parse request body
    const body = await req.json();
    const { podcastId, organizationId } = body;

    if (!podcastId || !organizationId) {
      return NextResponse.json({ 
        error: 'Podcast ID and organization ID are required' 
      }, { status: 400 });
    }
    
    console.log(`[Podcast] Retrieving podcast ${podcastId} from history for org ${organizationId}`);
    
    // First get the podcast record to get voice ID
    const { data: podcast, error: podcastError } = await supabaseAdmin
      .from('podcast_audio_generations')
      .select('*')
      .eq('id', podcastId)
      .single();
      
    if (podcastError || !podcast) {
      return NextResponse.json({ 
        error: `Podcast not found: ${podcastError?.message || 'Unknown error'}` 
      }, { status: 404 });
    }
    
    // If we already have an audio URL, we can just return it
    if (podcast.status === 'completed' && podcast.audio_url) {
      return NextResponse.json({ 
        message: 'Podcast already has audio URL',
        audioUrl: podcast.audio_url
      });
    }
    
    // Check if podcast is in failed state
    if (podcast.status === 'failed') {
      return NextResponse.json({ 
        error: 'Cannot retrieve audio for a failed podcast'
      }, { status: 400 });
    }
    
    // Get the API key
    const { data: oauthToken, error: oauthError } = await supabaseAdmin
      .from('oauth_tokens')
      .select('access_token')
      .eq('organization_id', organizationId)
      .eq('provider', 'elevenlabs')
      .maybeSingle();
      
    if (oauthError || !oauthToken?.access_token) {
      const { data: settingsData, error: settingsError } = await supabaseAdmin
        .from('organization_settings')
        .select('elevenlabs_api_key')
        .eq('organization_id', organizationId)
        .maybeSingle();
        
      if (settingsError || !settingsData?.elevenlabs_api_key) {
        return NextResponse.json({ 
          error: 'ElevenLabs API key not found in oauth_tokens or organization_settings'
        }, { status: 400 });
      }
      
      // Use the API key from organization_settings
      const apiKey = settingsData.elevenlabs_api_key;
      return await getHistoryAndStoreAudio(apiKey, podcast, podcastId, organizationId);
    }
    
    // Use the API key from oauth_tokens
    const apiKey = oauthToken.access_token;
    return await getHistoryAndStoreAudio(apiKey, podcast, podcastId, organizationId);
    
  } catch (error) {
    console.error('[Podcast] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * Helper function to get history from ElevenLabs, download audio,
 * upload to Supabase Storage, and update the database
 */
async function getHistoryAndStoreAudio(
  apiKey: string,
  podcast: any,
  podcastId: string,
  organizationId: string
): Promise<NextResponse> {
  try {
    console.log(`[Podcast] Retrieving audio from ElevenLabs history for voice ${podcast.voice_id}`);
    
    // Get history from ElevenLabs
    const historyResponse = await fetch('https://api.elevenlabs.io/v1/history', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey
      }
    });
    
    if (!historyResponse.ok) {
      console.error(`[Podcast] Failed to get history: ${historyResponse.status}`);
      return NextResponse.json({ 
        error: `Failed to get history from ElevenLabs: ${historyResponse.status}`
      }, { status: 500 });
    }
    
    const historyData = await historyResponse.json();
    
    if (!historyData.history || !Array.isArray(historyData.history)) {
      console.error('[Podcast] Invalid history data from ElevenLabs');
      return NextResponse.json({ 
        error: 'Invalid history data from ElevenLabs'
      }, { status: 500 });
    }
    
    console.log(`[Podcast] Found ${historyData.history.length} items in history`);
    
    // Filter by voice ID and get recent items
    const potentialMatches = historyData.history
      .filter((item: any) => item.voice_id === podcast.voice_id)
      .slice(0, 10); // Look at the 10 most recent items
    
    if (potentialMatches.length === 0) {
      console.log(`[Podcast] No history items found for voice ${podcast.voice_id}`);
      return NextResponse.json({ 
        error: `No history items found for voice ${podcast.voice_id}`
      }, { status: 404 });
    }
    
    console.log(`[Podcast] Found ${potentialMatches.length} potential matches`);
    
    // Use the most recent item
    const historyItem = potentialMatches[0];
    
    if (!historyItem.history_item_id) {
      console.error('[Podcast] History item has no ID');
      return NextResponse.json({ 
        error: 'History item has no ID'
      }, { status: 500 });
    }
    
    // Download audio from ElevenLabs
    console.log(`[Podcast] Downloading audio for history item ${historyItem.history_item_id}`);
    const audioResponse = await fetch(`https://api.elevenlabs.io/v1/history/${historyItem.history_item_id}/audio`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    if (!audioResponse.ok) {
      console.error(`[Podcast] Failed to download audio: ${audioResponse.status}`);
      return NextResponse.json({ 
        error: `Failed to download audio from ElevenLabs: ${audioResponse.status}`
      }, { status: 500 });
    }
    
    if (!audioResponse.body) {
      console.error('[Podcast] Audio response has no body');
      return NextResponse.json({ 
        error: 'Audio response has no body'
      }, { status: 500 });
    }
    
    // Convert stream to buffer
    console.log(`[Podcast] Converting audio stream to buffer`);
    const audioBuffer = await streamToBuffer(audioResponse.body);
    console.log(`[Podcast] Audio buffer created, size: ${audioBuffer.length} bytes`);
    
    // Upload to Supabase Storage
    console.log(`[Podcast] Uploading audio to Supabase Storage`);
    const audioFileName = `podcast_audio_${podcastId}.mp3`;
    const filePath = `${organizationId}/${audioFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('podcast_audio')
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });
      
    if (uploadError) {
      console.error(`[Podcast] Failed to upload audio to storage: ${uploadError.message}`);
      return NextResponse.json({ 
        error: `Failed to upload audio to storage: ${uploadError.message}`
      }, { status: 500 });
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('podcast_audio')
      .getPublicUrl(filePath);
      
    if (!publicUrlData?.publicUrl) {
      console.error('[Podcast] Failed to generate public URL for uploaded audio');
      return NextResponse.json({ 
        error: 'Failed to generate public URL for uploaded audio'
      }, { status: 500 });
    }
    
    const publicUrl = publicUrlData.publicUrl;
    console.log(`[Podcast] Audio uploaded successfully, public URL: ${publicUrl}`);
    
    // Update the database with the audio URL
    console.log(`[Podcast] Updating database with audio URL for podcast ${podcastId}`);
    const { error: updateError } = await supabaseAdmin
      .from('podcast_audio_generations')
      .update({
        status: 'completed',
        audio_url: publicUrl
      })
      .eq('id', podcastId);
      
    if (updateError) {
      console.error(`[Podcast] Failed to update database: ${updateError.message}`);
      return NextResponse.json({ 
        error: `Failed to update database: ${updateError.message}`
      }, { status: 500 });
    }
    
    console.log(`[Podcast] Successfully updated podcast ${podcastId} with audio URL`);
    return NextResponse.json({ 
      message: 'Successfully retrieved, stored, and linked audio',
      audioUrl: publicUrl
    });
    
  } catch (error) {
    console.error('[Podcast] Error retrieving and storing audio:', error);
    return NextResponse.json({ 
      error: `Failed to retrieve and store audio: ${(error as Error).message}`
    }, { status: 500 });
  }
} 