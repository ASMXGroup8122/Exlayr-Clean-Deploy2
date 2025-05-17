import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
import { PodcastService, PodcastError } from '@/lib/services/podcast.service';
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
 * API endpoint for checking podcast generation status
 * Particularly useful for conversation podcasts that process asynchronously
 */
export async function POST(req: NextRequest) {
  console.log('[Podcast] Checking podcast status');
  
  // Safely parse JSON - handle empty body case
  let recordId, organizationId, forceRetrieve;
  try {
    // Check if request body is empty
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ 
        error: 'Invalid content type. Expected application/json', 
        status: 'error' 
      }, { status: 400 });
    }
    
    const clonedReq = req.clone();
    const text = await clonedReq.text();
    
    if (!text || text.trim() === '') {
      return NextResponse.json({ 
        error: 'Empty request body', 
        status: 'error' 
      }, { status: 400 });
    }
    
    const body = JSON.parse(text);
    recordId = body.recordId;
    organizationId = body.organizationId;
    forceRetrieve = body.forceRetrieve;
  } catch (parseError) {
    console.error('[Podcast] Error parsing request body:', parseError);
    return NextResponse.json({ 
      error: 'Invalid JSON in request body',
      details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
      status: 'error'
    }, { status: 400 });
  }
  
  // Validate required parameters
    if (!recordId || !organizationId) {
    return NextResponse.json({ 
      error: 'Record ID and organization ID are required',
      status: 'error' 
    }, { status: 400 });
    }
    
  console.log(`[Podcast] Checking status for record ${recordId}, forceRetrieve: ${forceRetrieve ? 'true' : 'false'}`);
    
  try {
    // Get record - manually query instead of using PodcastService to handle multiple records
    const { data: records, error: recordsError } = await supabaseAdmin
      .from('podcast_audio_generations')
      .select('*')
      .eq('id', recordId);
    
    if (recordsError) {
      console.error(`[Podcast] Error fetching podcast records:`, recordsError);
      return NextResponse.json({ 
        error: `Database error: ${recordsError.message}`,
        status: 'error'
      }, { status: 500 });
    }
    
    // Handle no records found
    if (!records || records.length === 0) {
      console.error(`[Podcast] No podcast record found with ID: ${recordId}`);
      return NextResponse.json({ 
        error: `Podcast record not found with ID: ${recordId}`,
        status: 'error'
      }, { status: 404 });
    }
    
    // Handle multiple records - use the most recent one
    let record;
    if (records.length > 1) {
      console.warn(`[Podcast] Multiple podcast records (${records.length}) found with ID: ${recordId}, using most recent`);
      // Sort by created_at descending and take the first one
      records.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
      record = records[0];
    } else {
      record = records[0];
    }
    
    // Ensure record is not null/undefined
    if (!record) {
      return NextResponse.json({ 
        error: `Failed to find valid podcast record`,
        status: 'error'
      }, { status: 500 });
    }
    
    // === New Logic for Single Voice Processing Podcasts ===
    if (record.format === 'single' && record.status === 'processing' && !forceRetrieve) {
      console.log(`[Podcast] Single voice podcast is 'processing'. Returning current status without ElevenLabs check.`);
      return NextResponse.json({
        status: record.status,
        audioUrl: record.audio_url,
        progress: record.progress || 0, // Default progress to 0 if null
        format: record.format, // Include format
        message: "Single voice podcast processing, manual retrieval required."
      });
    }
    // === End New Logic ===
    
    // If forceRetrieve is true, always attempt to download and store the audio,
    // regardless of whether we already have a URL
    if (forceRetrieve) {
      console.log(`[Podcast] Force retrieve flag set, will download and store audio regardless of current state`);
      
      // This path is used by the manual "Retrieve Audio" button in the UI
      try {
    // Get API key
        console.log(`[Podcast] Fetching organization API key for forced retrieval`);
    const apiKey = await PodcastService.getOrganizationApiKey(organizationId);
    
        // Check if we have a direct ElevenLabs URL we can use
        let audioUrl = null;
        
        if (record.audio_url && record.audio_url.includes('api.elevenlabs.io')) {
          // We have a direct ElevenLabs URL
          console.log(`[Podcast] Using existing ElevenLabs URL for download: ${record.audio_url}`);
    
          // Extract the history item ID from the URL
          const urlParts = record.audio_url.split('/');
          const historyItemIdIndex = urlParts.findIndex((part: string) => part === 'history') + 1;
          const historyItemId = urlParts[historyItemIdIndex];
          
          if (!historyItemId) {
            throw new Error('Could not extract history item ID from URL');
          }
          
          audioUrl = `https://api.elevenlabs.io/v1/history/${historyItemId}/audio`;
        } else if (record.elevenlabs_project_id) {
          // We have a project ID, we can check its status to get the URL
          console.log(`[Podcast] Checking project status to get audio URL: ${record.elevenlabs_project_id}`);
      
      const projectStatus = await PodcastService.checkPodcastProjectStatus(
        record.elevenlabs_project_id,
        apiKey
      );
      
          if (projectStatus.status === 'done' && projectStatus.audioUrl) {
            audioUrl = projectStatus.audioUrl;
          } else {
            throw new Error(`Project is not complete or has no audio URL: ${JSON.stringify(projectStatus)}`);
          }
        } else {
          // We need to find the audio in history
          console.log(`[Podcast] No existing URL or project ID, searching history`);
          
          // Get history from ElevenLabs
          const historyResponse = await fetch('https://api.elevenlabs.io/v1/history', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'xi-api-key': apiKey
            }
          });
          
          if (!historyResponse.ok) {
            throw new Error(`Failed to get history from ElevenLabs: ${historyResponse.status}`);
          }
          
          const historyData = await historyResponse.json();
          
          if (!historyData.history || !Array.isArray(historyData.history)) {
            throw new Error('Invalid history data from ElevenLabs');
          }
          
          // Find matching history item for this podcast
          const potentialMatches = historyData.history
            .filter((item: any) => item.voice_id === record.voice_id)
            .slice(0, 10); // Look at the 10 most recent items
          
          if (potentialMatches.length === 0) {
            throw new Error(`No history items found for voice ${record.voice_id}`);
          }
          
          // Use the most recent item
          const historyItem = potentialMatches[0];
          
          if (!historyItem.history_item_id) {
            throw new Error('History item has no ID');
          }
          
          audioUrl = `https://api.elevenlabs.io/v1/history/${historyItem.history_item_id}/audio`;
        }
        
        if (!audioUrl) {
          throw new Error('Unable to determine audio URL for download');
        }
        
        // Download the audio
        console.log(`[Podcast] Downloading audio from ${audioUrl}`);
        const audioResponse = await fetch(audioUrl, {
          method: 'GET',
          headers: {
            'xi-api-key': apiKey
          }
        });
        
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio: ${audioResponse.status}`);
        }
        
        // Convert to buffer
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        console.log(`[Podcast] Downloaded audio file: ${audioBuffer.length} bytes`);
        
        // Upload to Supabase Storage
        console.log(`[Podcast] Uploading to Supabase Storage`);
        const fileName = `podcast_${recordId}_${Date.now()}.mp3`; // Add timestamp to prevent conflicts
        const filePath = `${organizationId}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('podcast_audio')
          .upload(filePath, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
          });
        
        if (uploadError) {
          throw new Error(`Failed to upload to storage: ${uploadError.message}`);
        }
        
        // Get the public URL
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('podcast_audio')
          .getPublicUrl(filePath);
        
        if (!publicUrlData?.publicUrl) {
          throw new Error('Failed to get public URL');
        }
        
        const publicUrl = publicUrlData.publicUrl;
        console.log(`[Podcast] Uploaded to storage, URL: ${publicUrl}`);
        
        // Update the database with the correct URL
        const { error: updateError } = await supabaseAdmin
          .from('podcast_audio_generations')
          .update({
            status: 'completed',
            audio_url: publicUrl
          })
          .eq('id', record.id);
        
        if (updateError) {
          throw new Error(`Failed to update record: ${updateError.message}`);
        }
        
        // Get the updated record to confirm
        const { data: updatedRecords, error: getError } = await supabaseAdmin
          .from('podcast_audio_generations')
          .select('*')
          .eq('id', record.id);
        
        if (getError || !updatedRecords || updatedRecords.length === 0) {
          throw new Error(`Failed to fetch updated record: ${getError?.message || 'No records returned'}`);
        }
        
        const updatedRecord = updatedRecords[0];
        
        return NextResponse.json({
          status: 'completed',
          audioUrl: updatedRecord.audio_url,
          message: 'Successfully retrieved and stored audio',
          oneTimeOperation: true
        });
      } catch (error) {
        console.error(`[Podcast] Error in force retrieve:`, error);
        return NextResponse.json({ 
          error: `Failed to force retrieve audio: ${error instanceof Error ? error.message : String(error)}`,
          status: 'error'
        }, { status: 500 });
      }
    }
    
    // If status is completed, and we have a URL, we are done
    if (record.status === 'completed' && record.audio_url) {
      console.log(`[Podcast] Podcast is already completed with URL: ${record.audio_url}`);
      return NextResponse.json({ 
        status: 'completed', 
        audioUrl: record.audio_url, 
        progress: 100,
        format: record.format // Include format
        });
      }
      
    // If the podcast is a conversation type and has a project ID, check its status
    if (record.format === 'conversation' && record.elevenlabs_project_id) {
      console.log(`[Podcast] Conversation podcast, checking ElevenLabs project status for ID: ${record.elevenlabs_project_id}`);
      
      try {
        const apiKey = await PodcastService.getOrganizationApiKey(organizationId);
        const projectStatus = await PodcastService.checkPodcastProjectStatus(
          record.elevenlabs_project_id,
          apiKey
        );
        
        console.log(`[Podcast] ElevenLabs project status:`, projectStatus);
        
        if (projectStatus.status === 'done' && projectStatus.audioUrl) {
          // Project is done, update our record and return completed status
          console.log(`[Podcast] Conversation podcast complete, audio URL: ${projectStatus.audioUrl}`);
          
          const audioResponse = await fetch(projectStatus.audioUrl, {
            method: 'GET',
            headers: { 'xi-api-key': apiKey }
          });

          if (!audioResponse.ok) {
            throw new Error(`Failed to download audio from project URL: ${audioResponse.status}`);
          }
          const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
          const fileName = `podcast_${record.id}_project_${Date.now()}.mp3`;
          const filePath = `${organizationId}/${fileName}`;
          
          await supabaseAdmin.storage
            .from('podcast_audio')
            .upload(filePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
          
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('podcast_audio')
            .getPublicUrl(filePath);

          if (!publicUrlData?.publicUrl) {
            throw new Error('Failed to get public URL for project audio');
          }
          
          const finalAudioUrl = publicUrlData.publicUrl;

          await supabaseAdmin
            .from('podcast_audio_generations')
            .update({ status: 'completed', audio_url: finalAudioUrl, progress: 100 })
            .eq('id', record.id);
            
          return NextResponse.json({ 
            status: 'completed', 
            audioUrl: finalAudioUrl, 
            progress: 100,
            format: record.format // Include format
          });
        } else if (projectStatus.status === 'failed' || (projectStatus as any).errorMessage) {
            await supabaseAdmin
            .from('podcast_audio_generations')
            .update({ 
              status: 'failed', 
              error_message: (projectStatus as any).errorMessage || 'ElevenLabs project error',
              progress: projectStatus.progress || 0
            })
            .eq('id', record.id);
        return NextResponse.json({
          status: 'failed',
            error: (projectStatus as any).errorMessage || 'ElevenLabs project processing failed',
            progress: projectStatus.progress || 0,
            format: record.format
        });
        } else {
          // Still processing or other state
          if (projectStatus.progress !== undefined && record.progress !== projectStatus.progress) {
             await supabaseAdmin
              .from('podcast_audio_generations')
              .update({ progress: projectStatus.progress })
              .eq('id', record.id);
          }
      return NextResponse.json({
        status: 'processing',
            progress: projectStatus.progress || record.progress || 0,
            format: record.format
      });
    }
      } catch (error) {
        console.error(`[Podcast] Error checking ElevenLabs project status:`, error);
        return NextResponse.json({ 
          status: record.status, 
          audioUrl: record.audio_url,
          progress: record.progress || 0,
          error: `Error checking conversation status: ${(error as Error).message}`,
          format: record.format
        });
      }
    }
    
    console.log(`[Podcast] Fallback: Returning current record status for record ${record.id} - Format: ${record.format}, Status: ${record.status}`);
    return NextResponse.json({
      status: record.status,
      audioUrl: record.audio_url, 
      progress: record.progress || (record.status === 'completed' ? 100 : 0),
      error: record.error_message,
      format: record.format
    });
  } catch (error) {
    console.error('[Podcast] Error checking status:', error);
    return NextResponse.json({ 
      error: error instanceof PodcastError ? error.message : 'Error checking podcast status',
      details: error instanceof Error ? error.message : undefined,
      status: 'error'
    }, { status: 500 });
  }
} 