import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { ExchangeDetailClient } from './ExchangeDetailClient';

interface PageProps {
    params: {
        id: string;
    };
    searchParams: { [key: string]: string | string[] | undefined };
}

// Prevent caching of this page
export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function getExchangeData(exchangeId: string) {
    const supabase = createServerComponentClient({
        cookies: () => cookies()
    });

    // Ensure session exists
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('No auth session found');
    }

    try {
        // Get exchange data
        const { data: exchange, error: exchangeError } = await supabase
            .from('exchange')
            .select('*')
            .eq('id', exchangeId)
            .single();

        if (exchangeError) {
            console.error('Exchange fetch error:', exchangeError);
            throw exchangeError;
        }

        if (!exchange) {
            throw new Error('Exchange not found');
        }

        // Get documents
        const { data: documents, error: documentsError } = await supabase
            .from('exchange_documents')
            .select('*')
            .eq('entity_type', 'exchange')
            .eq('entity_id', exchangeId)
            .order('created_at', { ascending: false });

        if (documentsError) {
            console.error('Documents fetch error:', documentsError);
            throw documentsError;
        }

        // Get exchange members
        const { data: members, error: membersError } = await supabase
            .from('exchange_member_view')
            .select('*')
            .eq('exchange_id', exchangeId);

        if (membersError) {
            console.error('Members fetch error:', membersError);
            throw membersError;
        }

        return {
            exchange,
            documents: documents || [],
            members: members || []
        };
    } catch (error) {
        console.error('Error fetching exchange data:', error);
        throw error;
    }
}

export default async function ExchangeDetailPage({ params }: PageProps) {
    try {
        const { exchange, documents, members } = await getExchangeData(await params.id);

        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Suspense fallback={<div>Loading...</div>}>
                    <ExchangeDetailClient
                        initialExchange={exchange}
                        initialDocuments={documents}
                        initialMembers={members}
                        id={params.id}
                    />
                </Suspense>
            </div>
        );
    } catch (error) {
        console.error('Error in ExchangeDetailPage:', error);
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    Error loading exchange details. Please try refreshing the page.
                </div>
            </div>
        );
    }
} 