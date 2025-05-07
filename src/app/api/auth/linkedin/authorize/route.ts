export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // OLD
import { createClient } from '@/utils/supabase/server'; // NEW

// LinkedIn App credentials from environment variables
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 
  (process.env.NEXT_PUBLIC_URL 
    ? `${process.env.NEXT_PUBLIC_URL}/api/auth/linkedin/callback` 
    : 'http://localhost:3000/api/auth/linkedin/callback');

console.log('[LinkedIn Authorize] LINKEDIN_CLIENT_ID:', LINKEDIN_CLIENT_ID);
console.log('[LinkedIn Authorize] REDIRECT_URI value:', REDIRECT_URI);
console.log('[LinkedIn Authorize] Using LINKEDIN_REDIRECT_URI:', !!process.env.LINKEDIN_REDIRECT_URI);

export async function GET(request: NextRequest) {
  console.log('[LinkedIn Authorize] Starting authorization flow');
  
  try {
    // Get organization ID from query params
    const requestUrl = new URL(request.url);
    const organizationId = requestUrl.searchParams.get('organizationId');
    const linkedinOrgId = requestUrl.searchParams.get('linkedinOrgId');
    
    if (!organizationId) {
      console.error('[LinkedIn Authorize] Error: Organization ID is required');
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    console.log(`[LinkedIn Authorize] Organization ID: ${organizationId}`);
    if (linkedinOrgId) {
      console.log(`[LinkedIn Authorize] LinkedIn Organization ID provided: ${linkedinOrgId}`);
    }

    // Generate a random state value with organization context for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        organizationId,
        linkedinOrgId: linkedinOrgId || null,
        nonce: randomBytes(16).toString('hex'),
      })
    ).toString('base64');
    
    // Store state in a cookie for verification in the callback
    const cookieStore = await cookies();
    cookieStore.set('linkedin_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });
    console.log('[LinkedIn Authorize] State cookie set');

    // Define LinkedIn OAuth scopes - requesting posting permissions
    const scopes = [
      'w_member_social',     // For posting as the member
      'w_organization_social' // For posting on behalf of an organization
    ];
    
    console.log('[LinkedIn Authorize] Using scopes:', scopes.join(' '));
    
    // Build the authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', LINKEDIN_CLIENT_ID || '');
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('scope', scopes.join(' '));
    
    console.log(`[LinkedIn Authorize] Authorization URL:`, authUrl.toString());
    console.log(`[LinkedIn Authorize] Redirecting to LinkedIn for authorization`);
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    console.error('[LinkedIn Authorize] Error:', error.message || error);
    return NextResponse.json(
      { error: 'Failed to initiate LinkedIn authorization' },
      { status: 500 }
    );
  }
}

// Removed unused getLinkedInAuthUrl function as it duplicated logic and used old env vars
// // ... existing code ... 