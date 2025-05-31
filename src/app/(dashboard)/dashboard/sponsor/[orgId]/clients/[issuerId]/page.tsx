import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ClientDetailClient from './ClientDetailClient'; // Updated import name
import type { Database } from '@/types/supabase'; // Assuming Database types are defined here
import { Building2 } from 'lucide-react';

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
 * Uses server-side Supabase client.
 * @param issuerId - The ID of the issuer to fetch data for.
 * @returns A promise that resolves to an object containing the issuer and documents data.
 * @throws If authentication fails, issuer is not found, or a database error occurs.
 */
async function getIssuerData(issuerId: string) {
    const supabase = await createClient();

    // Ensure session exists if needed for authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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
    const { orgId, issuerId } = await params; // Fix: Await params before destructuring

    try {
        const { issuer, documents } = await getIssuerData(issuerId);

        // Pass necessary data down to the Client Component with premium UI container
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-2 sm:p-4 md:p-6 overflow-x-hidden">
                <Suspense fallback={
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600 font-medium">Loading client details...</p>
                        </div>
                    </div>
                }>
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
        
        // Redirect to sign-in if auth error
        if (error.message === 'Authentication required.') {
            redirect('/sign-in');
        }
        
        // Provide a user-friendly error message for other errors with premium styling
        let errorMessage = 'Error loading client details. Please try refreshing the page.';
        if (error.message === 'Issuer (Client) not found') {
            errorMessage = 'The requested client could not be found.';
        }

        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-2 sm:p-4 md:p-6 overflow-x-hidden">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-red-200/50 p-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Client</h3>
                        <p className="text-red-700">{errorMessage}</p>
                    </div>
                </div>
            </div>
        );
    }
} 