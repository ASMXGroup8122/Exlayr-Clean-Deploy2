'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DocumentAnalysisProvider } from '@/contexts/DocumentAnalysisContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import DocumentKanbanBoard from '@/components/documents/DocumentKanbanBoard';
import DocumentSectionReview from '@/components/documents/DocumentSectionReview/index';

export default function DocumentReviewPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const documentId = params?.id;
    const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = getSupabaseClient();

    useEffect(() => {
        if (!documentId) {
            setError('Document ID not found in URL params.');
            setLoading(false);
            return;
        }

        async function validateDocument() {
            try {
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

                // 3. Verify document exists
                const { data: document, error: documentError } = await supabase
                    .from('listing')
                    .select('instrumentid')
                    .eq('instrumentid', documentId)
                    .single();

                if (documentError) throw documentError;
                if (!document) throw new Error('Document not found');

                setSelectedDocument(documentId);
                setError(null);
            } catch (err) {
                console.error('Error validating document access:', err);
                setError(err instanceof Error ? err.message : 'Failed to validate document access');
            } finally {
                setLoading(false);
            }
        }

        setLoading(true);
        validateDocument();
    }, [supabase, documentId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
                <Button onClick={() => router.push('/dashboard')}>
                    Return to Dashboard
                </Button>
            </div>
        );
    }

    if (documentId) {
        return (
            <DocumentAnalysisProvider documentId={documentId}>
                <DocumentSectionReview documentId={documentId} />
            </DocumentAnalysisProvider>
        );
    }

    return <div className="p-4">Invalid state or missing Document ID.</div>;
} 