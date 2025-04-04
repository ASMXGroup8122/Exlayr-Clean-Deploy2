'use client';

import { Button } from '@/components/ui/button';
import { Plus, Send } from 'lucide-react';
import { KeyboardEvent, ChangeEvent } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  placeholder = 'Type a message...',
  disabled = false
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="p-6">
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={disabled}
        >
          <Plus className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full px-4 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            autoComplete="off"
          />
        </div>
        <Button
          variant="default"
          size="icon"
          className="shrink-0"
          onClick={onSend}
          disabled={disabled || !value.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
} 