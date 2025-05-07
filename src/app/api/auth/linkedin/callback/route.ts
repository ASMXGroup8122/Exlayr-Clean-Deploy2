export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// LinkedIn App credentials
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/auth/linkedin/callback';

export async function GET(request: NextRequest) {
  console.log('[LinkedIn Callback] Processing callback');
  
  try {
    // Extract query parameters
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    const error = requestUrl.searchParams.get('error');
    
    // Create HTML response for closing the popup
    const createHtmlResponse = (success: boolean, message: string) => {
      // HTML with auto-close script and organization instructions
      const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>LinkedIn Authorization</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f4f7fa;
              color: #333;
            }
            .status {
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
              text-align: center;
              max-width: 500px;
            }
            .success {
              background-color: #d4edda;
              color: #155724;
              border: 1px solid #c3e6cb;
            }
            .error {
              background-color: #f8d7da;
              color: #721c24;
              border: 1px solid #f5c6cb;
            }
            .instructions {
              background-color: #e2f0fb;
              color: #0c5396;
              border: 1px solid #bee5eb;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
              max-width: 500px;
            }
            .note {
              background-color: #fff3cd;
              border: 1px solid #ffeeba;
              color: #856404;
              padding: 12px;
              border-radius: 6px;
              margin-top: 10px;
              font-size: 14px;
            }
            h2 {
              margin-top: 0;
            }
            p {
              margin: 10px 0 0;
            }
            ol {
              text-align: left;
              padding-left: 20px;
            }
            code {
              background: #f0f0f0;
              padding: 2px 4px;
              border-radius: 3px;
              font-family: monospace;
            }
            #form {
              display: ${success ? 'block' : 'none'};
              margin-bottom: 20px;
              text-align: left;
              width: 500px;
            }
            label {
              display: block;
              margin-bottom: 6px;
              font-weight: bold;
            }
            input {
              width: 100%;
              padding: 8px;
              border: 1px solid #ccc;
              border-radius: 4px;
              margin-bottom: 10px;
              box-sizing: border-box;
            }
            button {
              background-color: #0077b5;
              color: white;
              border: none;
              padding: 10px 15px;
              border-radius: 4px;
              cursor: pointer;
              font-weight: bold;
            }
            button:hover {
              background-color: #005e93;
            }
          </style>
        </head>
        <body>
          <div class="status ${success ? 'success' : 'error'}">
            <h2>${success ? 'Connection Successful' : 'Connection Failed'}</h2>
            <p>${message}</p>
          </div>
          
          ${success ? `
          <div class="instructions">
            <h2>IMPORTANT: Find Your LinkedIn Organization ID</h2>
            <p>For posting as your organization, we need your LinkedIn company ID:</p>
            <ol>
              <li>Go to your LinkedIn company page</li>
              <li>Look at the URL in your browser address bar</li>
              <li>Find the format: <code>linkedin.com/company/12345678</code></li>
              <li>The number (e.g., <code>12345678</code>) is your LinkedIn Organization ID</li>
              <li>Enter this number below to ensure your posts appear from your organization</li>
            </ol>
            <div class="note">
              <strong>Note:</strong> This step is critical for organization posting to work correctly.
            </div>
          </div>
          
          <div id="form">
            <label for="linkedinOrgId">LinkedIn Organization ID:</label>
            <input type="text" id="linkedinOrgId" placeholder="Enter number from your LinkedIn company URL (e.g., 12345678)" />
            <button onclick="saveOrgId()">Save Organization ID</button>
          </div>
          ` : ''}
          
          <script>
            // Save the organization ID to the token
            async function saveOrgId() {
              const orgId = document.getElementById('linkedinOrgId').value.trim();
              if (!orgId) {
                alert('Please enter your LinkedIn Organization ID');
                return;
              }
              
              if (!/^\\d+$/.test(orgId)) {
                alert('Please enter only the numeric ID from your LinkedIn company URL');
                return;
              }
              
              try {
                const response = await fetch('/api/auth/linkedin/save-org-id', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    organizationId: '${organizationId}',
                    linkedinOrgId: orgId 
                  }),
                });
                
                if (response.ok) {
                  document.getElementById('form').innerHTML = '<p style="color: green; font-weight: bold;">Organization ID saved successfully!</p>';
                  setTimeout(() => {
                    window.close();
                  }, 2000);
                } else {
                  const error = await response.text();
                  alert('Error saving organization ID: ' + error);
                }
              } catch (error) {
                alert('Network error. Please try again.');
                console.error(error);
              }
            }
            
            // Close the window automatically after 60 seconds (if user doesn't enter org ID)
            setTimeout(() => {
              window.close();
            }, 60000);
          </script>
        </body>
      </html>
      `;
      
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    };
    
    // Handle OAuth errors from LinkedIn
    if (error) {
      console.error(`[LinkedIn Callback] OAuth error: ${error}`);
      return createHtmlResponse(false, `LinkedIn authorization failed: ${error}`);
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('[LinkedIn Callback] Missing code or state');
      return createHtmlResponse(false, 'Authorization parameters are missing. Please try again.');
    }
    
    // Verify state from cookie to prevent CSRF attacks
    const cookieStore = await cookies();
    const linkedinStateCookie = cookieStore.get('linkedin_oauth_state');
    
    if (!linkedinStateCookie || linkedinStateCookie.value !== state) {
      console.error('[LinkedIn Callback] State mismatch or missing cookie');
      
      // Clear the cookie
      if (linkedinStateCookie) {
        const cookieStore = await cookies();
        cookieStore.set('linkedin_oauth_state', '', { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          maxAge: 0, 
          path: '/' 
        });
      }
      
      return createHtmlResponse(false, 'Security validation failed. Please try connecting again.');
    }

    // Parse the state to extract organization ID
    let organizationId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      organizationId = stateData.organizationId;
      console.log(`[LinkedIn Callback] Organization ID: ${organizationId}`);
    } catch (parseError) {
      console.error('[LinkedIn Callback] Failed to parse state:', parseError);
      return createHtmlResponse(false, 'Invalid state data. Please try connecting again.');
    }

    // Exchange code for access token
    console.log('[LinkedIn Callback] Exchanging code for token');
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();

    // Check for token exchange errors
    if (!tokenResponse.ok) {
      console.error('[LinkedIn Callback] Token exchange failed:', tokenData);
      return createHtmlResponse(false, 'Failed to exchange authorization code for access token.');
    }
    
    console.log('[LinkedIn Callback] Successfully obtained access token');

    // Fetch LinkedIn profile information
    console.log('[LinkedIn Callback] Fetching profile data');
    let profileData: any = {};
    try {
      const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      
      if (profileResponse.ok) {
        profileData = await profileResponse.json();
        console.log('[LinkedIn Callback] Profile data retrieved');
      } else {
        // This is expected if we don't have r_liteprofile permission
        console.log('[LinkedIn Callback] Profile fetch failed - this is expected if app lacks r_liteprofile permission');
      }
    } catch (profileError) {
      console.error('[LinkedIn Callback] Error fetching profile:', profileError);
      // Non-fatal, continue with token storage
    }
    
    // Calculate token expiration
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);
    
    // Prepare data for oauth_tokens table
    const oauthTokenData: {
      organization_id: string;
      provider: string;
      access_token: string;
      refresh_token: string | null;
      expires_at: string;
      provider_account_id: string | null;
      provider_account_name: string | null;
      updated_at: string;
      created_at: string;
      provider_metadata?: {
        organizations: Array<{
          id: string;
          role: string;
        }>;
      };
    } = {
      organization_id: organizationId,
      provider: 'linkedin',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_at: expiresAt.toISOString(),
      provider_account_id: profileData.id || null,
      provider_account_name: profileData.localizedFirstName ? 
        `${profileData.localizedFirstName} ${profileData.localizedLastName || ''}` : 
        null,
      updated_at: now.toISOString(),
      created_at: now.toISOString(),
      provider_metadata: { organizations: [] }
    };
    
    // After getting token data, add this simple approach to detect organizations
    console.log('[LinkedIn Callback] Fetching organization data');
    try {
      // Try the v2/organizationsFollowed endpoint (doesn't require special permissions)
      const orgResponse = await fetch('https://api.linkedin.com/v2/organizationalEntityFollows?q=follower', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      const responseText = await orgResponse.text();
      console.log('[LinkedIn Callback] Organization API response:', responseText);
      
      let organizations = [];
      
      if (orgResponse.ok) {
        try {
          const data = JSON.parse(responseText);
          if (data.elements && data.elements.length > 0) {
            // Extract organization info from follows
            organizations = data.elements
              .filter((el: any) => el.organizationalTarget && el.organizationalTarget.includes('organization:'))
              .map((el: any) => {
                const orgId = el.organizationalTarget.split(':').pop();
                return {
                  id: orgId,
                  role: 'FOLLOWER'
                };
              });
              
            console.log(`[LinkedIn Callback] Found ${organizations.length} organizations`);
          }
        } catch (parseError) {
          console.error('[LinkedIn Callback] Error parsing organization data:', parseError);
        }
      }
      
      // If no orgs found, set empty array
      oauthTokenData.provider_metadata = { organizations: organizations || [] };
    } catch (error) {
      console.error('[LinkedIn Callback] Error fetching organization data:', error);
      oauthTokenData.provider_metadata = { organizations: [] };
    }
    
    // Store token in the oauth_tokens table
    console.log('[LinkedIn Callback] Storing token in database');
    const supabase = await createClient();
    
    // Insert or update record in oauth_tokens
    const { error: dbError } = await supabase
      .from('oauth_tokens')
      .upsert(oauthTokenData, { 
        onConflict: 'organization_id,provider'
      });
    
    if (dbError) {
      console.error('[LinkedIn Callback] Database error:', dbError);
      return createHtmlResponse(false, 'Failed to save LinkedIn connection information.');
    }
    
    console.log('[LinkedIn Callback] LinkedIn integration saved successfully');
    
    // Clear the state cookie
    const cookieStore2 = await cookies();
    cookieStore2.set('linkedin_oauth_state', '', { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 0, 
      path: '/' 
    });
    
    // Return HTML response with success message that auto-closes
    console.log('[LinkedIn Callback] Success, returning response to close popup');
    return createHtmlResponse(true, 'LinkedIn connected successfully! Please enter your LinkedIn Organization ID below.');
    
  } catch (error: any) {
    console.error('[LinkedIn Callback] Unexpected error:', error.message || error);
    return new Response('Authorization error. Please try again.', { status: 500 });
  }
} 