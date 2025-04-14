// This is a Server Component
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
// Explicitly add .tsx extension
import SponsorEditDocumentClient, { type SponsorEditDocumentClientProps } from './SponsorEditDocumentClient';
// Correct paths assuming standard project structure
import { transformDocumentData } from '@/lib/doc-transform';
// Import both Section and Comment types
import type { Comment } from '@/components/documents/DocumentSectionReview/types';

/**
 * Props for the SponsorEditDocumentPage server component.
 */
type PageProps = {
  params: {
    /** The organization ID of the sponsor. */
    orgId: string;
    /** The unique ID of the listing document being edited. */
    listingId: string;
  };
};

// Set proper caching behavior
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Use a dedicated page data fetcher for Next.js 15
async function getPageData(listingId: string) {
  const supabase = createServerComponentClient<Database>({ cookies });

  // Fetch User Data FIRST
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // Handle case where user is not authenticated (though route guards should prevent this)
  if (userError || !user) {
      // Or redirect to login
      throw new Error(userError?.message || "User not found. Please log in."); 
  }

  // Fetch Document Data
  const { data: documentData, error: documentError } = await supabase
    .from('listingdocumentdirectlisting')
    .select('*')
    .eq('instrumentid', listingId)
    .single();

  if (documentError) throw documentError;

  // Fetch Comments Data
  const { data: commentData, error: commentError } = await supabase
    .from('document_comments')
    .select('*')
    .eq('document_id', listingId);

  // Allow continuing even if comments fail? Or throw?
  // Let's throw for now to make issues obvious
  if (commentError) throw commentError; 

  // Transform document data
  const sections = transformDocumentData(documentData).map(section => ({
    ...section,
    status: (section.status as SponsorEditDocumentClientProps['initialSections'][number]['status']) || 'draft',
    version: section.version || 0,
    created_at: section.created_at || new Date().toISOString(),
    updated_at: section.updated_at || new Date().toISOString(),
    subsections: section.subsections || []
  }));

  // Group Comments
  const groupedComments: Record<string, Comment[]> = {};
  if (commentData) {
    commentData.forEach((comment) => {
        if (!comment.section_id) return; // Skip comments without a section_id
        if (!groupedComments[comment.section_id]) {
            groupedComments[comment.section_id] = [];
        }
        groupedComments[comment.section_id].push({
            id: comment.id,
            text: comment.content || '',
            timestamp: comment.created_at || new Date().toISOString(),
            user_id: comment.user_id,
            user_name: comment.user_name || 'Anonymous',
            status: (comment.status as Comment['status']) || 'open'
        });
    });
  }

  // Determine user name (use email as fallback)
  const userName = user.user_metadata?.full_name || user.email || 'Unknown User';

  return {
    sections,
    groupedComments,
    listingId,
    userId: user.id,
    userName
  };
}

/**
 * Server component page for sponsors to edit listing documents.
 * Fetches document content and comments server-side, then renders the client component.
 */
export default async function SponsorEditDocumentPage({ 
  params 
}: { 
  params: { 
    orgId: string; 
    listingId: string;
  } 
}) {
  // Extract and validate the ID first before using it in async operations
  const listingIdParam = await Promise.resolve(params.listingId);
  
  // Fetch the page data using the extracted ID
  const { sections, groupedComments, userId, userName } = await getPageData(listingIdParam);

  return (
    <Suspense fallback={<div>Loading document editor...</div>}>
      <SponsorEditDocumentClient 
        initialSections={sections} 
        groupedComments={groupedComments}
        documentId={listingIdParam}
        userId={userId}
        userName={userName}
      />
    </Suspense>
  );
} 