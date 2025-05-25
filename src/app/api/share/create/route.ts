import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Use regular client for auth check
    const authClient = await createClient();
    
    // Try service role first, fallback to regular client
    let supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      console.log('Using service role client for creation');
    } else {
      supabase = authClient;
      console.log('Using regular client for creation (no service role key found)');
    }
    
    // Check authentication
    const { data: { session }, error: authError } = await authClient.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, accessLevel, expiresInHours } = body;

    // Validate input
    if (!listingId || !accessLevel) {
      return NextResponse.json({ 
        error: 'Missing required fields: listingId and accessLevel' 
      }, { status: 400 });
    }

    if (!['view', 'comment'].includes(accessLevel)) {
      return NextResponse.json({ 
        error: 'Invalid access level. Must be "view" or "comment"' 
      }, { status: 400 });
    }

    // Verify user has access to this listing
    const { data: listing, error: listingError } = await supabase
      .from('listing')
      .select('instrumentid, instrumentcreatedby')
      .eq('instrumentid', listingId)
      .single();

    if (listingError || !listing) {
      console.error('Listing lookup error:', { listingId, listingError, listing });
      return NextResponse.json({ 
        error: 'Listing not found',
        debug: { listingId, error: listingError?.message }
      }, { status: 404 });
    }

    // Check if user has permission to share this listing
    // User must be the creator of the listing or have appropriate permissions
    if (session.user.id !== listing.instrumentcreatedby) {
      return NextResponse.json({ 
        error: 'You do not have permission to share this document' 
      }, { status: 403 });
    }

    // Generate secure token
    let finalToken: string;
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_share_token');

    if (tokenError || !tokenData) {
      console.error('Token generation error:', tokenError);
      // Fallback: generate token in JavaScript if the function doesn't exist
      finalToken = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
      console.log('Using fallback token generation');
    } else {
      finalToken = tokenData;
    }

    // Calculate expiration date
    let expiresAt = null;
    if (expiresInHours && expiresInHours > 0) {
      expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000)).toISOString();
    }

    // Create shared document record
    console.log('Creating shared document with:', {
      listing_id: listingId,
      created_by: session.user.id,
      access_level: accessLevel,
      token: finalToken,
      expires_at: expiresAt
    });

    const { data: sharedDoc, error: createError } = await supabase
      .from('shared_documents')
      .insert({
        listing_id: listingId,
        created_by: session.user.id,
        access_level: accessLevel,
        token: finalToken,
        expires_at: expiresAt
      })
      .select()
      .single();

    console.log('Insert result:', { sharedDoc, createError });

    if (createError) {
      console.error('Failed to create shared document:', createError);
      return NextResponse.json({ 
        error: 'Failed to create shared document',
        debug: createError.message
      }, { status: 500 });
    }

    // Generate the shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/${finalToken}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      token: finalToken,
      accessLevel,
      expiresAt,
      sharedDocument: sharedDoc
    });

  } catch (error) {
    console.error('Error creating shared document:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 