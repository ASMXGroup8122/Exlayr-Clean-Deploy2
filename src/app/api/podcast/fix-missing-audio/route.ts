import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import fs from 'fs';
import path from 'path';

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
 * POST API to fix all podcasts with missing or invalid audio URLs
 * This API properly downloads the audio from ElevenLabs and stores it in Supabase Storage
 */
export async function POST(req: NextRequest) {
  console.log('[Fix-Missing-Audio] Starting repair process');
  
  try {
    // Get podcast ID from request body
    const body = await req.json();
    const { podcastId, organizationId } = body;
    
    if (!podcastId || !organizationId) {
      console.error('[Fix-Missing-Audio] Missing podcastId or organizationId in request');
      return NextResponse.json({ 
        error: 'Podcast ID and Organization ID are required',
        status: 'error'
      }, { status: 400 });
    }
    
    console.log(`[Fix-Missing-Audio] Fixing podcast ID: ${podcastId}, Organization ID: ${organizationId}`);
    
    // Get the podcast record
    const { data: podcastRecord, error: recordError } = await supabaseAdmin
      .from('podcast_audio_generations')
      .select('*')
      .eq('id', podcastId)
      .single();
    
    if (recordError || !podcastRecord) {
      console.error('[Fix-Missing-Audio] Error fetching podcast record:', recordError);
      return NextResponse.json({ 
        error: `Failed to fetch podcast record: ${recordError?.message || 'Record not found'}`,
        status: 'error'
      }, { status: 500 });
    }
    
    console.log(`[Fix-Missing-Audio] Found podcast record: ${podcastRecord.title}`);
    console.log(`[Fix-Missing-Audio] Voice ID: ${podcastRecord.voice_id}`);
    
    // Get API key
    console.log(`[Fix-Missing-Audio] Fetching organization API key from oauth_tokens`);
    const { data: oauthToken, error: oauthError } = await supabaseAdmin
      .from('oauth_tokens')
      .select('access_token')
      .eq('organization_id', organizationId)
      .eq('provider', 'elevenlabs')
      .maybeSingle();
    
    if (oauthError || !oauthToken?.access_token) {
      console.error('[Fix-Missing-Audio] Error fetching organization API key:', oauthError);
      return NextResponse.json({ 
        error: `Failed to fetch organization API key: ${oauthError?.message || 'API key not found'}`,
        status: 'error'
      }, { status: 500 });
    }
    
    const apiKey = oauthToken.access_token;
    console.log('[Fix-Missing-Audio] Found API key in oauth_tokens');
    
    // Get the history from ElevenLabs
    console.log('[Fix-Missing-Audio] Fetching history from ElevenLabs');
    const historyResponse = await fetch('https://api.elevenlabs.io/v1/history', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey
      }
    });
    
    if (!historyResponse.ok) {
      console.error('[Fix-Missing-Audio] Error fetching history from ElevenLabs:', historyResponse.status);
      return NextResponse.json({ 
        error: `Failed to fetch history from ElevenLabs: ${historyResponse.status}`,
        status: 'error'
      }, { status: 500 });
    }
    
    const historyData = await historyResponse.json();
    
    if (!historyData.history || !Array.isArray(historyData.history)) {
      console.error('[Fix-Missing-Audio] Invalid history data:', historyData);
      return NextResponse.json({ 
        error: 'Invalid history data from ElevenLabs',
        status: 'error'
      }, { status: 500 });
    }
    
    console.log(`[Fix-Missing-Audio] Found ${historyData.history.length} history items`);
    
    // Find matching history items with this voice ID
    const potentialMatches = historyData.history
      .filter((item: any) => item.voice_id === podcastRecord.voice_id)
      .slice(0, 10); // Take up to 10 recent items
    
    if (potentialMatches.length === 0) {
      console.error('[Fix-Missing-Audio] No matching history items found for voice ID:', podcastRecord.voice_id);
      return NextResponse.json({ 
        error: `No history items found for voice ${podcastRecord.voice_id}`,
        status: 'error'
      }, { status: 404 });
    }
    
    console.log(`[Fix-Missing-Audio] Found ${potentialMatches.length} potential matches`);
    console.log(`[Fix-Missing-Audio] Using most recent item: ${potentialMatches[0].history_item_id}`);
    
    // Use the most recent item
    const historyItem = potentialMatches[0];
    
    if (!historyItem.history_item_id) {
      console.error('[Fix-Missing-Audio] History item has no ID');
      return NextResponse.json({ 
        error: 'History item has no ID',
        status: 'error'
      }, { status: 500 });
    }
    
    // Download the audio file
    console.log(`[Fix-Missing-Audio] Downloading audio for history item ${historyItem.history_item_id}`);
    const audioUrl = `https://api.elevenlabs.io/v1/history/${historyItem.history_item_id}/audio`;
    const audioResponse = await fetch(audioUrl, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    if (!audioResponse.ok) {
      console.error('[Fix-Missing-Audio] Error downloading audio:', audioResponse.status);
      return NextResponse.json({ 
        error: `Failed to download audio: ${audioResponse.status}`,
        status: 'error'
      }, { status: 500 });
    }
    
    // Convert to buffer
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    console.log(`[Fix-Missing-Audio] Downloaded audio file: ${audioBuffer.length} bytes`);
    
    // Upload to Supabase Storage
    console.log(`[Fix-Missing-Audio] Uploading to Supabase Storage`);
    const fileName = `podcast_${podcastId}_fixed.mp3`;
    const filePath = `${organizationId}/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('podcast_audio')
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });
    
    if (uploadError) {
      console.error('[Fix-Missing-Audio] Error uploading to storage:', uploadError);
      return NextResponse.json({ 
        error: `Failed to upload to storage: ${uploadError.message}`,
        status: 'error'
      }, { status: 500 });
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('podcast_audio')
      .getPublicUrl(filePath);
    
    if (!publicUrlData?.publicUrl) {
      console.error('[Fix-Missing-Audio] Failed to get public URL');
      return NextResponse.json({ 
        error: 'Failed to get public URL',
        status: 'error'
      }, { status: 500 });
    }
    
    const publicUrl = publicUrlData.publicUrl;
    console.log(`[Fix-Missing-Audio] Uploaded to storage, URL: ${publicUrl}`);
    
    // Update the database with the correct URL
    const { error: updateError } = await supabaseAdmin
      .from('podcast_audio_generations')
      .update({
        status: 'completed',
        audio_url: publicUrl
      })
      .eq('id', podcastId);
    
    if (updateError) {
      console.error('[Fix-Missing-Audio] Error updating record:', updateError);
      return NextResponse.json({ 
        error: `Failed to update record: ${updateError.message}`,
        status: 'error'
      }, { status: 500 });
    }
    
    console.log('[Fix-Missing-Audio] Successfully fixed podcast audio');
    
    return NextResponse.json({
      success: true,
      message: 'Successfully fixed podcast audio',
      oldUrl: podcastRecord.audio_url,
      newUrl: publicUrl
    });
  } catch (error) {
    console.error('[Fix-Missing-Audio] Unexpected error:', error);
    return NextResponse.json({ 
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      status: 'error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to display a UI for fixing podcasts with missing audio URLs
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId');

  if (!orgId) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Fix Podcast Audio</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 p-8">
          <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
            <h1 class="text-2xl font-bold mb-4">Error</h1>
            <p class="text-red-600">Organization ID is required</p>
          </div>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }

  try {
    // Get podcasts with missing or invalid audio URLs
    const { data: podcasts, error } = await supabaseAdmin
      .from('podcast_audio_generations')
      .select('*')
      .eq('organization_id', orgId)
      .or('audio_url.is.null,audio_url.ilike.%{history_item_id}%,audio_url.ilike.%api.elevenlabs.io%')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch podcasts: ${error.message}`);
    }
    
    // Get all podcasts regardless of audio URL status for comparison
    const { data: allPodcasts, error: allError } = await supabaseAdmin
      .from('podcast_audio_generations')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (allError) {
      throw new Error(`Failed to fetch all podcasts: ${allError.message}`);
    }

    // Generate HTML
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Fix Podcast Audio</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 p-8">
          <div class="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
            <h1 class="text-2xl font-bold mb-4">Fix Podcast Audio URLs</h1>
            <p class="mb-6">Organization ID: ${orgId}</p>
            
            <h2 class="text-xl font-semibold mb-4">Podcasts with Missing Audio (${podcasts?.length || 0})</h2>
            ${podcasts && podcasts.length > 0 
              ? `<div class="space-y-4">
                  ${podcasts.map(podcast => `
                    <div class="border p-4 rounded" id="podcast-${podcast.id}">
                      <p><strong>ID:</strong> ${podcast.id}</p>
                      <p><strong>Title:</strong> ${podcast.title || 'No title'}</p>
                      <p><strong>Voice ID:</strong> ${podcast.voice_id}</p>
                      <p><strong>Created:</strong> ${new Date(podcast.created_at).toLocaleString()}</p>
                      <p><strong>Status:</strong> <span class="text-amber-600">${podcast.status}</span></p>
                      <div class="mt-2">
                        <button 
                          onclick="fixPodcast('${podcast.id}', '${orgId}')" 
                          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Retrieve Audio
                        </button>
                        <span id="status-${podcast.id}" class="ml-2"></span>
                      </div>
                    </div>
                  `).join('')}
                </div>`
              : `<p class="text-green-600">No podcasts with missing audio URLs found.</p>`
            }
            
            <h2 class="text-xl font-semibold my-6">Recent Podcasts (20)</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full bg-white">
                <thead>
                  <tr>
                    <th class="py-2 px-4 border-b">ID</th>
                    <th class="py-2 px-4 border-b">Title</th>
                    <th class="py-2 px-4 border-b">Status</th>
                    <th class="py-2 px-4 border-b">Has Audio</th>
                    <th class="py-2 px-4 border-b">Created</th>
                  </tr>
                </thead>
                <tbody>
                  ${allPodcasts?.map(podcast => `
                    <tr>
                      <td class="py-2 px-4 border-b">${podcast.id.substring(0, 8)}...</td>
                      <td class="py-2 px-4 border-b">${podcast.title || 'No title'}</td>
                      <td class="py-2 px-4 border-b ${
                        podcast.status === 'completed' ? 'text-green-600' : 
                        podcast.status === 'failed' ? 'text-red-600' : 'text-amber-600'
                      }">${podcast.status}</td>
                      <td class="py-2 px-4 border-b ${podcast.audio_url ? 'text-green-600' : 'text-red-600'}">
                        ${podcast.audio_url ? 'Yes' : 'No'}
                      </td>
                      <td class="py-2 px-4 border-b">${new Date(podcast.created_at).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <script>
            async function fixPodcast(podcastId, orgId) {
              const statusEl = document.getElementById('status-' + podcastId);
              const buttonEl = statusEl.previousElementSibling;
              
              statusEl.textContent = 'Retrieving...';
              buttonEl.disabled = true;
              
              try {
                const response = await fetch('/api/podcast/fix-missing-audio', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    podcastId,
                    organizationId: orgId
                  })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                  statusEl.textContent = 'Success! Audio URL has been fixed.';
                  statusEl.className = 'ml-2 text-green-600';
                  document.getElementById('podcast-' + podcastId).classList.add('bg-green-50');
                  
                  // Add audio player
                  const audioDiv = document.createElement('div');
                  audioDiv.className = 'mt-4';
                  audioDiv.innerHTML = \`
                    <p class="font-medium text-green-600 mb-2">Audio Preview:</p>
                    <audio controls src="\${data.newUrl}" class="w-full"></audio>
                  \`;
                  
                  document.getElementById('podcast-' + podcastId).appendChild(audioDiv);
                } else {
                  statusEl.textContent = 'Error: ' + (data.error || 'Unknown error');
                  statusEl.className = 'ml-2 text-red-600';
                  buttonEl.disabled = false;
                }
              } catch (error) {
                statusEl.textContent = 'Error: ' + error.message;
                statusEl.className = 'ml-2 text-red-600';
                buttonEl.disabled = false;
              }
            }
          </script>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Fix Podcast Audio</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 p-8">
          <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
            <h1 class="text-2xl font-bold mb-4">Error</h1>
            <p class="text-red-600">${(error as Error).message}</p>
          </div>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
} 