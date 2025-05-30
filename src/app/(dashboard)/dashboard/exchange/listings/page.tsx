'use client';

import React from 'react';
import DocumentKanbanBoard from '@/components/documents/DocumentKanbanBoard';
import { useRouter } from 'next/navigation';

export default function ListingsPage() {
    const router = useRouter();

    const handleDocumentSelect = (documentId: string) => {
        router.push(`/dashboard/exchange/listings/${documentId}/documents`);
    };

    return (
        <div className="h-full p-4">
            <DocumentKanbanBoard onDocumentSelect={handleDocumentSelect} />
        </div>
    );
} 
