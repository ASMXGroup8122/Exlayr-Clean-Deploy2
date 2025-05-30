'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableDocumentCard } from './SortableDocumentCard';
import { motion } from 'framer-motion';
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

interface KanbanColumn {
  id: 'pending' | 'in_review' | 'approved' | 'listed';
  title: string;
  documents: Document[];
}

interface KanbanColumnProps {
  id: string;
  documents: Document[];
  onDocumentSelect: (documentId: string) => void;
}

export function KanbanColumn({ id, documents, onDocumentSelect }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id
  });

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        min-h-[calc(100vh-12rem)] rounded-lg 
        ${isOver ? 'bg-blue-50/50 ring-2 ring-blue-500/50' : 'bg-transparent'}
        transition-colors duration-200
      `}
    >
      <SortableContext items={documents.map(doc => doc.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 p-2">
          {documents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-8"
            >
              <p className="text-gray-500 text-sm">No documents</p>
            </motion.div>
          ) : (
            <motion.div layout className="space-y-3">
              {documents.map(doc => (
                <SortableDocumentCard
                  key={doc.id}
                  document={doc}
                  onSelect={() => onDocumentSelect(doc.id)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </SortableContext>
    </motion.div>
  );
} 
