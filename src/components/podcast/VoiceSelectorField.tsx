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
  const [isLoading, setIsLoading] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!organizationId) return;

    const fetchVoices = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('spoken_voice')
          .select('id, name, voice_id')
          .eq('organization_id', organizationId)
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }
        setVoices(data || []);
      } catch (error) {
        console.error('Error fetching voices:', error);
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

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={`voice-selector-${label.toLowerCase().replace(/\s+/g, '-')}`}>{label}</Label>
      <Select
        value={selectedVoiceId || ''}
        onValueChange={(value) => onVoiceChange(value || null)}
        disabled={isLoading || voices.length === 0}
      >
        <SelectTrigger id={`voice-selector-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          <SelectValue placeholder={isLoading ? 'Loading voices...' : (voices.length === 0 ? 'No voices available' : 'Select a voice')} />
        </SelectTrigger>
        <SelectContent>
          {voices.length === 0 && !isLoading && (
            <SelectItem value="no-voices" disabled>
              No voices found. Please create voices in Knowledge Vault.
            </SelectItem>
          )}
          {voices.map((voice) => (
            <SelectItem key={voice.id} value={voice.voice_id}>
              {voice.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {voices.length === 0 && !isLoading && (
         <p className="text-xs text-gray-500">
            No voice profiles found for this organization. Please add them in the <Link href={`/dashboard/sponsor/${organizationId}/knowledge-vault?tab=spoken-voice`} className="text-blue-600 hover:underline">Knowledge Vault</Link>.
        </p>
      )}
    </div>
  );
} 