'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChevronRight, FileText, CheckCircle, Lock, Sparkles } from 'lucide-react';
import { type Section } from './types';

interface TableOfContentsProps {
  sections: Section[];
  activeSection: string | null;
  onSectionSelect: (sectionId: string) => void;
}

export default function TableOfContents({
  sections,
  activeSection,
  onSectionSelect,
}: TableOfContentsProps) {
  const getStatusIcon = (status: Section['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'locked':
        return <Lock className="w-4 h-4 text-gray-500" />;
      case 'ai reviewed':
        return <Sparkles className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="font-semibold mb-4">Table of Contents</h2>
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionSelect(section.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors',
                'text-left',
                activeSection === section.id && 'bg-accent'
              )}
            >
              <ChevronRight className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{section.title}</span>
              {getStatusIcon(section.status)}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 
