'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DocumentCard } from './DocumentCard';

interface Document {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  sponsor?: string;
  listing_type?: string;
  feedback_count?: number;
  sections_reviewed?: number;
  total_sections?: number;
  analysis_status?: 'pending' | 'in_progress' | 'completed';
}

interface SortableDocumentCardProps {
  document: Document;
  onSelect: () => void;
}

export function SortableDocumentCard({ document, onSelect }: SortableDocumentCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: document.id,
    data: document
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <DocumentCard
        document={document}
        onSelect={onSelect}
        isDragging={isDragging}
      />
    </div>
  );
} 