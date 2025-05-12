export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * LinkedIn posting endpoint
 * Required params:
 * - organizationId: The organization ID to post for
 * - message: The text message to post
 */
export async function POST(request: NextRequest) {
  console.log('\n==========================================================');
  console.log('[LinkedIn Post] DEBUGGING: NEW POST REQUEST RECEIVED');
  console.log('==========================================================\n');
  
  try {
    // Parse request body
    const body = await request.json();
    const { organizationId, message, linkedinOrgId, imageUrl, altText } = body;
    
    // Log all incoming parameters for debugging
    console.log('[LinkedIn Post] Request parameters:', JSON.stringify({
      organizationId,
      messageLength: message?.length || 0,
      linkedinOrgId: linkedinOrgId || 'NOT PROVIDED',
      hasImageUrl: !!imageUrl,
      imageUrlFirstChars: imageUrl ? imageUrl.substring(0, 50) + '...' : 'N/A',
      hasAltText: !!altText
    }, null, 2));
    
    // Enhanced image URL testing
    if (imageUrl) {
      console.log('\n---------------------------------------------------');
      console.log(`[LinkedIn Post] DETAILED IMAGE URL INSPECTION: "${imageUrl}"`);
      
      // Check if it's a Supabase URL
      const isSupabaseUrl = imageUrl.includes('supabase') || imageUrl.includes('storage');
      console.log(`[LinkedIn Post] Appears to be a Supabase URL: ${isSupabaseUrl}`);
      
      // Try to determine image type from URL
      let inferredImageType = 'unknown';
      if (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')) {
        inferredImageType = 'image/jpeg';
      } else if (imageUrl.endsWith('.png')) {
        inferredImageType = 'image/png';
      } else if (imageUrl.endsWith('.gif')) {
        inferredImageType = 'image/gif';
      } else if (imageUrl.endsWith('.webp')) {
        inferredImageType = 'image/webp';
      }
      console.log(`[LinkedIn Post] Inferred image type from URL: ${inferredImageType}`);
      
      // Test URL structure
      try {
        const urlObj = new URL(imageUrl);
        console.log(`[LinkedIn Post] URL protocol: ${urlObj.protocol}`);
        console.log(`[LinkedIn Post] URL host: ${urlObj.host}`);
        console.log(`[LinkedIn Post] URL pathname: ${urlObj.pathname}`);
        console.log(`[LinkedIn Post] URL search params: ${urlObj.search}`);
        
        // Analyze URL further based on host
        if (urlObj.host.includes('supabase')) {
          console.log(`[LinkedIn Post] Supabase storage URL detected. Project ref might be: ${urlObj.pathname.split('/')[1]}`);
          console.log(`[LinkedIn Post] Bucket might be: ${urlObj.pathname.split('/')[2]}`);
        }
      } catch (e: any) {
        console.error(`[LinkedIn Post] Invalid URL format: ${e.message}`);
      }
      
      // Try a test fetch to see headers
      try {
        console.log('[LinkedIn Post] Testing image URL with HEAD request...');
        const headResponse = await fetch(imageUrl, { 
          method: 'HEAD',
          headers: { 'Cache-Control': 'no-cache' }
        });
        console.log(`[LinkedIn Post] HEAD response status: ${headResponse.status}`);
        console.log(`[LinkedIn Post] HEAD response content-type: ${headResponse.headers.get('content-type')}`);
        console.log(`[LinkedIn Post] HEAD response content-length: ${headResponse.headers.get('content-length')}`);
      } catch (headError: any) {
        console.error(`[LinkedIn Post] HEAD request failed: ${headError.message}`);
      }
      
      console.log('---------------------------------------------------\n');
    }
    
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
      console.log(`[LinkedIn Post] *** FLOW: USING PROVIDED LINKEDIN ORG ID: ${linkedinOrgId} ***`);
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
      let orgImageUrn: string | null = null;
      if (imageUrl) {
        try {
          console.log(`[LinkedIn Post] FLOW STEP 1: Download and upload image to LinkedIn`);
          console.log(`[LinkedIn Post] Starting image upload with URL: ${imageUrl}`);
          orgImageUrn = await uploadImageToLinkedIn(imageUrl, tokenData.access_token, orgURN, altText);
          console.log(`[LinkedIn Post] Successfully uploaded image for organization. URN: ${orgImageUrn}`);
        } catch (imageError) {
          console.error('[LinkedIn Post] Error uploading image for organization:', imageError);
          console.log('[LinkedIn Post] Will continue with text-only post');
          orgImageUrn = null;
        }
      }
      
      // Call appropriate post method based on whether an image was uploaded
      if (orgImageUrn) {
        return await postWithImageAsOrganization(tokenData.access_token, orgURN, message, orgImageUrn, altText);
      } else {
        return await postAsOrganization(tokenData.access_token, orgURN, message);
      }
    }
    
    // If no manual ID was provided, proceed with the normal flow
    // Retrieve the LinkedIn token and metadata from oauth_tokens table
    console.log(`[LinkedIn Post] *** FLOW: STANDARD ORGANIZATION FLOW ***`);
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
      console.log('[LinkedIn Post] *** FLOW: NO ORGANIZATION URNS - TRYING FOLLOWERS API ***');
      
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
                const orgInfo = organizations[0];
                const orgURN = orgInfo.urn || `urn:li:organization:${orgInfo.id}`;
                console.log(`[LinkedIn Post] Using followed organization: ${orgURN}`);
                
                // Check for and handle image upload for the followers path too
                if (imageUrl) {
                  console.log(`[LinkedIn Post] FLOW STEP 1: Download and upload image to LinkedIn (followers path)`);
                  try {
                    console.log(`[LinkedIn Post] Starting followers path image upload with URL: ${imageUrl}`);
                    const linkedinImageUrn = await uploadImageToLinkedIn(imageUrl, accessToken, orgURN, altText);
                    
                    if (!linkedinImageUrn || 
                        (!linkedinImageUrn.includes('urn:li:image:') && 
                         !linkedinImageUrn.includes('urn:li:digitalmediaAsset:'))) {
                      console.error(`[LinkedIn Post] Failed to get a valid image URN: ${linkedinImageUrn}`);
                      return NextResponse.json({ 
                        success: false, 
                        error: 'Failed to get a valid LinkedIn image URN',
                        details: { imageUrn: linkedinImageUrn }
                      }, { status: 500 });
                    }
                    
                    console.log(`[LinkedIn Post] FLOW STEP 2: Image successfully uploaded to LinkedIn. URN: ${linkedinImageUrn}`);
                    
                    // Image was uploaded successfully, now create the post with the image
                    console.log(`[LinkedIn Post] FLOW STEP 3: Creating post with the uploaded image`);
                    return await postWithImageAsOrganization(accessToken, orgURN, message, linkedinImageUrn, altText);
                  } catch (imageError) {
                    console.error('[LinkedIn Post] Error during image upload process:', imageError);
                    // Return error instead of falling back to text-only post
                    return NextResponse.json({ 
                      success: false, 
                      error: 'Failed to process image for LinkedIn post',
                      details: imageError instanceof Error ? imageError.message : String(imageError)
                    }, { status: 500 });
                  }
                }
                
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
      console.log('[LinkedIn Post] *** FLOW: FOLLOWERS FAILED - TRYING ADMIN ENDPOINTS ***');
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
                
                // Check for image upload in administrators path too
                if (imageUrl) {
                  try {
                    console.log(`[LinkedIn Post] Starting admin flow image upload with URL: ${imageUrl}`);
                    const linkedinImageUrn = await uploadImageToLinkedIn(imageUrl, accessToken, orgURN, altText);
                    console.log(`[LinkedIn Post] Successfully uploaded image for admin organization. URN: ${linkedinImageUrn}`);
                    
                    // Post with the image
                    return await postWithImageAsOrganization(accessToken, orgURN, message, linkedinImageUrn, altText);
                  } catch (imageError) {
                    console.error('[LinkedIn Post] Error uploading image for admin organization:', imageError);
                    console.log('[LinkedIn Post] Will continue with text-only post');
                    // Fall through to text-only post below
                  }
                }
                
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
      console.log('[LinkedIn Post] *** FLOW: NO ORGANIZATIONS FOUND - FALLING BACK TO PERSONAL POSTING ***');
      if (imageUrl) {
        try {
          console.log('[LinkedIn Post] Attempting user image upload as fallback');
          // We need to get user info first to get the URN
          const userResponse = await fetch('https://api.linkedin.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          
          if (!userResponse.ok) {
            console.error('[LinkedIn Post] Failed to get user info for image upload:', await userResponse.text());
            // Fall back to text-only post
            return await postAsUser(accessToken, message);
          }
          
          const userData = await userResponse.json();
          const personURN = `urn:li:person:${userData.id}`;
          
          const linkedinImageUrn = await uploadImageToLinkedIn(imageUrl, accessToken, personURN, altText);
          console.log(`[LinkedIn Post] Successfully uploaded image for personal user. URN: ${linkedinImageUrn}`);
          
          return await postWithImageAsUser(accessToken, message, linkedinImageUrn, altText);
        } catch (imageError) {
          console.error('[LinkedIn Post] Error uploading image for personal user:', imageError);
          console.log('[LinkedIn Post] Will continue with text-only personal post');
        }
      }
      return await postAsUser(accessToken, message);
    }
    
    // Use the first organization URN for posting
    console.log('[LinkedIn Post] *** FLOW: USING FIRST ORGANIZATION FROM METADATA ***');
    const orgInfo = organizationURNs[0];
    const orgURN = orgInfo.urn || `urn:li:organization:${orgInfo.id}`;
    console.log(`[LinkedIn Post] Using organization URN: ${orgURN}`);
    
    // Check for and handle image upload for this organization path too
    if (imageUrl) {
      console.log(`[LinkedIn Post] FLOW STEP 1: Download and upload image to LinkedIn`);
      try {
        console.log(`[LinkedIn Post] Starting standard flow image upload with URL: ${imageUrl}`);
        const linkedinImageUrn = await uploadImageToLinkedIn(imageUrl, accessToken, orgURN, altText);
        
        if (!linkedinImageUrn || 
            (!linkedinImageUrn.includes('urn:li:image:') && 
             !linkedinImageUrn.includes('urn:li:digitalmediaAsset:'))) {
          console.error(`[LinkedIn Post] Failed to get a valid image URN: ${linkedinImageUrn}`);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to get a valid LinkedIn image URN',
            details: { imageUrn: linkedinImageUrn }
          }, { status: 500 });
        }
        
        console.log(`[LinkedIn Post] FLOW STEP 2: Image successfully uploaded to LinkedIn. URN: ${linkedinImageUrn}`);
        
        // Image was uploaded successfully, now create the post with the image
        console.log(`[LinkedIn Post] FLOW STEP 3: Creating post with the uploaded image`);
        return await postWithImageAsOrganization(accessToken, orgURN, message, linkedinImageUrn, altText);
      } catch (imageError) {
        console.error('[LinkedIn Post] Error during image upload process:', imageError);
        // Return error instead of falling back to text-only post
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to process image for LinkedIn post',
          details: imageError instanceof Error ? imageError.message : String(imageError)
        }, { status: 500 });
      }
    } else {
      // Only use text-only post when no image is provided
      console.log(`[LinkedIn Post] No image URL provided, creating text-only post`);
      return await postAsOrganization(accessToken, orgURN, message);
    }
    
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
    const ugcErrorText = await ugcResponse.text();
    console.log(`[LinkedIn Post] UGC API failed, trying REST Posts API. Error: ${ugcErrorText}`);
    
    // Use the /rest/posts endpoint (newer API) as the last resort
    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
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
          ugcError: ugcErrorText,
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
          'X-Restli-Protocol-Version': '2.0.0'
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

