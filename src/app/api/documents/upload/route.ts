import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Document upload API called - v3 - DEBUGGING BUCKET ISSUE');
    
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;
    const organizationId = formData.get('organizationId') as string;
    const issuerId = formData.get('issuerId') as string;

    console.log('📤 Upload request details:', {
      fileName: file?.name,
      fileSize: file?.size,
      category,
      organizationId,
      issuerId
    });

    if (!file || !category || !organizationId) {
      console.error('❌ Missing required fields:', { file: !!file, category, organizationId });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Supabase clients
    const supabase = await createClient(); // For auth and database
    const supabaseAdmin = createServiceClient( // For storage operations
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user is authenticated
    console.log('🔐 Checking authentication...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    console.log('🔐 Auth check result:', { 
      hasSession: !!session, 
      hasError: !!authError, 
      userId: session?.user?.id,
      error: authError?.message 
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }
    
    if (!session) {
      console.error('❌ No session found');
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    // Get file details
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${category}/${fileName}`;

    // Check if documents bucket exists using admin client
    console.log('🗂️ Checking storage buckets with admin client...');
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
    
    console.log('🗂️ Bucket check result:', { 
      bucketsCount: buckets?.length, 
      hasError: !!bucketError,
      error: bucketError?.message,
      buckets: buckets?.map(b => ({ name: b.name, public: b.public }))
    });
    
    if (bucketError) {
      console.error('❌ Bucket error:', bucketError);
      return NextResponse.json({ error: 'Failed to check storage buckets' }, { status: 500 });
    }
    
    // Use the existing 'documents' bucket
    const bucketExists = buckets?.some((bucket: any) => bucket.name === 'documents');
    
    console.log('🔍 Looking for documents bucket:', {
      bucketExists,
      availableBuckets: buckets?.map(b => b.name),
      searchingFor: 'documents'
    });
    
    if (!bucketExists) {
      console.error('❌ Documents bucket does not exist');
      console.log('📋 Available buckets:', buckets?.map(b => b.name));
      return NextResponse.json({ 
        error: 'Storage bucket not found', 
        availableBuckets: buckets?.map(b => b.name) 
      }, { status: 500 });
    }

    // Upload file to storage using admin client
    console.log('📤 Starting file upload to storage...', { filePath, fileSize: file.size });
    const { error: uploadError, data: uploadData } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    console.log('📤 Upload result:', { 
      hasError: !!uploadError, 
      hasData: !!uploadData,
      error: uploadError?.message 
    });
    
    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }

    // Get public URL using admin client
    const { data: { publicUrl } } = supabaseAdmin.storage
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
      console.error('Database insert error:', dbError);
      // Try to clean up the uploaded file using admin client
      await supabaseAdmin.storage.from('documents').remove([filePath]);
      return NextResponse.json({ error: `Failed to save document metadata: ${dbError.message}` }, { status: 500 });
    }

    console.log('✅ Document upload successful:', {
      documentId: document.id,
      fileName: file.name,
      publicUrl
    });

    return NextResponse.json({ success: true, document });
  } catch (error: any) {
    console.error('❌ Error in document upload API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 