import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { IssuerDetailClient } from './IssuerDetailClient';

type PageProps = {
    params: { id: string };
    searchParams: { [key: string]: string | string[] | undefined };
};

// Prevent caching of this page
export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function getIssuerData(issuerId: string) {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({
        cookies: () => cookieStore
    });

    // Ensure session exists
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('No auth session found');
    }

    try {
        // Get issuer data
        const { data: issuer, error: issuerError } = await supabase
                .from('issuers')
                .select('*')
            .eq('id', issuerId)
                .single();

            if (issuerError) {
            console.error('Issuer fetch error:', issuerError);
                throw issuerError;
            }

        if (!issuer) {
            throw new Error('Issuer not found');
        }

        // Get documents
        const { data: documents, error: documentsError } = await supabase
            .from('issuer_documents')
            .select('*')
            .eq('issuer_id', issuerId)
            .order('created_at', { ascending: false });

            if (documentsError) {
            console.error('Documents fetch error:', documentsError);
            throw documentsError;
        }

        return {
            issuer,
            documents: documents || []
        };
        } catch (error) {
        console.error('Error fetching issuer data:', error);
        throw error;
    }
}

export default async function IssuerDetailPage({ params }: PageProps) {
    const issuerId = params.id;

    try {
        const { issuer, documents } = await getIssuerData(issuerId);

        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Suspense fallback={<div>Loading...</div>}>
                    <IssuerDetailClient
                        initialIssuer={issuer}
                        initialDocuments={documents}
                        id={issuerId}
                    />
                </Suspense>
            </div>
        );
    } catch (error) {
        console.error('Error in IssuerDetailPage:', error);
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    Error loading issuer details. Please try refreshing the page.
                </div>
            </div>
        );
    }
} 