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

    const fetchCustomVoices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log(`[VoiceSelector] Fetching custom voices for organization: ${organizationId}`);
        const { data, error: dbError } = await supabase
          .from('spoken_voice')
          .select('id, name, voice_id')
          .eq('organization_id', organizationId)
          .order('name', { ascending: true });

        if (dbError) {
          console.error('[VoiceSelector] Error fetching from spoken_voice:', dbError);
          throw dbError;
        }
        
        console.log(`[VoiceSelector] Found ${data?.length || 0} custom voice(s) in database`);
        setVoices(data || []);
      } catch (err) {
        const errorMessage = (err as Error).message || 'Could not load your voice profiles.';
        console.error('[VoiceSelector] Error fetching custom voices:', err);
        setError(errorMessage);
        // Do not toast here, as we might still load ElevenLabs voices successfully
      } finally {
        setIsLoading(false); // Only stop general loading indicator after custom voices attempt
      }
    };
    
    // Call to fetch ElevenLabs standard voices, moved to be called consistently
    fetchCustomVoices().finally(() => {
        // Always try to fetch ElevenLabs voices regardless of custom voices outcome
        // This ensures standard options are available.
        // We can pass the count of custom voices if a specific condition like 
        // "only fetch standard if custom < X" is strictly needed later,
        // but for now, fetching both provides more options.
        fetchElevenLabsVoices();
    });

  }, [organizationId, supabase]); // supabase removed from deps if fetchElevenLabsVoices is stable w.r.t it

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
      
      // Transform the data
      const transformedVoices: ElevenLabsVoice[] = data.voices.map((apiVoice: any) => ({
        voice_id: apiVoice.voice_id,
        name: apiVoice.name
      }));
      
      // Ensure transformedVoices are unique by voice_id before setting state
      const voiceMap = new Map<string, ElevenLabsVoice>();
      for (const voice of transformedVoices) {
        if (voice.voice_id) {
          voiceMap.set(voice.voice_id, voice);
        }
      }
      const uniqueElevenLabsVoices: ElevenLabsVoice[] = Array.from(voiceMap.values());
      
      setElevenLabsVoices(uniqueElevenLabsVoices);
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
  const noCustomVoices = voices.length === 0;
  const noElevenLabsVoices = elevenLabsVoices.length === 0;
  const noVoicesAvailable = !isLoadingVoices && noCustomVoices && noElevenLabsVoices; // True if both lists are empty after loading

  // Filter elevenLabsVoices to exclude any voices already present in the custom voices list
  const customVoiceIds = new Set(voices.map(v => v.voice_id));
  const filteredElevenLabsVoices = elevenLabsVoices.filter(elv => !customVoiceIds.has(elv.voice_id));

  // Recalculate noElevenLabsVoices based on the filtered list for display purposes
  const noFilteredElevenLabsVoices = filteredElevenLabsVoices.length === 0;
  // Update noVoicesAvailable based on filtered list
  const trulyNoVoicesAvailable = !isLoadingVoices && noCustomVoices && noFilteredElevenLabsVoices;

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={`voice-selector-${label.toLowerCase().replace(/\s+/g, '-')}`}>{label}</Label>
      <Select
        value={selectedVoiceId === null ? '' : selectedVoiceId}
        onValueChange={(value) => onVoiceChange(value || null)}
        disabled={isLoadingVoices || trulyNoVoicesAvailable}
      >
        <SelectTrigger id={`voice-selector-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          <SelectValue placeholder={isLoadingVoices ? 'Loading voices...' : (trulyNoVoicesAvailable ? 'No voices available' : 'Select a voice')} />
        </SelectTrigger>
        <SelectContent 
          className="max-h-[400px] overflow-y-auto"
        >
          {isLoadingVoices && (
            <SelectItem value="loading" disabled>
              Loading voices...
            </SelectItem>
          )}
          {trulyNoVoicesAvailable && (
            <SelectItem value="no-voices" disabled>
              No voices found. Check Knowledge Vault or ElevenLabs connection.
            </SelectItem>
          )}
          
          {voices.length > 0 && (
            <>
              <SelectItem value="custom-voices-header" disabled className="font-semibold text-xs uppercase text-gray-500 pt-2 pb-1">
                Your Voice Profiles
              </SelectItem>
              {voices.map((voice) => (
                <SelectItem key={`custom-${voice.id}`} value={voice.voice_id}>
                  {voice.name}
                </SelectItem>
              ))}
              {/* Add a separator if both custom and filtered ElevenLabs voices are present */}
              {filteredElevenLabsVoices.length > 0 && <SelectItem value="separator-1" disabled className="h-px bg-gray-200 my-1 p-0" />} 
            </>
          )}
          
          {/* Always show filtered ElevenLabs voices if available, regardless of custom voices */}
          {filteredElevenLabsVoices.length > 0 && (
            <>
              <SelectItem value="elevenlabs-voices-header" disabled className="font-semibold text-xs uppercase text-gray-500 pt-2 pb-1">
                Standard ElevenLabs Voices
              </SelectItem>
              {filteredElevenLabsVoices.map((voice) => (
                <SelectItem key={`el-${voice.voice_id}`} value={voice.voice_id}>
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
      {trulyNoVoicesAvailable && !error && (
         <p className="text-xs text-gray-500">
            No voice profiles found. Please add them in the <Link href={`/dashboard/sponsor/${organizationId}/knowledge-vault?tab=spoken-voice`} className="text-blue-600 hover:underline">Knowledge Vault</Link> or check your ElevenLabs connection.
        </p>
      )}
    </div>
  );
} 
