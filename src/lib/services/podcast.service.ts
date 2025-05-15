import { getSupabaseClient } from '@/lib/supabase/client';
import { ElevenLabsClient } from 'elevenlabs';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import crypto from 'crypto';

// TypeScript interfaces for better type safety
export interface PodcastGenerationParams {
  script: string;
  voiceId: string;
  organizationId: string;
  title: string;
  hostVoiceId?: string;
  guestVoiceId?: string;
  podcastFormat: 'single' | 'conversation';
}

export interface PodcastRecord {
  id?: string;
  organization_id: string;
  voice_id: string;
  guest_voice_id?: string;
  elevenlabs_project_id?: string;
  description: string;
  format: 'single' | 'conversation';
  status: 'processing' | 'completed' | 'failed';
  title: string;
  audio_url?: string;
  created_at?: string;
}

export class PodcastError extends Error {
  public readonly context: string;
  public readonly details: any;
  
  constructor(message: string, context: string, details?: any) {
    super(message);
    this.name = 'PodcastError';
    this.context = context;
    this.details = details;
    
    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PodcastError);
    }
  }
}

// Helper function to convert stream to buffer (unchanged logic)
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = []; 
    stream.on('data', (chunk: any) => {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk as unknown as Uint8Array); 
      } else if (chunk instanceof Uint8Array) {
        chunks.push(chunk);
      } else {
        chunks.push(Buffer.from(chunk) as unknown as Uint8Array); 
      }
    });
    stream.on('end', () => {
      if (chunks.length === 0) {
        reject(new PodcastError('Stream ended without providing any data chunks', 'streamToBuffer'));
        return;
      }
      resolve(Buffer.concat(chunks)); 
    });
    stream.on('error', (err: Error) => {
      reject(new PodcastError(`Error converting stream to buffer: ${err.message}`, 'streamToBuffer', err));
    });
  });
}

export class PodcastService {
  // Create initial record with processing status
  static async createProcessingRecord(params: PodcastGenerationParams): Promise<PodcastRecord> {
    const supabase = getSupabaseClient();
    
    try {
      const record: PodcastRecord = {
        organization_id: params.organizationId,
        voice_id: params.voiceId,
        description: params.script,
        format: params.podcastFormat,
        status: 'processing',
        title: params.title || 'Untitled Podcast',
      };
      
      // Add guest voice ID for conversation format
      if (params.podcastFormat === 'conversation' && params.guestVoiceId) {
        record.guest_voice_id = params.guestVoiceId;
      }
      
      const { data, error } = await supabase
        .from('podcast_audio_generations')
        .insert(record)
        .select('*')
        .single();
        
      if (error) {
        throw new PodcastError(
          `Failed to create initial podcast record: ${error.message}`, 
          'createProcessingRecord',
          error
        );
      }
      
      return data;
    } catch (error) {
      if (error instanceof PodcastError) {
        throw error;
      }
      throw new PodcastError(
        `Unexpected error creating processing record: ${(error as Error).message}`,
        'createProcessingRecord',
        error
      );
    }
  }
  
  // Update record with failure status
  static async updateRecordWithFailure(
    recordId: string, 
    errorMessage: string
  ): Promise<void> {
    const supabase = getSupabaseClient();
    
    try {
      const { error } = await supabase
        .from('podcast_audio_generations')
        .update({
          status: 'failed',
          description: `Error: ${errorMessage}`
        })
        .eq('id', recordId);
        
      if (error) {
        console.error('Failed to update record with error status:', error);
        // We don't throw here to avoid cascading errors
      }
    } catch (error) {
      console.error('Unexpected error updating record with failure:', error);
      // We don't throw here to avoid cascading errors
    }
  }
  
