'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type PodcastFormat = 'single' | 'conversation';

interface FormatSelectorProps {
  value: PodcastFormat;
  onChange: (value: PodcastFormat) => void;
}

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div className="mb-6">
      <Label className="text-base font-medium mb-2 block">Podcast Format</Label>
      <RadioGroup
        value={value}
        onValueChange={(selectedValue) => onChange(selectedValue as PodcastFormat)}
        className="flex space-x-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="single" id="format-single" />
          <Label htmlFor="format-single" className="font-normal">
            Single Voice (Bulletin)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="conversation" id="format-conversation" />
          <Label htmlFor="format-conversation" className="font-normal">
            Conversation (Multiple Voices)
          </Label>
        </div>
      </RadioGroup>
      <p className="text-xs text-gray-500 mt-2">
        Choose 'Single Voice' for a monologue or news-style podcast. Choose 'Conversation' for a dialogue between two voices.
      </p>
    </div>
  );
} 