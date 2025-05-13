import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

// Environment variables
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_TWITTER_CALLBACK_URL!;

export async function GET(request: NextRequest) {
  console.log('[Twitter Authorize] Starting authorization flow');
  
  try {
    // Get organization ID from query params
    const requestUrl = new URL(request.url);
    const organizationId = requestUrl.searchParams.get('organizationId');
    
    if (!organizationId) {
      console.error('[Twitter Authorize] Error: Organization ID is required');
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    console.log(`[Twitter Authorize] Organization ID: ${organizationId}`);

    // Generate a random state value with organization context for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        organizationId,
        nonce: randomBytes(16).toString('hex'),
      })
    ).toString('base64');
    
    // Generate a code verifier and challenge for PKCE
    const codeVerifier = randomBytes(32).toString('hex');
    const codeChallenge = codeVerifier; // For simplicity, we're using plain method
    
    // Store state and code verifier in cookies for verification in the callback
    const cookieStore = await cookies();
    cookieStore.set('twitter_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });
    
    cookieStore.set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });
    
    console.log('[Twitter Authorize] State and code verifier cookies set');

    // Define Twitter OAuth scopes needed for posting
    const scopes = [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access'
    ];
    
    console.log('[Twitter Authorize] Using scopes:', scopes.join(' '));
    
    // Build the authorization URL using OAuth 2.0
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', TWITTER_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'plain');
    
    console.log(`[Twitter Authorize] Authorization URL:`, authUrl.toString());
    console.log(`[Twitter Authorize] Redirecting to Twitter for authorization`);
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    console.error('[Twitter Authorize] Error:', error.message || error);
    return NextResponse.json(
      { error: 'Failed to initiate Twitter authorization' },
      { status: 500 }
    );
  }
} 