  // Update record with success status and audio URL
  static async updateRecordWithSuccess(
    recordId: string,
    audioUrl: string,
  ): Promise<void> {
    const supabase = getSupabaseClient();
    
    try {
      const { error } = await supabase
        .from('podcast_audio_generations')
        .update({
          status: 'completed',
          audio_url: audioUrl
        })
        .eq('id', recordId);
        
      if (error) {
        throw new PodcastError(
          `Failed to update podcast record with success: ${error.message}`, 
          'updateRecordWithSuccess',
          error
        );
      }
    } catch (error) {
      if (error instanceof PodcastError) {
        throw error;
      }
      throw new PodcastError(
        `Unexpected error updating record with success: ${(error as Error).message}`,
        'updateRecordWithSuccess',
        error
      );
    }
  }
  
  // Get organization ElevenLabs API key
  static async getOrganizationApiKey(organizationId: string): Promise<string> {
    const supabase = getSupabaseClient();
    
    try {
      console.log(`[PodcastService] Getting ElevenLabs API key for org: "${organizationId}"`);
      
      // First check oauth_tokens (preferred source)
      console.log('[PodcastService] Checking oauth_tokens for API key');
      const { data: oauthToken, error: oauthError } = await supabase
        .from('oauth_tokens')
        .select('access_token')
        .eq('organization_id', organizationId)
        .eq('provider', 'elevenlabs')
        .maybeSingle();
        
      if (oauthError) {
        console.error('[PodcastService] Failed to fetch from oauth_tokens:', oauthError);
      } else if (oauthToken?.access_token) {
        console.log('[PodcastService] Found API key in oauth_tokens');
        return oauthToken.access_token;
      }
      
      // If not found in oauth_tokens, check organization_settings as fallback
      console.log('[PodcastService] API key not found in oauth_tokens, checking organization_settings');
      const { data: settingsData, error: settingsError } = await supabase
        .from('organization_settings')
        .select('elevenlabs_api_key')
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      console.log(`[PodcastService] Organization settings query result:`, 
        settingsError ? `Error: ${settingsError.message}` : 
        (settingsData?.elevenlabs_api_key ? 
         `Key found: ${settingsData.elevenlabs_api_key.substring(0, 5)}...` : 
         "No key found")
      );
        
      // If found in settings, return it
      if (!settingsError && settingsData?.elevenlabs_api_key) {
        console.log('[PodcastService] Found API key in organization_settings');
        return settingsData.elevenlabs_api_key;
      }
      
      // If neither source has the token, throw error with details about both attempts
      if (oauthError && settingsError) {
        throw new PodcastError(
          'ElevenLabs API key not found in oauth_tokens or organization_settings',
          'getOrganizationApiKey',
          { oauthError, settingsError }
        );
      } else if (oauthError) {
        throw new PodcastError(
          'ElevenLabs API key not found in oauth_tokens (and not found in organization_settings either)',
          'getOrganizationApiKey',
          oauthError
        );
      } else {
        throw new PodcastError(
          'ElevenLabs API key not configured for this organization in either oauth_tokens or settings',
          'getOrganizationApiKey'
        );
      }
    } catch (error) {
      if (error instanceof PodcastError) {
        throw error;
      }
      throw new PodcastError(
        `Unexpected error fetching organization API key: ${(error as Error).message}`,
        'getOrganizationApiKey',
        error
      );
    }
  }
  
