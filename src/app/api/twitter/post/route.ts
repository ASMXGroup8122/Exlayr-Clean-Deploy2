import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Twitter API v2 endpoints
const TWITTER_API_BASE = 'https://api.twitter.com/2';

export async function POST(request: NextRequest) {
  console.log('\n==========================================================');
  console.log('[Twitter Post] Processing Twitter post request');
  
  try {
    const body = await request.json();
    const { 
      organizationId, 
      message, 
      imageUrl, 
      altText = 'Image for Twitter post' 
    } = body;
    
    // Validation
    if (!organizationId || !message) {
      return NextResponse.json(
        { error: 'Organization ID and message are required' },
        { status: 400 }
      );
    }
    
    console.log(`[Twitter Post] Processing for organization: ${organizationId}`);
    console.log(`[Twitter Post] Message length: ${message.length} characters`);
    
    // Check if message is too long for Twitter
    if (message.length > 280) {
      return NextResponse.json(
        { error: 'Twitter message exceeds 280 character limit' },
        { status: 400 }
      );
    }
    
    // Retrieve Twitter token from oauth_tokens table
    const supabase = await createClient();
    const { data: tokenData, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('access_token, refresh_token, expires_at, provider_account_id')
      .eq('organization_id', organizationId)
      .eq('provider', 'twitter')
      .single();
    
    if (tokenError || !tokenData) {
      console.error('[Twitter Post] Error retrieving token:', tokenError);
      return NextResponse.json(
        { 
          error: 'Twitter is not connected. Please connect Twitter for this organization first.',
          details: 'Go to Settings > Social Media Connections to connect your Twitter account.',
          needsConnection: true
        },
        { status: 404 }
      );
    }
    
    const accessToken = tokenData.access_token;
    
    // First step: If we have an image, upload it
    let mediaId = null;
    if (imageUrl) {
      try {
        console.log(`[Twitter Post] Uploading image: ${imageUrl}`);
        mediaId = await uploadImageToTwitter(imageUrl, accessToken, altText);
        console.log(`[Twitter Post] Image uploaded with media ID: ${mediaId}`);
      } catch (imageError) {
        console.error('[Twitter Post] Error uploading image:', imageError);
        console.log('[Twitter Post] Will continue with text-only post');
        // Continue with text-only post if image upload fails
      }
    }
    
    // Create the tweet
    const tweetData = await createTweet(message, mediaId, accessToken);
    
    if (!tweetData || !tweetData.data || !tweetData.data.id) {
      throw new Error('Failed to get valid tweet data from Twitter API');
    }
    
    console.log(`[Twitter Post] Successfully posted tweet with ID: ${tweetData.data.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Tweet posted successfully',
      postId: tweetData.data.id
    });
    
  } catch (error: any) {
    console.error('[Twitter Post] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to post tweet' 
    }, { status: 500 });
  }
}

// Helper function to upload image to Twitter
async function uploadImageToTwitter(imageUrl: string, accessToken: string, altText: string): Promise<string> {
  try {
    // 1. First, download the image
    console.log('[Twitter Post] Downloading image from URL');
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    // 2. Upload the media to Twitter v1.1 upload endpoint (v2 doesn't have a dedicated media endpoint)
    console.log('[Twitter Post] Uploading media to Twitter');
    
    // Twitter still uses v1.1 for media uploads
    const uploadResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'multipart/form-data',
      },
      // For simplicity, this implementation may need to be enhanced with proper multipart handling
      // using FormData or a dedicated package for multipart uploads
      body: new FormData(), // This is a placeholder and would need proper implementation
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload media: ${errorText}`);
    }
    
    const uploadData = await uploadResponse.json();
    const mediaId = uploadData.media_id_string;
    
    // 3. Add alt text if provided
    if (altText && mediaId) {
      console.log('[Twitter Post] Adding alt text to media');
      const altTextResponse = await fetch(`https://api.twitter.com/1.1/media/metadata/create.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_id: mediaId,
          alt_text: { text: altText }
        }),
      });
      
      if (!altTextResponse.ok) {
        // Just log the error but continue - alt text is not critical
        console.error('[Twitter Post] Error adding alt text:', await altTextResponse.text());
      }
    }
    
    return mediaId;
  } catch (error) {
    console.error('[Twitter Post] Error in uploadImageToTwitter:', error);
    throw error;
  }
}

// Helper function to create a tweet
async function createTweet(text: string, mediaId: string | null, accessToken: string): Promise<any> {
  const tweetEndpoint = `${TWITTER_API_BASE}/tweets`;
  
  const tweetPayload: any = {
    text: text
  };
  
  // If we have a media ID, add it to the request
  if (mediaId) {
    tweetPayload.media = {
      media_ids: [mediaId]
    };
  }
  
  console.log('[Twitter Post] Sending tweet with payload:', JSON.stringify(tweetPayload, null, 2));
  
  const response = await fetch(tweetEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tweetPayload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Twitter Post] Error creating tweet: ${response.status} ${response.statusText}`);
    console.error(`[Twitter Post] Error details: ${errorText}`);
    
    try {
      // Try to parse the error for better details
      const errorData = JSON.parse(errorText);
      throw new Error(`Twitter API error: ${JSON.stringify(errorData)}`);
    } catch (e) {
      // If not JSON, use the raw text
      throw new Error(`Twitter API error: ${errorText}`);
    }
  }
  
  return await response.json();
} 