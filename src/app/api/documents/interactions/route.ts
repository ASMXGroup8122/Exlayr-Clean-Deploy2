import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      documentId,
      sectionId,
      reviewCycleId,
      content,
      type,
      version,
    } = body;

    // Validate required fields
    if (!documentId || !sectionId || !reviewCycleId || !content || !type || !version) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert the interaction
    const { data, error } = await supabase
      .from('document_interactions')
      .insert({
        document_id: documentId,
        section_id: sectionId,
        review_cycle_id: reviewCycleId,
        content,
        type,
        version,
        created_by: user.id,
        metadata: {
          user_email: user.email,
          user_name: user.user_metadata?.full_name || user.email
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting interaction:', error);
      return NextResponse.json(
        { error: 'Failed to create interaction' },
        { status: 500 }
      );
    }

    // If this is an approval or rejection, update the review cycle status
    if (type === 'approval' || type === 'rejection') {
      const { error: updateError } = await supabase
        .from('document_review_cycles')
        .update({
          status: type === 'approval' ? 'approved' : 'rejected',
          completed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', reviewCycleId);

      if (updateError) {
        console.error('Error updating review cycle:', updateError);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in interactions route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    console.log('GET /api/documents/interactions - Start');
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized', details: authError }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const sectionId = searchParams.get('sectionId');
    const reviewCycleId = searchParams.get('reviewCycleId');

    console.log('Query parameters:', { documentId, sectionId, reviewCycleId });

    if (!documentId || !sectionId) {
      return NextResponse.json(
        { error: 'Missing required parameters', required: ['documentId', 'sectionId'] },
        { status: 400 }
      );
    }

    // First, verify the document exists
    const { data: document, error: documentError } = await supabase
      .from('listingdocumentdirectlisting')
      .select('instrumentid')
      .eq('instrumentid', documentId)
      .single();

    if (documentError || !document) {
      console.error('Document not found:', documentError);
      return NextResponse.json(
        { error: 'Document not found', details: documentError },
        { status: 404 }
      );
    }

    // Now fetch interactions
    let query = supabase
      .from('document_interactions')
      .select(`
        *,
        created_by:users(
          id,
          email,
          user_metadata
        )
      `)
      .eq('document_id', documentId)
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false });

    if (reviewCycleId) {
      query = query.eq('review_cycle_id', reviewCycleId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching interactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch interactions', details: error },
        { status: 500 }
      );
    }

    console.log('Found interactions:', data?.length || 0);

    // Transform the data to match the InteractionTimeline interface
    const interactions = data?.map((item) => ({
      id: item.id,
      type: item.type,
      content: item.content,
      timestamp: item.created_at,
      version: item.version,
      user: {
        name: item.created_by?.user_metadata?.full_name || item.created_by?.email || 'Unknown User',
        avatar: item.created_by?.user_metadata?.avatar_url
      }
    })) || [];

    return NextResponse.json(interactions);
  } catch (error) {
    console.error('Unexpected error in interactions route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 