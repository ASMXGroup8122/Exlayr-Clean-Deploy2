'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DocumentAnalysisProvider } from '@/contexts/DocumentAnalysisContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import CollaborativeDocumentReview from '@/components/documents/CollaborativeDocumentReview';
import DocumentKanbanBoard from '@/components/documents/DocumentKanbanBoard';

export default function ExchangeDocumentsPage({
    params
}: {
    params: { id: string }
}) {
    const router = useRouter();
    const exchangeId = params.id;
    const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = getSupabaseClient();

    // Validate user has exchange access
    useEffect(() => {
        if (!exchangeId) {
            setError('No exchange ID provided');
            setLoading(false);
            return;
        }

        async function validateExchange() {
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

                // 3. Verify exchange exists
                const { data: exchange, error: exchangeError } = await supabase
                    .from('exchange')
                    .select('id, exchange_name')
                    .eq('id', exchangeId)
                    .single();

                if (exchangeError) throw exchangeError;
                if (!exchange) throw new Error('Exchange not found');

                setError(null);
            } catch (err) {
                console.error('Error validating exchange access:', err);
                setError(err instanceof Error ? err.message : 'Failed to validate exchange access');
            } finally {
                setLoading(false);
            }
        }

        setLoading(true);
        validateExchange();
    }, [supabase, exchangeId]);

    const handleDocumentSelect = (documentId: string) => {
        setSelectedDocument(documentId);
    };

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

    if (selectedDocument) {
        return (
            <div className="h-full">
                <DocumentAnalysisProvider documentId={selectedDocument}>
                    <CollaborativeDocumentReview documentId={selectedDocument} />
                </DocumentAnalysisProvider>
            </div>
        );
    }

    return (
        <div className="h-full p-4">
            <DocumentKanbanBoard onDocumentSelect={handleDocumentSelect} />
        </div>
    );
} 