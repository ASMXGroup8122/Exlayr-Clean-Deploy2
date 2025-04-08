'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { DocumentAnalysisProvider } from '@/contexts/DocumentAnalysisContext';
import CollaborativeDocumentReview from '@/components/documents/CollaborativeDocumentReview';

function DocumentReviewContent() {
    const params = useParams();
    const documentId = params?.id as string;

    if (!documentId) {
        return <div>Invalid document ID</div>;
    }

    return (
        <DocumentAnalysisProvider documentId={documentId}>
            <CollaborativeDocumentReview documentId={documentId} />
        </DocumentAnalysisProvider>
    );
}

export default function DocumentReviewPage() {
    return (
        <div className="h-full">
            <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            }>
                <DocumentReviewContent />
            </Suspense>
        </div>
    );
} 