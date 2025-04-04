import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { SponsorDetailClient } from './SponsorDetailClient';

type PageProps = {
    params: { id: string };
    searchParams: { [key: string]: string | string[] | undefined };
};

export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function getSponsorData(sponsorId: string) {
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
        // Get sponsor data
        const { data: sponsor, error: sponsorError } = await supabase
            .from('exchange_sponsor')
            .select('*')
            .eq('id', sponsorId)
            .single();

        if (sponsorError) throw sponsorError;

        // Get documents
        const { data: documents, error: docsError } = await supabase
            .from('exchange_sponsor_documents')
            .select('*')
            .eq('entity_type', 'sponsor')
            .eq('entity_id', sponsorId)
            .order('created_at', { ascending: false });

        if (docsError) throw docsError;

        return { sponsor, documents };
    } catch (error) {
        console.error('Error fetching sponsor data:', error);
        throw error;
    }
}

export default async function SponsorDetailPage({ params }: PageProps) {
    const sponsorId = params.id;
    const { sponsor, documents } = await getSponsorData(sponsorId);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Suspense fallback={<div>Loading...</div>}>
                <SponsorDetailClient 
                    initialSponsor={sponsor} 
                    initialDocuments={documents} 
                    id={sponsorId}
                />
            </Suspense>
        </div>
    );
} 