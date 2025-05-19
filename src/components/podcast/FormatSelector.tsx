'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

export type PodcastFormat = 'single' | 'conversation';

interface FormatSelectorProps {
  value: PodcastFormat;
  onChange: (value: PodcastFormat) => void;
  isConversationComingSoon?: boolean;
}

export function FormatSelector({ value, onChange, isConversationComingSoon }: FormatSelectorProps) {
  const handleFormatChange = (selectedValue: string) => {
    if (isConversationComingSoon && selectedValue === 'conversation') {
      return;
    }
    onChange(selectedValue as PodcastFormat);
  };

  return (
    <div className="mb-6">
      <Label className="text-base font-medium mb-2 block">Podcast Format</Label>
      <RadioGroup
        value={value}
        onValueChange={handleFormatChange}
        className="flex space-x-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="single" id="format-single" />
          <Label htmlFor="format-single" className="font-normal">
            Single Voice (Bulletin)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="conversation"
            id="format-conversation"
            disabled={isConversationComingSoon}
          />
          <Label htmlFor="format-conversation" className={`font-normal ${isConversationComingSoon ? 'text-gray-400' : ''}`}>
            Conversation (Multiple Voices)
            {isConversationComingSoon && (
              <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-700 border-amber-300">Coming Soon</Badge>
            )}
          </Label>
        </div>
      </RadioGroup>
      <p className="text-xs text-gray-500 mt-2">
        Choose 'Single Voice' for a monologue or news-style podcast. Choose 'Conversation' for a dialogue between two voices.
      </p>
    </div>
  );
} 