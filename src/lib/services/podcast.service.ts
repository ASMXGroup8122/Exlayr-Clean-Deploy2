import { getSupabaseClient } from '@/lib/supabase/client';
import { ElevenLabsClient } from 'elevenlabs';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

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
  script_text: string;
  format: 'single' | 'conversation';
  status: 'processing' | 'completed' | 'failed';
  title: string;
  audio_url?: string;
  error_message?: string;
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
        script_text: params.script,
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
          error_message: errorMessage
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
      const { data, error } = await supabase
        .from('organization_settings')
        .select('elevenlabs_api_key')
        .eq('organization_id', organizationId)
        .single();
        
      if (error) {
        throw new PodcastError(
          `Failed to fetch organization settings: ${error.message}`, 
          'getOrganizationApiKey',
          error
        );
      }
      
      if (!data?.elevenlabs_api_key) {
        throw new PodcastError(
          'ElevenLabs API key not configured for this organization',
          'getOrganizationApiKey'
        );
      }
      
      return data.elevenlabs_api_key;
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
        return {
          status: 'done',
          progress: 1,
          audioUrl: data.project.url
        };
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
} 