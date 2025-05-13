import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// Environment variables
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_TWITTER_CALLBACK_URL!;

export async function GET(request: NextRequest) {
  console.log('[Twitter Callback] Processing callback');
  
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // Create HTML response function similar to LinkedIn implementation
  const createHtmlResponse = (success: boolean, message: string) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${success ? 'Connection Successful' : 'Connection Failed'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.5;
              padding: 2rem 1rem;
              text-align: center;
              max-width: 550px;
              margin: 0 auto;
              color: #333;
            }
            .status {
              padding: 1.5rem;
              margin: 1rem 0;
              border-radius: 8px;
            }
            .success {
              background-color: #e5f7ed;
              color: #0a6943;
              border: 1px solid #8cd7af;
            }
            .error {
              background-color: #fee8ea;
              color: #9e2627;
              border: 1px solid #ffa8a9;
            }
            h2 {
              margin-top: 0;
            }
            .note {
              background-color: #f9f9f9;
              padding: 1rem;
              margin-top: 1.5rem;
              border-radius: 6px;
              font-size: 0.9rem;
              color: #555;
            }
          </style>
          <script>
            // Automatically close this window after successful auth
            // and notify the parent window of successful connection
            setTimeout(() => {
              if (${success} && window.opener) {
                window.opener.postMessage({ 
                  type: 'TWITTER_AUTH_COMPLETE', 
                  status: true 
                }, window.location.origin);
                console.log("Sent success message to parent window");
                
                // Close window automatically after a few seconds
                setTimeout(() => {
                  window.close();
                }, 3000);
              }
            }, 500);
          </script>
        </head>
        <body>
          <div class="status ${success ? 'success' : 'error'}">
            <h2>${success ? 'Connection Successful' : 'Connection Failed'}</h2>
            <p>${message}</p>
          </div>
          ${success ? `
          <div class="note">
            <p>You can now close this window and return to the application.</p>
            <p>This window will close automatically in a few seconds.</p>
          </div>
          ` : ''}
        </body>
      </html>
    `;
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  };

  try {
    // Handle OAuth errors from Twitter
    if (error) {
      console.error(`[Twitter Callback] OAuth error: ${error}`);
      return createHtmlResponse(false, `Twitter authorization failed: ${error}`);
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('[Twitter Callback] Missing code or state');
      return createHtmlResponse(false, 'Authorization parameters are missing. Please try again.');
    }
    
    // Verify state from cookie to prevent CSRF attacks
    const cookieStore = await cookies();
    const twitterStateCookie = cookieStore.get('twitter_oauth_state');
    const codeVerifier = cookieStore.get('twitter_code_verifier')?.value;
    
    if (!twitterStateCookie || twitterStateCookie.value !== state) {
      console.error('[Twitter Callback] State mismatch or missing cookie');
      
      // Clear the cookie
      if (twitterStateCookie) {
        cookieStore.set('twitter_oauth_state', '', { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          maxAge: 0, 
          path: '/' 
        });
      }
      
      return createHtmlResponse(false, 'Security validation failed. Please try connecting again.');
    }

    if (!codeVerifier) {
      console.error('[Twitter Callback] Missing code verifier');
      return createHtmlResponse(false, 'Security token is missing. Please try connecting again.');
    }

    // Parse the state to extract organization ID
    let organizationId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      organizationId = stateData.organizationId;
      console.log(`[Twitter Callback] Organization ID: ${organizationId}`);
    } catch (parseError) {
      console.error('[Twitter Callback] Failed to parse state:', parseError);
      return createHtmlResponse(false, 'Invalid state data. Please try connecting again.');
    }

    // Exchange code for access token
    console.log('[Twitter Callback] Exchanging code for token');
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Twitter Callback] Token exchange failed:', errorText);
      return createHtmlResponse(false, 'Failed to exchange authorization code. Please try again.');
    }

    const tokenData = await tokenResponse.json();
    console.log('[Twitter Callback] Received token data');
    
    // Get expiry time
    const now = new Date();
    const expiresInSeconds = tokenData.expires_in || 7200; // Default to 2 hours if not provided
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

    // Get user profile information
    console.log('[Twitter Callback] Fetching user profile data');
    const profileResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name,id', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('[Twitter Callback] Profile data fetch failed:', errorText);
      return createHtmlResponse(false, 'Failed to fetch Twitter profile. Please try again.');
    }

    const profileData = await profileResponse.json();
    console.log('[Twitter Callback] Received profile data:', JSON.stringify(profileData, null, 2));
    
    // Prepare data for oauth_tokens table
    const oauthTokenData = {
      organization_id: organizationId,
      provider: 'twitter',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_at: expiresAt.toISOString(),
      provider_account_id: profileData.data?.id || null,
      provider_account_name: profileData.data?.username || null,
      updated_at: now.toISOString(),
      created_at: now.toISOString(),
      provider_metadata: {
        name: profileData.data?.name,
        username: profileData.data?.username,
        profile_image_url: profileData.data?.profile_image_url
      }
    };
    
    // Store token in the oauth_tokens table
    console.log('[Twitter Callback] Storing token in database');
    const supabase = await createClient();
    
    // Insert or update record in oauth_tokens
    const { error: dbError } = await supabase
      .from('oauth_tokens')
      .upsert(oauthTokenData, { 
        onConflict: 'organization_id,provider'
      });
    
    if (dbError) {
      console.error('[Twitter Callback] Database error:', dbError);
      return createHtmlResponse(false, 'Failed to save Twitter connection information.');
    }
    
    console.log('[Twitter Callback] Twitter integration saved successfully');
    
    // Clear the cookies
    cookieStore.set('twitter_oauth_state', '', { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 0, 
      path: '/' 
    });
    
    cookieStore.set('twitter_code_verifier', '', { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 0, 
      path: '/' 
    });
    
    // Return HTML response with success message that auto-closes
    console.log('[Twitter Callback] Success, returning response to close popup');
    return createHtmlResponse(true, 'Twitter account connected successfully!');
    
  } catch (error: any) {
    console.error('[Twitter Callback] Unexpected error:', error.message || error);
    return new Response('Authorization error. Please try again.', { status: 500 });
  }
} 