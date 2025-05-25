import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;
    const organizationId = formData.get('organizationId') as string;
    const issuerId = formData.get('issuerId') as string;

    if (!file || !category || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file details
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${category}/${fileName}`;

    // Check if documents bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      return NextResponse.json({ error: 'Failed to check storage buckets' }, { status: 500 });
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'documents');
    
    if (!bucketExists) {
      // Create the bucket
      const { error: createError } = await supabase.storage.createBucket('documents', {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024
      });
      
      if (createError) {
        return NextResponse.json({ error: 'Failed to create storage bucket' }, { status: 500 });
      }
    }

    // Upload file to storage
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Save document metadata to database
    const { error: dbError, data: document } = await supabase
      .from('knowledge_vault_documents')
      .insert({
        name: file.name,
        category,
        url: publicUrl,
        organization_id: organizationId,
        issuer_id: issuerId || null,
        size: file.size,
        type: fileExt,
        user_id: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (dbError) {
      return NextResponse.json({ error: 'Failed to save document metadata' }, { status: 500 });
    }

    return NextResponse.json({ success: true, document });
  } catch (error: any) {
    console.error('Error in document upload API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 