  // Upload audio buffer to storage
  static async uploadAudioToStorage(
    organizationId: string, 
    audioBuffer: Buffer
  ): Promise<{ path: string; publicUrl: string }> {
    const supabase = getSupabaseClient();
    const audioFileName = `podcast_audio_${uuidv4()}.mp3`;
    const filePath = `${organizationId}/${audioFileName}`;
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
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
      
      const { data: publicUrlData } = supabase.storage
        .from('podcast_audio')
        .getPublicUrl(uploadData.path);
        
      if (!publicUrlData?.publicUrl) {
        throw new PodcastError(
          'Failed to generate public URL for uploaded audio',
          'uploadAudioToStorage'
        );
      }
      
      return {
        path: uploadData.path,
        publicUrl: publicUrlData.publicUrl
      };
    } catch (error) {
      if (error instanceof PodcastError) {
        throw error;
      }
      throw new PodcastError(
        `Unexpected error uploading audio: ${(error as Error).message}`,
        'uploadAudioToStorage',
        error
      );
    }
  }
  
  // Get podcast records for organization
  static async getPodcastRecords(organizationId: string, limit = 5): Promise<PodcastRecord[]> {
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('podcast_audio_generations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);
        
      if (error) {
        throw new PodcastError(
          `Failed to fetch podcast records: ${error.message}`,
          'getPodcastRecords',
          error
        );
      }
      
      return data || [];
    } catch (error) {
      if (error instanceof PodcastError) {
        throw error;
      }
      throw new PodcastError(
        `Unexpected error fetching podcast records: ${(error as Error).message}`,
        'getPodcastRecords',
        error
      );
    }
  }
  
  // Get single podcast record by ID
  static async getPodcastRecord(recordId: string): Promise<PodcastRecord> {
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('podcast_audio_generations')
        .select('*')
        .eq('id', recordId)
        .single();
        
      if (error) {
        throw new PodcastError(
          `Failed to fetch podcast record: ${error.message}`,
          'getPodcastRecord',
          error
        );
      }
      
      return data;
    } catch (error) {
      if (error instanceof PodcastError) {
        throw error;
      }
      throw new PodcastError(
        `Unexpected error fetching podcast record: ${(error as Error).message}`,
        'getPodcastRecord',
        error
      );
    }
  }
  
  // Update ElevenLabs project ID for conversation format
  static async updateRecordWithProjectId(
    recordId: string,
    projectId: string
  ): Promise<void> {
    const supabase = getSupabaseClient();
    
    try {
      const { error } = await supabase
        .from('podcast_audio_generations')
        .update({
          elevenlabs_project_id: projectId
        })
        .eq('id', recordId);
        
      if (error) {
        throw new PodcastError(
          `Failed to update podcast record with project ID: ${error.message}`,
          'updateRecordWithProjectId',
          error
        );
      }
    } catch (error) {
      if (error instanceof PodcastError) {
        throw error;
      }
      throw new PodcastError(
        `Unexpected error updating record with project ID: ${(error as Error).message}`,
        'updateRecordWithProjectId',
        error
      );
    }
  }

  // Get all processing podcast records with project IDs
  static async getProcessingPodcastsWithProjectIds(organizationId: string): Promise<PodcastRecord[]> {
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('podcast_audio_generations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'processing')
        .not('elevenlabs_project_id', 'is', null);
        
      if (error) {
        throw new PodcastError(
          `Failed to fetch processing podcast records: ${error.message}`,
          'getProcessingPodcastsWithProjectIds',
          error
        );
      }
      
      return data || [];
    } catch (error) {
      if (error instanceof PodcastError) {
        throw error;
      }
      throw new PodcastError(
        `Unexpected error fetching processing podcasts: ${(error as Error).message}`,
        'getProcessingPodcastsWithProjectIds',
        error
      );
    }
  }

  // Check conversation podcast status with ElevenLabs
  static async checkPodcastProjectStatus(
    projectId: string,
    apiKey: string
  ): Promise<{
    status: 'processing' | 'done' | 'failed';
    progress: number;
    audioUrl?: string;
    errorMessage?: string;
  }> {
    try {
      console.log(`[PodcastService] Checking podcast project status: ${projectId}`);
      
      const response = await fetch(`https://api.elevenlabs.io/v1/studio/podcasts/${projectId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': apiKey
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new PodcastError(
          `Failed to check podcast status: ${response.status} ${response.statusText}`,
          'checkPodcastProjectStatus',
          { statusCode: response.status, error: errorText }
        );
      }
      
      const data = await response.json();
      console.log(`[PodcastService] Podcast project status:`, 
        data?.project?.creation_meta?.status || 'unknown',
        `Progress: ${data?.project?.creation_meta?.creation_progress || 0}`
      );
      
      if (!data.project) {
        throw new PodcastError(
          'Invalid response from ElevenLabs API: no project data',
          'checkPodcastProjectStatus',
          data
        );
      }
      
      const status = data.project.creation_meta?.status || 'processing';
      const progress = data.project.creation_meta?.creation_progress || 0;
      
      // If done, return the audio URL
      if (status === 'done' && data.project.url) {
        // CRITICAL FIX: Download the audio and store it properly instead of using the ElevenLabs URL
        // This prevents sensitive API keys from being stored in the database
        
        // Download the audio file first
        console.log(`[PodcastService] Project is complete, downloading audio from ElevenLabs`);
        const audioUrl = data.project.url;
        
        try {
          // Download the audio
          const audioResponse = await fetch(audioUrl, {
            method: 'GET', 
            headers: { 'xi-api-key': apiKey }
          });
          
          if (!audioResponse.ok) {
            throw new Error(`Failed to download audio: ${audioResponse.status}`);
          }
          
          // Convert to buffer
          const arrayBuffer = await audioResponse.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuffer);
          console.log(`[PodcastService] Downloaded audio file: ${audioBuffer.length} bytes`);
          
          // Generate a unique ID for the file
          const uniqueId = crypto.randomUUID();
          const supabase = getSupabaseClient();
          
          // Get organization ID from the project data
          let organizationId = data.project.user_id || 'default';
          
          // Upload to Supabase Storage
          console.log(`[PodcastService] Uploading to Supabase Storage`);
          const fileName = `podcast_${projectId}_${uniqueId}.mp3`;
          const filePath = `${organizationId}/${fileName}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('podcast_audio')
            .upload(filePath, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true
            });
          
          if (uploadError) {
            console.error(`[PodcastService] Storage upload error:`, uploadError);
            // Return the original URL as fallback, but log the error
            console.warn(`[PodcastService] SECURITY RISK: Using direct ElevenLabs URL as fallback`);
            return {
              status: 'done',
              progress: 1,
              audioUrl: audioUrl
            };
          }
          
          // Get the public URL
          const { data: publicUrlData } = supabase.storage
            .from('podcast_audio')
            .getPublicUrl(filePath);
          
          if (!publicUrlData?.publicUrl) {
            console.error(`[PodcastService] Failed to get public URL`);
            // Return the original URL as fallback, but log the error
            console.warn(`[PodcastService] SECURITY RISK: Using direct ElevenLabs URL as fallback`);
            return {
              status: 'done',
              progress: 1,
              audioUrl: audioUrl
            };
          }
          
          const secureUrl = publicUrlData.publicUrl;
          console.log(`[PodcastService] Successfully stored audio securely: ${secureUrl}`);
          
          return {
            status: 'done',
            progress: 1,
            audioUrl: secureUrl
          };
        } catch (downloadError) {
          console.error(`[PodcastService] Error downloading and storing audio:`, downloadError);
          // Return the original URL as fallback, but log the error
          console.warn(`[PodcastService] SECURITY RISK: Using direct ElevenLabs URL as fallback`);
          return {
            status: 'done',
            progress: 1,
            audioUrl: audioUrl
          };
        }
      }
      
      // If failed, return error message
      if (status === 'failed') {
        return {
          status: 'failed',
          progress: 0,
          errorMessage: data.project.creation_meta?.error?.message || 'Unknown error'
        };
      }
      
      // Otherwise, it's still processing
      return {
        status: 'processing',
        progress: progress
      };
    } catch (error) {
      console.error(`[PodcastService] Error checking podcast status:`, error);
      
      if (error instanceof PodcastError) {
        throw error;
      }
      
      throw new PodcastError(
        `Unexpected error checking podcast status: ${(error as Error).message}`,
        'checkPodcastProjectStatus',
        error
      );
    }
  }

  // Get audio URL from ElevenLabs history without downloading
  static async getAudioFromElevenLabsHistory(
    apiKey: string,
    voiceId: string,
    organizationId: string,
    recordId: string,
    title: string
  ): Promise<string | null> {
    try {
      console.log(`[PodcastService] Retrieving audio from ElevenLabs history for voice ${voiceId}`);
      
      // First, get the history list to find our item
      const historyResponse = await fetch('https://api.elevenlabs.io/v1/history', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': apiKey
        }
      });
      
      if (!historyResponse.ok) {
        throw new PodcastError(
          `Failed to get history from ElevenLabs: ${historyResponse.status}`,
          'getAudioFromElevenLabsHistory',
          { status: historyResponse.status }
        );
      }
      
      const historyData = await historyResponse.json();
      
      if (!historyData.history || !Array.isArray(historyData.history)) {
        throw new PodcastError(
          'Invalid history data from ElevenLabs',
          'getAudioFromElevenLabsHistory',
          historyData
        );
      }
      
      console.log(`[PodcastService] Found ${historyData.history.length} items in history`);
      
      // Try to find the matching history item
      // Look for items with matching voice ID and a title/text that matches our podcast
      // Since podcasts are large, we might need to filter by voice ID and look at recent items
      // Items are typically sorted with newest first
      const potentialMatches = historyData.history
        .filter((item: any) => item.voice_id === voiceId)
        .slice(0, 10); // Look at the 10 most recent items
      
      if (potentialMatches.length === 0) {
        console.log(`[PodcastService] No history items found for voice ${voiceId}`);
        return null;
      }
      
      console.log(`[PodcastService] Found ${potentialMatches.length} potential matches for voice ${voiceId}`);
      
      // Assuming the most recent matching voice ID is our podcast
      // This is a reasonable assumption if we're checking right after generation
      const historyItem = potentialMatches[0];
      
      if (!historyItem.history_item_id) {
        throw new PodcastError(
          'History item has no ID',
          'getAudioFromElevenLabsHistory',
          historyItem
        );
      }
      
      // Download the actual audio file
      console.log(`[PodcastService] Downloading audio for history item ${historyItem.history_item_id}`);
      const audioResponse = await fetch(`https://api.elevenlabs.io/v1/history/${historyItem.history_item_id}/audio`, {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey
        }
      });
      
      if (!audioResponse.ok) {
        throw new PodcastError(
          `Failed to download audio from ElevenLabs: ${audioResponse.status}`,
          'getAudioFromElevenLabsHistory',
          { status: audioResponse.status }
        );
      }
      
      if (!audioResponse.body) {
        throw new PodcastError(
          'Audio response has no body',
          'getAudioFromElevenLabsHistory'
        );
      }
      
      // Create a buffer from the audio stream
      console.log(`[PodcastService] Converting audio stream to buffer`);
      
      // Convert ReadableStream to Node.js Readable stream
      const readableNodeStream = new Readable();
      readableNodeStream._read = () => {}; // Required but we don't need to implement it
      
      const reader = audioResponse.body.getReader();
      reader.read().then(function processText({ done, value }): any {
        if (done) {
          readableNodeStream.push(null);
          return;
        }
        readableNodeStream.push(Buffer.from(value));
        return reader.read().then(processText);
      });
      
      // Convert the stream to a buffer
      const audioBuffer = await streamToBuffer(readableNodeStream);
      console.log(`[PodcastService] Created audio buffer of size ${audioBuffer.length} bytes`);
      
      // Upload to storage and get public URL
      console.log(`[PodcastService] Uploading audio to storage`);
      const { publicUrl } = await this.uploadAudioToStorage(organizationId, audioBuffer);
      
      // Update the podcast record with the public URL
      console.log(`[PodcastService] Updating podcast record with storage URL: ${publicUrl}`);
      await this.updateRecordWithSuccess(recordId, publicUrl);
      
      return publicUrl;
    } catch (error) {
      console.error(`[PodcastService] Error getting audio from history:`, error);
      if (error instanceof PodcastError) {
        throw error;
      }
      throw new PodcastError(
        `Unexpected error getting audio from history: ${(error as Error).message}`,
        'getAudioFromElevenLabsHistory',
        error
      );
    }
  }
} 