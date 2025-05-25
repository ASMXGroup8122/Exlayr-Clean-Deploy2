import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { SharedDocumentViewer } from './SharedDocumentViewer';

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export const dynamic = 'force-dynamic';

async function validateSharedDocument(token: string) {
  try {
    // Use service role client to bypass RLS for shared document validation
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('Server-side validation for token:', token);
    
    // Validate the shared document access directly
    const { data: sharedDoc, error: validationError } = await supabase
      .from('shared_documents')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    console.log('Server-side token lookup result:', { sharedDoc, validationError });

    if (validationError || !sharedDoc) {
      console.error('Server-side validation error:', validationError);
      throw new Error('Invalid or expired token');
    }

    // Check if token has expired
    if (sharedDoc.expires_at && new Date(sharedDoc.expires_at) < new Date()) {
      throw new Error('Token has expired');
    }

    // Update access tracking
    await supabase
      .from('shared_documents')
      .update({ 
        access_count: (sharedDoc.access_count || 0) + 1,
        first_accessed_at: sharedDoc.first_accessed_at || new Date().toISOString()
      })
      .eq('id', sharedDoc.id);

    // Fetch the listing document data
    const { data: documentData, error: docError } = await supabase
      .from('listingdocumentdirectlisting')
      .select('*')
      .eq('instrumentid', sharedDoc.listing_id)
      .single();

    if (docError || !documentData) {
      throw new Error('Document not found');
    }

    // Fetch listing metadata
    const { data: listing, error: listingError } = await supabase
      .from('listing')
      .select('instrumentname, instrumentticker, instrumentcreatedby')
      .eq('instrumentid', sharedDoc.listing_id)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found');
    }

    // Fetch sponsor information
    const { data: sponsor, error: sponsorError } = await supabase
      .from('users')
      .select('company_name')
      .eq('id', listing.instrumentcreatedby)
      .single();

    // Fetch comments if access level allows
    let comments: any[] = [];
    if (sharedDoc.access_level === 'comment') {
      const { data: commentsData, error: commentsError } = await supabase
        .from('document_comments')
        .select(`
          id,
          section_id,
          content,
          created_at,
          resolved,
          user_id,
          users:user_id (
            first_name,
            last_name,
            company_name
          )
        `)
        .eq('document_id', sharedDoc.listing_id)
        .order('created_at', { ascending: true });

      if (!commentsError && commentsData) {
        comments = commentsData;
      }
    }

    return {
      success: true,
      accessLevel: sharedDoc.access_level,
      expiresAt: sharedDoc.expires_at,
      document: documentData,
      listing: {
        id: sharedDoc.listing_id,
        name: listing.instrumentname,
        ticker: listing.instrumentticker,
        sponsor: sponsor?.company_name || 'Unknown Sponsor'
      },
      comments,
      isSharedView: true
    };
  } catch (error) {
    console.error('Error validating shared document:', error);
    throw error;
  }
}

export default async function SharedDocumentPage({ params }: PageProps) {
  try {
    const { token } = await params;
    
    // Validate the shared document token
    const validationResult = await validateSharedDocument(token);

    if (!validationResult.success) {
      redirect('/share/expired');
    }

    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading shared document...</p>
          </div>
        </div>
      }>
        <SharedDocumentViewer 
          documentData={validationResult.document}
          listing={validationResult.listing}
          accessLevel={validationResult.accessLevel}
          expiresAt={validationResult.expiresAt}
          comments={validationResult.comments}
          token={token}
        />
      </Suspense>
    );
  } catch (error) {
    console.error('Error loading shared document:', error);
    redirect('/share/error');
  }
} 