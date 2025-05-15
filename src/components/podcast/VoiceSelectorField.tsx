'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';

interface SpokenVoice {
  id: string;
  name: string;
  voice_id: string; // ElevenLabs Voice ID
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
}

interface VoiceSelectorFieldProps {
  label: string;
  organizationId: string;
  selectedVoiceId: string | null;
  onVoiceChange: (voiceId: string | null) => void;
  className?: string;
}

export function VoiceSelectorField({
  label,
  organizationId,
  selectedVoiceId,
  onVoiceChange,
  className,
}: VoiceSelectorFieldProps) {
  const [voices, setVoices] = useState<SpokenVoice[]>([]);
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingElevenLabsVoices, setLoadingElevenLabsVoices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!organizationId) return;

    const fetchVoices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log(`[VoiceSelector] Fetching voices for organization: ${organizationId}`);
        const { data, error } = await supabase
          .from('spoken_voice')
          .select('id, name, voice_id')
          .eq('organization_id', organizationId)
          .order('name', { ascending: true });

        if (error) {
          console.error('[VoiceSelector] Error fetching from spoken_voice:', error);
          throw error;
        }
        
        console.log(`[VoiceSelector] Found ${data?.length || 0} custom voice(s) in database`);
        setVoices(data || []);
        
        // If no custom voices found, fetch from ElevenLabs API
        if (!data || data.length === 0) {
          fetchElevenLabsVoices();
        }
      } catch (error) {
        console.error('[VoiceSelector] Error fetching voices:', error);
        setError((error as Error).message || 'Could not load voice profiles.');
        toast({
          title: 'Error fetching voices',
          description: (error as Error).message || 'Could not load voice profiles.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoices();
  }, [organizationId, supabase]);

  const fetchElevenLabsVoices = async () => {
    setLoadingElevenLabsVoices(true);
    try {
      console.log('[VoiceSelector] Fetching voices directly from ElevenLabs');
      
      // First check oauth_tokens (preferred source)
      const { data: oauthToken, error: oauthError } = await supabase
        .from('oauth_tokens')
        .select('access_token')
        .eq('organization_id', organizationId)
        .eq('provider', 'elevenlabs')
        .maybeSingle();
        
      if (oauthError) {
        console.error('[VoiceSelector] Error fetching from oauth_tokens:', oauthError);
      }
      
      let apiKey = oauthToken?.access_token;
      
      // If not found in oauth_tokens, fall back to organization_settings
      if (!apiKey) {
        console.log('[VoiceSelector] API key not found in oauth_tokens, checking organization_settings');
        const { data: settingsData, error: settingsError } = await supabase
          .from('organization_settings')
          .select('elevenlabs_api_key')
          .eq('organization_id', organizationId)
          .maybeSingle();
          
        if (settingsError) {
          console.error('[VoiceSelector] Error fetching API key from settings:', settingsError);
        }
        
        apiKey = settingsData?.elevenlabs_api_key;
      }
      
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }
      
      // Fetch voices from ElevenLabs API
      const response = await fetch('/api/elevenlabs/list-voices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch voices from ElevenLabs');
      }
      
      const data = await response.json();
      console.log(`[VoiceSelector] Found ${data.voices?.length || 0} voices from ElevenLabs API`);
      
      // Transform the data to match our format
      const transformedVoices = data.voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name
      }));
      
      setElevenLabsVoices(transformedVoices || []);
    } catch (error) {
      console.error('[VoiceSelector] Error fetching ElevenLabs voices:', error);
      toast({
        title: 'Error fetching ElevenLabs voices',
        description: (error as Error).message || 'Could not load voices from ElevenLabs.',
        variant: 'destructive',
      });
    } finally {
      setLoadingElevenLabsVoices(false);
    }
  };

  // Determine which voices to display
  const displayVoices = voices.length > 0 ? voices : elevenLabsVoices;
  const isLoadingVoices = isLoading || loadingElevenLabsVoices;
  const noVoicesAvailable = !isLoadingVoices && displayVoices.length === 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={`voice-selector-${label.toLowerCase().replace(/\s+/g, '-')}`}>{label}</Label>
      <Select
        value={selectedVoiceId || ''}
        onValueChange={(value) => onVoiceChange(value || null)}
        disabled={isLoadingVoices || noVoicesAvailable}
      >
        <SelectTrigger id={`voice-selector-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          <SelectValue placeholder={isLoadingVoices ? 'Loading voices...' : (noVoicesAvailable ? 'No voices available' : 'Select a voice')} />
        </SelectTrigger>
        <SelectContent>
          {noVoicesAvailable && (
            <SelectItem value="no-voices" disabled>
              No voices found. Please create voices in Knowledge Vault.
            </SelectItem>
          )}
          
          {voices.length > 0 && (
            <>
              <SelectItem value="custom-voices-header" disabled className="font-semibold text-xs uppercase text-gray-500">
                Your Voice Profiles
              </SelectItem>
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.voice_id}>
                  {voice.name}
                </SelectItem>
              ))}
            </>
          )}
          
          {voices.length === 0 && elevenLabsVoices.length > 0 && (
            <>
              <SelectItem value="elevenlabs-voices-header" disabled className="font-semibold text-xs uppercase text-gray-500">
                ElevenLabs Voices
              </SelectItem>
              {elevenLabsVoices.map((voice) => (
                <SelectItem key={voice.voice_id} value={voice.voice_id}>
                  {voice.name}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      
      {error && (
        <p className="text-xs text-red-500">
          Error: {error}
        </p>
      )}
      
      {noVoicesAvailable && !error && (
         <p className="text-xs text-gray-500">
            No voice profiles found. Please add them in the <Link href={`/dashboard/sponsor/${organizationId}/knowledge-vault?tab=spoken-voice`} className="text-blue-600 hover:underline">Knowledge Vault</Link> or check your ElevenLabs connection.
        </p>
      )}
    </div>
  );
} 