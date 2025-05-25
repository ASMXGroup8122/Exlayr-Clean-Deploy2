import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Try service role first, fallback to regular client
    let supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      console.log('Using service role client');
    } else {
      supabase = await createClient();
      console.log('Using regular client (no service role key found)');
    }
    
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ 
        error: 'Missing token' 
      }, { status: 400 });
    }

    // Validate the shared document access directly
    console.log('Looking for token:', token);
    console.log('Token length:', token.length);
    console.log('Token type:', typeof token);
    
    // First, let's see if the token exists at all
    const { data: allSharedDocs, error: debugError } = await supabase
      .from('shared_documents')
      .select('token, is_active, expires_at, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('Recent shared documents:', allSharedDocs);
    
    // Try to find any token that contains our search token
    const { data: similarTokens, error: similarError } = await supabase
      .from('shared_documents')
      .select('token, is_active, expires_at')
      .ilike('token', `%${token}%`);
    
    console.log('Similar tokens:', similarTokens);
    
    const { data: sharedDoc, error: validationError } = await supabase
      .from('shared_documents')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    console.log('Token lookup result:', { sharedDoc, validationError });
    console.log('Exact token match query:', { token, is_active: true });

    if (validationError || !sharedDoc) {
      console.error('Validation error:', validationError);
      return NextResponse.json({ 
        error: 'Invalid or expired token',
        debug: { token, validationError: validationError?.message }
      }, { status: 404 });
    }

    // Check if token has expired
    if (sharedDoc.expires_at && new Date(sharedDoc.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'Token has expired' 
      }, { status: 403 });
    }

    // Update access tracking
    await supabase
      .from('shared_documents')
      .update({ 
        access_count: (sharedDoc.access_count || 0) + 1,
        first_accessed_at: sharedDoc.first_accessed_at || new Date().toISOString()
      })
      .eq('id', sharedDoc.id);

    // Fetch the listing document data
    const { data: documentData, error: docError } = await supabase
      .from('listingdocumentdirectlisting')
      .select('*')
      .eq('instrumentid', sharedDoc.listing_id)
      .single();

    if (docError || !documentData) {
      return NextResponse.json({ 
        error: 'Document not found' 
      }, { status: 404 });
    }

    // Fetch listing metadata
    const { data: listing, error: listingError } = await supabase
      .from('listing')
      .select('instrumentname, instrumentticker, instrumentcreatedby')
      .eq('instrumentid', sharedDoc.listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ 
        error: 'Listing not found' 
      }, { status: 404 });
    }

    // Fetch sponsor information
    const { data: sponsor, error: sponsorError } = await supabase
      .from('users')
      .select('company_name')
      .eq('id', listing.instrumentcreatedby)
      .single();

    // Fetch comments if access level allows
    let comments: any[] = [];
    if (sharedDoc.access_level === 'comment') {
      const { data: commentsData, error: commentsError } = await supabase
        .from('document_comments')
        .select(`
          id,
          section_id,
          content,
          created_at,
          resolved,
          user_id,
          users:user_id (
            first_name,
            last_name,
            company_name
          )
        `)
        .eq('document_id', sharedDoc.listing_id)
        .order('created_at', { ascending: true });

      if (!commentsError && commentsData) {
        comments = commentsData;
      }
    }

    return NextResponse.json({
      success: true,
      accessLevel: sharedDoc.access_level,
      expiresAt: sharedDoc.expires_at,
      document: documentData,
      listing: {
        id: sharedDoc.listing_id,
        name: listing.instrumentname,
        ticker: listing.instrumentticker,
        sponsor: sponsor?.company_name || 'Unknown Sponsor'
      },
      comments,
      isSharedView: true
    });

  } catch (error) {
    console.error('Error validating shared document:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 