// Canvas Mode - Server Component
import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import type { Database } from '@/types/supabase';
import { redirect } from 'next/navigation';
import { transformDocumentData } from '@/lib/doc-transform';
import type { Comment } from '@/components/documents/DocumentSectionReview/types';
import CanvasEditor from './CanvasEditor';

/**
 * Props for the Canvas Mode page.
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

// Reuse the same data fetching logic as the box-mode editor
async function getCanvasPageData(listingId: string) {
  const supabase = await createClient();

  // Fetch User Data FIRST
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // Handle case where user is not authenticated
  if (userError || !user) {
      throw new Error("Auth session missing!");
  }

  // Fetch Document Data - using the same query as box-mode
  const { data: documentData, error: documentError } = await supabase
    .from('listingdocumentdirectlisting')
    .select('*')
    .eq('instrumentid', listingId)
    .single();

  if (documentError) throw documentError;

  // Fetch Comments Data - using the same query as box-mode
  const { data: commentData, error: commentError } = await supabase
    .from('document_comments')
    .select('*')
    .eq('document_id', listingId);

  if (commentError) throw commentError; 

  // Transform document data using existing utility
  const sections = transformDocumentData(documentData).map(section => ({
    ...section,
    status: (section.status as any) || 'draft',
    version: section.version || 0,
    created_at: section.created_at || new Date().toISOString(),
    updated_at: section.updated_at || new Date().toISOString(),
    subsections: section.subsections || []
  }));

  // Group Comments using the same logic as box-mode
  const groupedComments: Record<string, Comment[]> = {};
  if (commentData) {
    commentData.forEach((comment) => {
        if (!comment.section_id) return;
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
    userName,
    documentData // Pass raw document data for Canvas Mode
  };
}

/**
 * Canvas Mode page for sponsors to edit listing documents in a full-document view.
 * Provides a scrollable, AI-enhanced editing experience while maintaining compatibility
 * with the existing box-mode editor.
 */
export default async function CanvasModePage({ 
  params 
}: { 
  params: Promise<{ 
    orgId: string; 
    listingId: string;
  }>
}) {
  try {
    // Await params before accessing properties
    const { listingId: listingIdParam } = await params;
    
    // Fetch the page data using the same logic as box-mode
    const { sections, groupedComments, userId, userName, documentData } = await getCanvasPageData(listingIdParam);

    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading Canvas Mode...</span>
      </div>}>
        <CanvasEditor 
          initialSections={sections} 
          groupedComments={groupedComments}
          documentId={listingIdParam}
          userId={userId}
          userName={userName}
          documentData={documentData}
        />
      </Suspense>
    );
  } catch (error) {
    // Handle authentication errors by redirecting to sign-in
    if (error instanceof Error && error.message === "Auth session missing!") {
      redirect('/sign-in');
    }
    // Re-throw other errors
    throw error;
  }
} 