// Helper: Upload image to LinkedIn with correct owner, recipe, PUT, and MIME type
async function uploadImageToLinkedIn(imageUrl: string, accessToken: string, ownerUrn: string, altText?: string): Promise<string> {
  console.log(`[LinkedIn Post] *** IMAGE UPLOAD STARTED ***`);
  console.log(`[LinkedIn Post] Uploading image from URL: ${imageUrl}`);
  console.log(`[LinkedIn Post] Using owner URN: ${ownerUrn}`);
  
  try {
    // Step 1: Initialize upload - USE v2 ENDPOINT INSTEAD OF REST
    console.log(`[LinkedIn Post] Initializing upload with LinkedIn (using v2 API)...`);
    const initResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-RestLi-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        registerUploadRequest: {
          owner: ownerUrn,
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent"
            }
          ],
          supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"]
        }
      })
    });
    
    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error(`[LinkedIn Post] LinkedIn image initialization failed with status ${initResponse.status}: ${errorText}`);
      throw new Error(`Failed to initialize image upload: ${errorText}`);
    }
    
    const initData = await initResponse.json();
    console.log(`[LinkedIn Post] LinkedIn provided upload details:`, JSON.stringify(initData, null, 2));
    
    // Extract upload URL and asset value from the v2 response structure
    const uploadUrl = initData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    const asset = initData.value?.asset;
    
    if (!uploadUrl || !asset) {
      console.error(`[LinkedIn Post] LinkedIn did not provide valid upload URL or asset: ${JSON.stringify(initData)}`);
      throw new Error('Failed to get upload URL or asset from LinkedIn');
    }
    
    // Step 2: Download the image from the provided URL
    console.log(`[LinkedIn Post] Downloading image from URL: ${imageUrl}`);
    
    console.log('[LinkedIn Post] Using direct fetch approach for reliability');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    // Examine content type
    const contentType = imageResponse.headers.get('content-type');
    const contentLength = imageResponse.headers.get('content-length');
    console.log(`[LinkedIn Post] Image content details - Type: ${contentType}, Size: ${contentLength} bytes`);
    
    // Get the image data as a Buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Verify we have valid image data
    if (!imageBuffer || imageBuffer.byteLength < 100) {
      console.error(`[LinkedIn Post] Image too small (${imageBuffer?.byteLength || 0} bytes), likely not valid`);
      throw new Error('Image data is too small to be valid');
    }
    
    console.log(`[LinkedIn Post] Image downloaded successfully. Size: ${imageBuffer.byteLength} bytes`);
    
    // Step 3: Upload the image binary to LinkedIn
    // Force the MIME type based on the URL extension
    let mimeType = 'image/png';
    if (imageUrl.toLowerCase().endsWith('.jpg') || imageUrl.toLowerCase().endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (imageUrl.toLowerCase().endsWith('.png')) {
      mimeType = 'image/png';
    } else if (imageUrl.toLowerCase().endsWith('.gif')) {
      mimeType = 'image/gif';
    } else if (contentType && contentType.startsWith('image/')) {
      // Use the actual content type if available and valid
      mimeType = contentType;
    }
    
    console.log(`[LinkedIn Post] Using MIME type: ${mimeType} for upload`);
    console.log(`[LinkedIn Post] Uploading image to LinkedIn using PUT. Details:`, JSON.stringify({
      uploadUrl,
      method: 'PUT', 
      contentType: mimeType,
      bodySize: imageBuffer.byteLength
    }, null, 2));
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType
      },
      body: imageBuffer
    });
    
    console.log(`[LinkedIn Post] Image upload response: ${uploadResponse.status} ${uploadResponse.statusText}`);
    
    if (!uploadResponse.ok) {
      let errorMessage = `Failed to upload image to LinkedIn: ${uploadResponse.status} ${uploadResponse.statusText}`;
      try {
        const errorText = await uploadResponse.text();
        errorMessage += ` - ${errorText}`;
        console.error(`[LinkedIn Post] Upload error details: ${errorText}`);
      } catch (e) {
        console.error(`[LinkedIn Post] Couldn't read error response: ${e}`);
      }
      throw new Error(errorMessage);
    }
    
    console.log(`[LinkedIn Post] Image successfully uploaded to LinkedIn. Asset: ${asset}`);
    
    // Return the asset ID for use in posts
    return asset;
  } catch (error) {
    console.error(`[LinkedIn Post] *** IMAGE UPLOAD FAILED ***`, error);
    throw error; // Re-throw to be handled by the caller
  }
}

