import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import ClientDetailClient from './ClientDetailClient'; // Updated import name
import type { Database } from '@/types/supabase'; // Assuming Database types are defined here

/**
 * Props for the ClientDetailPage server component.
 */
type PageProps = {
    params: {
        /** The organization ID of the sponsor viewing the client. */
        orgId: string;
        /** The unique ID of the client (issuer) being viewed. */
        issuerId: string;
    };
    searchParams: { [key: string]: string | string[] | undefined };
};

// Prevent caching of this page to ensure fresh data
export const revalidate = 0;
export const dynamic = 'force-dynamic';

/**
 * Fetches detailed data for a specific issuer (client) and their associated documents.
 * Uses server-side Supabase client with cookie handling.
 * @param issuerId - The ID of the issuer to fetch data for.
 * @returns A promise that resolves to an object containing the issuer and documents data.
 * @throws If authentication fails, issuer is not found, or a database error occurs.
 */
async function getIssuerData(issuerId: string) {
    const cookieStore = cookies();
    // Explicitly type the Supabase client
    const supabase = createServerComponentClient<Database>({
        cookies: () => cookieStore
    });

    // Optional: Ensure session exists if needed for authorization, though sponsor context might be enough
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // Handle appropriately - redirect or error
        throw new Error('Authentication required.');
    }

    try {
        // Get issuer data using the provided issuerId
        const { data: issuer, error: issuerError } = await supabase
                .from('issuers')
                .select('*') // Fetch all columns for detail view
                .eq('id', issuerId)
                .single();

        if (issuerError) {
            console.error('Issuer fetch error:', issuerError);
            throw issuerError;
        }

        if (!issuer) {
            throw new Error('Issuer (Client) not found');
        }

        // Fetch related documents if needed for the client detail view
        // (Assuming issuer_documents table and structure is relevant)
        const { data: documents, error: documentsError } = await supabase
            .from('issuer_documents') // Assuming this table is needed
            .select('*')
            .eq('issuer_id', issuerId)
            .order('created_at', { ascending: false });

        if (documentsError) {
            console.error('Client Documents fetch error:', documentsError);
            // Decide if this is a critical error or just show no documents
            // throw documentsError;
        }

        return {
            issuer,
            documents: documents || []
        };
    } catch (error) {
        console.error('Error fetching client data:', error);
        throw error; // Re-throw to be caught by the page component
    }
}

/**
 * Server component page for displaying detailed information about a specific client (issuer)
 * for a logged-in sponsor.
 * Fetches data server-side and passes it to the ClientDetailClient component for rendering.
 * Handles loading states via Suspense and displays error messages if data fetching fails.
 * @param params - Contains the dynamic route parameters `orgId` and `issuerId`.
 */
export default async function ClientDetailPage({ params }: PageProps) {
    const { orgId, issuerId } = params; // Destructure both params

    try {
        const { issuer, documents } = await getIssuerData(issuerId);

        // Pass necessary data down to the Client Component
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Suspense fallback={<div>Loading client details...</div>}>
                    <ClientDetailClient
                        initialIssuer={issuer} // Pass fetched issuer data
                        initialDocuments={documents} // Pass fetched documents
                        orgId={orgId} // Pass orgId if needed by client component
                        issuerId={issuerId} // Pass issuerId
                    />
                </Suspense>
            </div>
        );
    } catch (error: any) {
        console.error('Error in ClientDetailPage:', error);
        // Provide a user-friendly error message
        let errorMessage = 'Error loading client details. Please try refreshing the page.';
        if (error.message === 'Issuer (Client) not found') {
            errorMessage = 'The requested client could not be found.';
        }

        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {errorMessage}
                </div>
            </div>
        );
    }
} 