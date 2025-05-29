// This is a Server Component that redirects to Canvas Mode by default
import { redirect } from 'next/navigation';

/**
 * Props for the redirect page.
 */
type PageProps = {
  params: {
    /** The organization ID of the sponsor. */
    orgId: string;
    /** The unique ID of the listing document being edited. */
    listingId: string;
  };
};

/**
 * Default edit-document page - redirects to Canvas Mode.
 * Canvas Mode is now the primary editing experience.
 */
export default async function EditDocumentRedirectPage({ 
  params 
}: { 
  params: Promise<{ 
    orgId: string; 
    listingId: string;
  }>
}) {
  // Await params before accessing properties
  const { orgId, listingId } = await params;
  
  // Redirect to Canvas Mode as the default editing experience
  redirect(`/dashboard/sponsor/${orgId}/listings/${listingId}/edit-document/canvas`);
} 