// Helper: Post with image as organization
async function postWithImageAsOrganization(accessToken: string, orgURN: string, message: string, imageUrn: string, altText?: string) {
  console.log('\n==========================================================');
  console.log('[LinkedIn Post] *** POSTING WITH IMAGE AS ORGANIZATION ***');
  console.log(`[LinkedIn Post] Organization: ${orgURN}`);
  console.log(`[LinkedIn Post] Image URN: ${imageUrn}`);
  console.log(`[LinkedIn Post] Message length: ${message.length} characters`);
  console.log('==========================================================\n');
  
  // Ensure the image URN is valid
  if (!imageUrn || 
      (!imageUrn.includes('urn:li:image:') && 
       !imageUrn.includes('urn:li:digitalmediaAsset:'))) {
    console.error(`[LinkedIn Post] Invalid image URN format: "${imageUrn}"`);
    // TESTING: Return error instead of fallback to text-only
    return NextResponse.json({ 
      success: false, 
      error: 'Image posting failed - invalid image URN format',
      details: { imageUrn }
    }, { status: 400 });
  }
  
  try {
    // Try first the UGC Posts API which might handle images better for organizations
    console.log('[LinkedIn Post] Attempting to post image using UGC Posts API...');
    
    // Prepare UGC API request body - Support both URN formats
    const ugcRequestBody = {
      author: orgURN,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: message },
          shareMediaCategory: 'IMAGE',
          media: [
            {
              status: 'READY',
              description: { text: altText || 'Image' },
              media: imageUrn
            }
          ]
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    };
    
    // For digitalmediaAsset format, we need a different payload structure
    if (imageUrn.includes('urn:li:digitalmediaAsset:')) {
      console.log('[LinkedIn Post] Using digitalmediaAsset format for UGC post');
      ugcRequestBody.specificContent['com.linkedin.ugc.ShareContent'].media = [
        {
          status: 'READY',
          description: { text: altText || 'Image' },
          media: imageUrn,
          title: { text: 'Image' }
        } as any // Use type assertion to avoid linter error
      ];
    }
    
    console.log('[LinkedIn Post] UGC API request:', JSON.stringify(ugcRequestBody, null, 2));
    
    const ugcResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-RestLi-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(ugcRequestBody)
    });
    
    // If UGC API succeeds, return the result
    if (ugcResponse.ok) {
      const ugcResult = await ugcResponse.json();
      console.log('[LinkedIn Post] UGC post with image successful:', JSON.stringify(ugcResult, null, 2));
      return NextResponse.json({ 
        success: true, 
        message: 'LinkedIn UGC post with image created successfully', 
        postId: ugcResult.id,
        imageIncluded: true
      });
    }
    
    // If UGC fails, log error and try REST API
    const ugcErrorText = await ugcResponse.text();
    console.error(`[LinkedIn Post] UGC API failed with status ${ugcResponse.status}:`, ugcErrorText);
    
    // Now try REST Posts API
    console.log('[LinkedIn Post] Attempting to post with image using REST Posts API...');
    
    // Prepare REST API request body - use updated format
    const requestBody = {
      author: orgURN,
      commentary: message,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      content: {
        media: {
          altText: altText || 'Image',
          id: imageUrn
        }
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    };
    
    console.log('[LinkedIn Post] REST API request:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json', 
        'X-RestLi-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('[LinkedIn Post] REST Posts API with image successful:', JSON.stringify(result, null, 2));
      return NextResponse.json({ 
        success: true, 
        message: 'LinkedIn post with image created successfully', 
        postId: result.id,
        imageIncluded: true
      });
    }
    
    // If REST fails as well, return both errors
    const errorText = await response.text();
    console.error(`[LinkedIn Post] REST Posts API also failed with status ${response.status}:`, errorText);
    
    // Try Share API as a last resort
    console.log('[LinkedIn Post] Attempting to post image using Share API (last resort)...');
    
    const shareBody = {
      owner: orgURN,
      content: {
        contentEntities: [
          {
            entity: imageUrn
          }
        ],
        title: 'Image Post',
        shareMediaCategory: 'IMAGE'
      },
      text: {
        text: message
      },
      distribution: {
        linkedInDistributionTarget: {}
      }
    };
    
    console.log('[LinkedIn Post] Share API request:', JSON.stringify(shareBody, null, 2));
    
    const shareResponse = await fetch('https://api.linkedin.com/v2/shares', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-RestLi-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(shareBody)
    });
    
    if (shareResponse.ok) {
      const shareResult = await shareResponse.json();
      console.log('[LinkedIn Post] Share API with image successful:', JSON.stringify(shareResult, null, 2));
      return NextResponse.json({ 
        success: true, 
        message: 'LinkedIn share with image created successfully', 
        postId: shareResult.id || shareResult.activity,
        imageIncluded: true
      });
    }
    
    const shareErrorText = await shareResponse.text();
    console.error(`[LinkedIn Post] Share API failed with status ${shareResponse.status}:`, shareErrorText);
    
    // If all attempts failed, return error with comprehensive details
    console.error('[LinkedIn Post] All image posting methods failed');
    
    // TESTING: Return error instead of fallback to text-only
    return NextResponse.json({ 
      success: false, 
      error: 'LinkedIn post with image failed - all methods tried',
      details: { 
        ugcError: ugcErrorText,
        restError: errorText,
        shareError: shareErrorText,
        imageUrn
      } 
    }, { status: 500 });
    
  } catch (error: any) {
    console.error('[LinkedIn Post] Exception during image posting:', error.message || error);
    
    // TESTING: Return error instead of fallback to text-only
    return NextResponse.json({ 
      success: false, 
      error: 'Exception during LinkedIn image posting',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper: Post with image as user
async function postWithImageAsUser(accessToken: string, message: string, imageUrn: string, altText?: string) {
  console.log('\n==========================================================');
  console.log('[LinkedIn Post] *** POSTING WITH IMAGE AS USER ***');
  console.log(`[LinkedIn Post] Image URN: ${imageUrn}`);
  console.log(`[LinkedIn Post] Message length: ${message.length} characters`);
  console.log('==========================================================\n');
  
  // Ensure the image URN is valid
  if (!imageUrn || 
      (!imageUrn.includes('urn:li:image:') && 
       !imageUrn.includes('urn:li:digitalmediaAsset:'))) {
    console.error(`[LinkedIn Post] Invalid image URN format: "${imageUrn}"`);
    // TESTING: Return error instead of fallback to text-only
    return NextResponse.json({ 
      success: false, 
      error: 'Image posting failed - invalid image URN format',
      details: { imageUrn }
    }, { status: 400 });
  }
  
  try {
    // Get user info
    console.log('[LinkedIn Post] Fetching user info...');
    const userResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('[LinkedIn Post] Failed to get user info:', errorText);
      // TESTING: Return error instead of fallback to text-only
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to get user info for image post',
        details: errorText
      }, { status: 500 });
    }
    
    const userData = await userResponse.json();
    const personURN = `urn:li:person:${userData.id}`;
    console.log(`[LinkedIn Post] Using person URN for image post: ${personURN}`);
    
    // Prepare REST API request body
    const requestBody = {
      author: personURN,
      commentary: message,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      content: {
        media: {
          altText: altText || 'Image',
          id: imageUrn
        }
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    };
    
    console.log('[LinkedIn Post] Personal post with image request:', JSON.stringify(requestBody, null, 2));
    
    // Use REST Posts API (preferred)
    console.log('[LinkedIn Post] Attempting personal post with image using REST API...');
    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-RestLi-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('[LinkedIn Post] Personal post with image successful:', JSON.stringify(result, null, 2));
      return NextResponse.json({ 
        success: true, 
        message: 'LinkedIn personal post with image created successfully', 
        postId: result.id,
        imageIncluded: true
      });
    }
    
    // If REST API fails, try UGC API
    const errorText = await response.text();
    console.error(`[LinkedIn Post] REST Posts API failed for personal image post with status ${response.status}:`, errorText);
    
    try {
      const errorJson = JSON.parse(errorText);
      console.error('[LinkedIn Post] Parsed REST API error for personal post:', JSON.stringify(errorJson, null, 2));
    } catch (e) {
      console.log('[LinkedIn Post] Could not parse personal post REST error as JSON');
    }
    
    // Fallback to UGC API
    console.log('[LinkedIn Post] Falling back to UGC API for personal image post');
    
    const ugcRequestBody = {
      author: personURN,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: message },
          shareMediaCategory: 'IMAGE',
          media: [
            {
              status: 'READY',
              description: { text: altText || 'Image' },
              media: imageUrn
            }
          ]
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    };
    
    console.log('[LinkedIn Post] UGC personal image post request:', JSON.stringify(ugcRequestBody, null, 2));
    
    const ugcResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-RestLi-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(ugcRequestBody)
    });
    
    if (ugcResponse.ok) {
      const ugcResult = await ugcResponse.json();
      console.log('[LinkedIn Post] UGC personal post with image successful:', JSON.stringify(ugcResult, null, 2));
      return NextResponse.json({ 
        success: true, 
        message: 'LinkedIn personal UGC post with image created successfully', 
        postId: ugcResult.id,
        imageIncluded: true
      });
    }
    
    // If all attempts failed, return error for testing
    const ugcErrorText = await ugcResponse.text();
    console.error(`[LinkedIn Post] UGC API also failed for personal image post with status ${ugcResponse.status}:`, ugcErrorText);
    
    console.error('[LinkedIn Post] All personal image posting methods failed');
    
    // TESTING: Return error instead of fallback to text-only
    return NextResponse.json({ 
      success: false, 
      error: 'LinkedIn personal post with image failed - all methods tried',
      details: { 
        restError: errorText,
        ugcError: ugcErrorText
      } 
    }, { status: 500 });
    
  } catch (error: any) {
    console.error('[LinkedIn Post] Exception during personal image posting:', error.message || error);
    
    // TESTING: Return error instead of fallback to text-only
    return NextResponse.json({ 
      success: false, 
      error: 'Exception during LinkedIn personal image posting',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 