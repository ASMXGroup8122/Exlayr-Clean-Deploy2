import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  console.log('[Social Post Save] Processing request');
  
  try {
    // Parse request body
    const body = await request.json();
    const { 
      organizationId, 
      platform, 
      postText, 
      imageUrl, 
      url, 
      thoughts, 
      postStatus,
      imageStatus,
      status,
      approvedAt,
      posted_at,
      sentiment,
      linkedin_post_type,
      twitter_post_type,
      instagram_post_type,
      postId 
    } = body;
    
    // Validate required parameters
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }
    
    if (!platform) {
      return NextResponse.json(
        { error: 'platform is required' },
        { status: 400 }
      );
    }
    
    if (!postText) {
      return NextResponse.json(
        { error: 'post_text is required' },
        { status: 400 }
      );
    }
    
    console.log(`[Social Post Save] Saving post for organization: ${organizationId}, platform: ${platform}`);
    
    // Get supabase client
    const supabase = await createClient();
    
    // Get current user to record as creator
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // Generate a post ID if not provided
    const id = uuidv4();
    
    // Insert into social_posts table
    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        id, // UUID for the post
        organization_id: organizationId,
        user_id: user.id,
        platform,
        post_text: postText,
        image_url: imageUrl,
        url,
        thoughts,
        post_status: postStatus || 'published',
        posted_at: posted_at || new Date().toISOString(),
        sentiment,
        linkedin_post_type,
        twitter_post_type,
        instagram_post_type,
        created_at: new Date().toISOString(),
        [`${platform}_urn`]: postId, // Store LinkedIn URN, Twitter ID, etc.
        image_status: imageStatus || 'approved', // Default to approved if not specified
        status: status || 'approved', // Default to approved if not specified
        approved_at: approvedAt || new Date().toISOString() // Default to current time if not specified
      })
      .select();
      
    if (error) {
      console.error('[Social Post Save] Error saving post:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to save post', 
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    console.log('[Social Post Save] Post saved successfully:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Post saved successfully',
      post: data[0]
    });
    
  } catch (error: any) {
    console.error('[Social Post Save] Unexpected error:', error.message || error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 