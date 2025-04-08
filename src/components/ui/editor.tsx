import React from 'react';
import { cn } from '@/lib/utils';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function Editor({ content, onChange, placeholder, className }: EditorProps) {
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full min-h-[200px] p-4 rounded-md border resize-y",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        className
      )}
    />
  );
} 