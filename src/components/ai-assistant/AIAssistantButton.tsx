'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import ListingAIAssistant from './ListingAIAssistant';

interface AIAssistantButtonProps {
  documentId?: string | null;
  currentSection?: {
    id: string;
    title: string;
    content: string;
  } | null;
}

export default function AIAssistantButton({
  documentId,
  currentSection
}: AIAssistantButtonProps) {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const toggleAssistant = () => {
    setIsAssistantOpen(!isAssistantOpen);
  };

  return (
    <>
      <button
        onClick={toggleAssistant}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
        title="AI Assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <ListingAIAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        documentId={documentId}
        currentSection={currentSection}
      />
    </>
  );
} 