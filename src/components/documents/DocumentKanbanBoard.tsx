'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { KanbanColumn } from './KanbanColumn';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { DocumentCard } from './DocumentCard';

interface Document {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  sponsor?: string;
  listing_type?: string;
}

interface KanbanBoardProps {
  onDocumentSelect: (documentId: string) => void;
}

type ColumnId = 'pending' | 'in_review' | 'approved' | 'listed';

const columnColors: Record<ColumnId, string> = {
  pending: 'bg-gray-50 hover:bg-gray-100',
  in_review: 'bg-blue-50 hover:bg-blue-100',
  approved: 'bg-green-50 hover:bg-green-100',
  listed: 'bg-purple-50 hover:bg-purple-100'
};

const columnTitles: Record<ColumnId, string> = {
  pending: 'Pending Review',
  in_review: 'In Review',
  approved: 'Approved',
  listed: 'Listed'
};

export default function DocumentKanbanBoard({ onDocumentSelect }: KanbanBoardProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);
  const supabase = getSupabaseClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      // 2. Get user's organization_id from public.users
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (userDataError) throw userDataError;
      if (!userData?.organization_id) throw new Error('No organization found');

      // 3. Get exchange name using organization_id
      const { data: exchange, error: exchangeError } = await supabase
        .from('exchange')
        .select('exchange_name')
        .eq('id', userData.organization_id)
        .single();

      if (exchangeError) throw exchangeError;

      // 4. Get listings for this exchange
      const { data: listings, error: listingsError } = await supabase
        .from('listing')
        .select(`
          instrumentid,
          instrumentname,
          instrumentsponsor,
          instrumentsecuritiesadmissionstatus,
          instrumentupdatedat,
          instrumentlistingtype
        `)
        .eq('instrumentexchange', exchange.exchange_name);

      if (listingsError) throw listingsError;

      const formattedDocs = (listings || []).map(doc => ({
        id: doc.instrumentid,
        title: doc.instrumentname,
        status: mapStatusToUI(doc.instrumentsecuritiesadmissionstatus),
        updated_at: doc.instrumentupdatedat,
        sponsor: doc.instrumentsponsor,
        listing_type: doc.instrumentlistingtype
      }));

      setDocuments(formattedDocs);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const mapStatusToUI = (dbStatus: string | null): ColumnId => {
    switch (dbStatus?.toLowerCase()) {
      case 'draft': return 'in_review';
      case 'pending': return 'pending';
      case 'approved': return 'approved';
      case 'listed': return 'listed';
      default: return 'pending';
    }
  };

  const mapUIStatusToDb = (uiStatus: ColumnId): string => {
    switch (uiStatus) {
      case 'in_review': return 'draft';
      case 'pending': return 'pending';
      case 'approved': return 'approved';
      case 'listed': return 'listed';
      default: return 'pending';
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const draggedDoc = documents.find(doc => doc.id === active.id);
    if (draggedDoc) {
      setActiveDocument(draggedDoc);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDocument(null);

    if (!over) return;

    const activeDoc = documents.find(doc => doc.id === active.id);
    const overColumn = over.id as ColumnId;

    if (!activeDoc || activeDoc.status === overColumn) return;

    try {
      // Optimistically update the UI
      setDocuments(docs => 
        docs.map(doc => 
          doc.id === activeDoc.id 
            ? { ...doc, status: overColumn }
            : doc
        )
      );

      // Update in Supabase
      const { error: updateError } = await supabase
        .from('listing')
        .update({
          instrumentsecuritiesadmissionstatus: mapUIStatusToDb(overColumn)
        })
        .eq('instrumentid', activeDoc.id);

      if (updateError) {
        console.error('Error updating document status:', updateError);
        // Revert changes on error
        fetchDocuments();
        return;
      }
    } catch (err) {
      console.error('Error updating document status:', err);
      // Revert changes if update fails
      fetchDocuments();
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveDocument(null);
  };

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => fetchDocuments()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  const columns: ColumnId[] = ['pending', 'in_review', 'approved', 'listed'];

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="overflow-x-auto p-4">
        <div className="min-w-[1200px] grid grid-cols-4 gap-4">
          {columns.map(columnId => (
            <div 
              key={columnId}
              className={`rounded-lg p-4 ${columnColors[columnId]} transition-colors duration-200`}
            >
              <h3 className="font-medium mb-4 flex items-center justify-between">
                <span>{columnTitles[columnId]}</span>
                <span className="text-sm text-gray-500">
                  {documents.filter(doc => doc.status === columnId).length}
                </span>
              </h3>
              <KanbanColumn
                id={columnId}
                documents={documents.filter(doc => doc.status === columnId)}
                onDocumentSelect={onDocumentSelect}
              />
            </div>
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeDocument ? (
          <div className="transform-none">
            <DocumentCard
              document={activeDocument}
              onSelect={() => {}}
              isDragging={true}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
} 