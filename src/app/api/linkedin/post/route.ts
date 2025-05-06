import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * LinkedIn posting endpoint
 * Required params:
 * - organizationId: The organization ID to post for
 * - message: The text message to post
 */
export async function POST(request: NextRequest) {
  console.log('[LinkedIn Post] Processing request');
  
  try {
    // Parse request body
    const body = await request.json();
    const { organizationId, message, linkedinOrgId } = body;
    
    // Validate required parameters
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }
    
    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }
    
    console.log(`[LinkedIn Post] Posting for organization: ${organizationId}`);
    
    // Check if we have a specific LinkedIn Organization ID provided first
    if (linkedinOrgId) {
      console.log(`[LinkedIn Post] Using provided LinkedIn organization ID: ${linkedinOrgId}`);
      // Get the access token
      const supabase = await createClient();
      const { data: tokenData, error: tokenError } = await supabase
        .from('oauth_tokens')
        .select('access_token')
        .eq('organization_id', organizationId)
        .eq('provider', 'linkedin')
        .single();
      
      if (tokenError || !tokenData) {
        console.error('[LinkedIn Post] Error retrieving token:', tokenError);
        return NextResponse.json(
          { 
            error: 'LinkedIn is not connected. Please connect LinkedIn for this organization first.',
            details: 'Go to Settings > Social Media Connections to connect your LinkedIn account.',
            needsConnection: true
          },
          { status: 404 }
        );
      }
      
      // Use the manually provided org ID directly
      const orgURN = `urn:li:organization:${linkedinOrgId}`;
      return await postAsOrganization(tokenData.access_token, orgURN, message);
    }
    
    // If no manual ID was provided, proceed with the normal flow
    // Retrieve the LinkedIn token and metadata from oauth_tokens table
    const supabase = await createClient();
    const { data: tokenData, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('access_token, provider_metadata')
      .eq('organization_id', organizationId)
      .eq('provider', 'linkedin')
      .single();
    
    if (tokenError || !tokenData) {
      console.error('[LinkedIn Post] Error retrieving token:', tokenError);
      return NextResponse.json(
        { 
          error: 'LinkedIn is not connected. Please connect LinkedIn for this organization first.',
          details: 'Go to Settings > Social Media Connections to connect your LinkedIn account.',
          needsConnection: true
        },
        { status: 404 }
      );
    }
    
    const accessToken = tokenData.access_token;
    
    // Check for organization URNs in metadata
    const organizationURNs = tokenData.provider_metadata?.organizations || [];
    if (organizationURNs.length === 0) {
      console.error('[LinkedIn Post] No organization URNs found in token metadata');
      
      // Try the followers endpoint which is most reliable but doesn't need special permissions
      try {
        console.log('[LinkedIn Post] Trying organizationalEntityFollows endpoint');
        const followsResponse = await fetch('https://api.linkedin.com/v2/organizationalEntityFollows?q=follower', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        });
        
        const responseText = await followsResponse.text();
        console.log('[LinkedIn Post] Organization follows response:', responseText);
        
        if (followsResponse.ok) {
          try {
            const data = JSON.parse(responseText);
            if (data.elements && data.elements.length > 0) {
              const orgElements = data.elements
                .filter((el: any) => el.organizationalTarget && el.organizationalTarget.includes('organization:'));
              
              if (orgElements.length > 0) {
                // Found organizations the user follows
                const organizations = orgElements.map((el: any) => {
                  const orgId = el.organizationalTarget.split(':').pop();
                  return {
                    id: orgId,
                    role: 'FOLLOWER'
                  };
                });
                
                console.log(`[LinkedIn Post] Found ${organizations.length} followed organizations`);
                
                // Update stored metadata for future use
                await supabase
                  .from('oauth_tokens')
                  .update({
                    provider_metadata: { organizations }
                  })
                  .eq('organization_id', organizationId)
                  .eq('provider', 'linkedin');
                  
                // Use the first organization for posting
                const orgId = organizations[0].id;
                const orgURN = `urn:li:organization:${orgId}`;
                console.log(`[LinkedIn Post] Using followed organization: ${orgURN}`);
                return await postAsOrganization(accessToken, orgURN, message);
              }
            }
          } catch (parseError) {
            console.error('[LinkedIn Post] Error parsing follows response:', parseError);
          }
        }
      } catch (followsError) {
        console.error('[LinkedIn Post] Error with follows endpoint:', followsError);
      }
      
      // Continue with existing approaches if the above doesn't work
      // Try to fetch organization data now if missing
      try {
        // Try different organization endpoints one after another
        const orgEndpoints = [
          {
            url: 'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR',
            extractor: (data: any) => data.elements.map((e: any) => ({ 
              id: e.organizationalTarget?.split(':').pop(),
              urn: e.organizationalTarget, 
              role: e.role 
            }))
          },
          {
            url: 'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee',
            extractor: (data: any) => data.elements.map((e: any) => ({ 
              id: e.organization?.split(':').pop(),
              urn: e.organization, 
              role: e.role 
            }))
          },
          {
            url: 'https://api.linkedin.com/v2/organizations?q=admin',
            extractor: (data: any) => data.elements?.map((e: any) => ({
              id: e.id?.toString(),
              urn: `urn:li:organization:${e.id}`,
              name: e.vanityName || e.localizedName || null,
              role: 'ADMIN'
            })) || []
          }
        ];
        
        for (const endpoint of orgEndpoints) {
          try {
            console.log(`[LinkedIn Post] Trying to fetch organization data using: ${endpoint.url}`);
            const orgResponse = await fetch(endpoint.url, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0'
              }
            });
            
            if (orgResponse.ok) {
              const orgData = await orgResponse.json();
              console.log('[LinkedIn Post] Retrieved organization data:', JSON.stringify(orgData));
              
              if (orgData.elements && orgData.elements.length > 0) {
                // Extract organization info using the appropriate extractor
                const organizations = endpoint.extractor(orgData);
                console.log(`[LinkedIn Post] Found ${organizations.length} organizations`);
                
                // Update stored metadata for future use
                await supabase
                  .from('oauth_tokens')
                  .update({
                    provider_metadata: { organizations }
                  })
                  .eq('organization_id', organizationId)
                  .eq('provider', 'linkedin');
                  
                // Continue with posting using the first organization
                const orgInfo = organizations[0];
                const orgURN = orgInfo.urn || `urn:li:organization:${orgInfo.id}`;
                console.log(`[LinkedIn Post] Using organization URN: ${orgURN}`);
                return await postAsOrganization(accessToken, orgURN, message);
              }
            }
          } catch (error) {
            console.error(`[LinkedIn Post] Error with ${endpoint.url}:`, error);
            // Continue to next endpoint
          }
        }
      } catch (orgError) {
        console.error('[LinkedIn Post] All organization fetching methods failed:', orgError);
      }
      
      // If we still don't have org URN, fall back to personal posting
      console.log('[LinkedIn Post] No organizations available, trying personal posting');
      return await postAsUser(accessToken, message);
    }
    
    // Use the first organization URN for posting
    const orgInfo = organizationURNs[0];
    const orgURN = orgInfo.urn || `urn:li:organization:${orgInfo.id}`;
    console.log(`[LinkedIn Post] Using organization URN: ${orgURN}`);
    
    return await postAsOrganization(accessToken, orgURN, message);
    
  } catch (error: any) {
    console.error('[LinkedIn Post] Unexpected error:', error.message || error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to post as an organization
async function postAsOrganization(accessToken: string, orgURN: string, message: string) {
  console.log(`[LinkedIn Post] Posting as organization: ${orgURN}`);
  
  // Ensure the orgURN has the correct format
  let formattedOrgURN = orgURN;
  if (!orgURN.startsWith('urn:li:organization:') && !orgURN.startsWith('urn:li:company:')) {
    // If it's just a number or other format, convert to proper URN
    if (orgURN.match(/^\d+$/)) {
      formattedOrgURN = `urn:li:organization:${orgURN}`;
    } else if (orgURN.includes('organization:')) {
      formattedOrgURN = `urn:li:${orgURN}`;
    }
  }
  
  console.log(`[LinkedIn Post] Using formatted organization URN: ${formattedOrgURN}`);
  
  // Try using the LinkedIn Share API (v2/shares)
  try {
    const shareResponse = await fetch('https://api.linkedin.com/v2/shares', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        owner: formattedOrgURN,
        text: {
          text: message
        },
        distribution: {
          linkedInDistributionTarget: {}
        }
      })
    });
    
    if (shareResponse.ok) {
      const shareResult = await shareResponse.json();
      console.log('[LinkedIn Post] Share successful:', shareResult);
      
      return NextResponse.json({
        success: true,
        message: 'LinkedIn post created successfully',
        postId: shareResult.id || shareResult.activity
      });
    }
    
    const shareError = await shareResponse.text();
    console.log(`[LinkedIn Post] Share API failed, trying ugcPosts API. Error: ${shareError}`);
    
    // If Share API fails, try UGC Posts API
    const ugcResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        author: formattedOrgURN,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: message
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      })
    });
    
    if (ugcResponse.ok) {
      const ugcResult = await ugcResponse.json();
      console.log('[LinkedIn Post] UGC post successful:', ugcResult);
      
      return NextResponse.json({
        success: true,
        message: 'LinkedIn UGC post created successfully',
        postId: ugcResult.id
      });
    }
    
    // If UGC Posts API fails, try the newer REST Posts API
    const ugcError = await ugcResponse.text();
    console.log(`[LinkedIn Post] UGC API failed, trying REST Posts API. Error: ${ugcError}`);
    
    // Use the /rest/posts endpoint (newer API) as the last resort
    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401'
      },
      body: JSON.stringify({
        author: formattedOrgURN,
        commentary: message,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      })
    });
    
    // Handle unsuccessful response
    if (!response.ok) {
      const errorData = await response.text();
      console.error('[LinkedIn Post] All LinkedIn API methods failed. Final error:', errorData);
      
      return NextResponse.json({
        success: false,
        error: 'LinkedIn post failed with all methods',
        details: {
          shareError,
          ugcError,
          restError: errorData
        }
      }, { status: response.status });
    }
    
    // Parse successful response
    const result = await response.json();
    console.log('[LinkedIn Post] REST Posts API successful:', result);
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'LinkedIn post created successfully (REST API)',
      postId: result.id
    });
  } catch (error) {
    console.error('[LinkedIn Post] Error during posting:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Exception during LinkedIn posting',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Fallback function to post as personal user if needed
async function postAsUser(accessToken: string, message: string) {
  console.log('[LinkedIn Post] Attempting to post as user');
  
  try {
    // Get user info first
    const userResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('[LinkedIn Post] Failed to get user info:', errorText);
      
      // If we can't get user info, try a generic personal post without user URN
      return await tryGenericPersonalPost();
    }
    
    const userData = await userResponse.json();
    const personURN = `urn:li:person:${userData.id}`;
    console.log(`[LinkedIn Post] Using person URN: ${personURN}`);
    
    // Try multiple API endpoints in sequence, starting with Share API
    // 1. Try Share API
    const shareResponse = await fetch('https://api.linkedin.com/v2/shares', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        owner: personURN,
        text: {
          text: message
        },
        distribution: {
          linkedInDistributionTarget: {}
        }
      })
    });
    
    if (shareResponse.ok) {
      const shareResult = await shareResponse.json();
      console.log('[LinkedIn Post] Share personal post successful:', shareResult);
      
      return NextResponse.json({
        success: true,
        message: 'LinkedIn personal share created successfully',
        postId: shareResult.id || shareResult.activity
      });
    }
    
    const shareError = await shareResponse.text();
    console.log(`[LinkedIn Post] Share API failed for personal post, trying UGC API. Error: ${shareError}`);
    
    // 2. Try UGC Posts API
    const ugcResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        author: personURN,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: message
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      })
    });
    
    if (ugcResponse.ok) {
      const ugcResult = await ugcResponse.json();
      console.log('[LinkedIn Post] UGC personal post successful:', ugcResult);
      
      return NextResponse.json({
        success: true,
        message: 'LinkedIn personal UGC post created successfully',
        postId: ugcResult.id
      });
    }
    
    const ugcError = await ugcResponse.text();
    console.log(`[LinkedIn Post] UGC API failed for personal post, trying REST API. Error: ${ugcError}`);
    
    // 3. Try REST Posts API
    return await tryRestPostsAPI(personURN);
  } catch (error) {
    console.error('[LinkedIn Post] Error during personal posting:', error);
    
    // If anything fails, try the generic approach as a last resort
    return await tryGenericPersonalPost();
  }
  
  // Helper function for REST Posts API which is used in multiple places
  async function tryRestPostsAPI(authorURN: string) {
    try {
      const response = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202401'
        },
        body: JSON.stringify({
          author: authorURN,
          commentary: message,
          visibility: "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: []
          },
          lifecycleState: "PUBLISHED",
          isReshareDisabledByAuthor: false
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LinkedIn Post] REST Posts API failed for personal post:', errorText);
        
        return NextResponse.json({
          success: false,
          error: 'LinkedIn personal post failed with all methods',
          details: errorText
        }, { status: response.status });
      }
      
      const result = await response.json();
      console.log('[LinkedIn Post] REST Posts API personal post successful:', result);
      
      return NextResponse.json({
        success: true,
        message: 'LinkedIn personal post created successfully (REST API)',
        postId: result.id
      });
    } catch (error) {
      console.error('[LinkedIn Post] Error during REST Posts API personal posting:', error);
      throw error; // Let the caller handle it
    }
  }
  
  // Last resort attempt without knowing the user URN
  async function tryGenericPersonalPost() {
    try {
      console.log('[LinkedIn Post] Attempting generic personal post as last resort');
      
      // Try to use a special endpoint that doesn't require the URN
      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify({
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: message
              },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LinkedIn Post] Generic personal post failed:', errorText);
        
        return NextResponse.json({
          success: false,
          error: 'All LinkedIn posting methods failed',
          details: errorText
        }, { status: response.status });
      }
      
      const result = await response.json();
      console.log('[LinkedIn Post] Generic personal post successful:', result);
      
      return NextResponse.json({
        success: true,
        message: 'LinkedIn post created through generic method',
        postId: result.id
      });
    } catch (error) {
      console.error('[LinkedIn Post] Error during generic personal posting:', error);
      
      return NextResponse.json({
        success: false,
        error: 'All LinkedIn posting methods failed with errors',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  }
} 