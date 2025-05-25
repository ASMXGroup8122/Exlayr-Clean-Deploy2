import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Use service role client to bypass RLS for shared document validation
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const body = await request.json();
    const { token, fieldId, content, guestName } = body;

    if (!token || !fieldId || !content) {
      return NextResponse.json({ 
        error: 'Missing required fields: token, fieldId, and content' 
      }, { status: 400 });
    }

    // Validate the shared document access directly
    const { data: sharedDoc, error: validationError } = await supabase
      .from('shared_documents')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (validationError || !sharedDoc) {
      console.error('Comment validation error:', validationError);
      return NextResponse.json({ 
        error: 'Invalid or expired share token' 
      }, { status: 403 });
    }

    // Check if token has expired
    if (sharedDoc.expires_at && new Date(sharedDoc.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'Share token has expired' 
      }, { status: 403 });
    }

    // Check if the access level allows commenting
    if (sharedDoc.access_level !== 'comment') {
      return NextResponse.json({ 
        error: 'This share link does not allow commenting' 
      }, { status: 403 });
    }

    // Get user information from the request (for anonymous commenting)
    // In a real implementation, you might want to collect user info in the comment form
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'Unknown';

    // For guest users, store guest information instead of user_id
    const guestInfo = {
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
      provided_name: guestName || 'Anonymous Guest'
    };
    
    // Insert the comment with guest information
    const { data: comment, error: commentError } = await supabase
      .from('document_comments')
      .insert({
        document_id: sharedDoc.listing_id,
        section_id: fieldId,
        content: content.trim(),
        user_id: null, // No user_id for guest comments
        user_name: guestName || 'Anonymous Guest',
        guest_user_info: guestInfo
        // Remove status field to use default value
      })
      .select()
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json({ 
        error: 'Failed to create comment' 
      }, { status: 500 });
    }

    // Update access count for the shared document
    const { data: currentDoc } = await supabase
      .from('shared_documents')
      .select('access_count')
      .eq('token', token)
      .single();

    await supabase
      .from('shared_documents')
      .update({ 
        access_count: (currentDoc?.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('token', token);

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_name: comment.user_name
      }
    });

  } catch (error) {
    console.error('Error in share comment API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 