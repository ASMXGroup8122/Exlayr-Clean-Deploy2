-- Fix Knowledge Vault Upload Functionality
-- Run this script in Supabase SQL Editor

-- 1. Ensure RLS policies exist for documents bucket
-- First, check if policies already exist and drop them if they do
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- Create comprehensive RLS policies for documents bucket
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

-- 2. Ensure knowledge_vault_documents table has proper RLS policies
-- Enable RLS on the table if not already enabled
ALTER TABLE knowledge_vault_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their organization documents" ON knowledge_vault_documents;
DROP POLICY IF EXISTS "Users can insert documents for their organization" ON knowledge_vault_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON knowledge_vault_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON knowledge_vault_documents;

-- Create RLS policies for knowledge_vault_documents table
CREATE POLICY "Users can view their organization documents" ON knowledge_vault_documents
FOR SELECT USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can insert documents for their organization" ON knowledge_vault_documents
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid()
);

CREATE POLICY "Users can update their own documents" ON knowledge_vault_documents
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid()
);

CREATE POLICY "Users can delete their own documents" ON knowledge_vault_documents
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid()
);

-- 3. Update documents bucket to allow larger files (50MB)
UPDATE storage.buckets 
SET file_size_limit = 52428800  -- 50MB in bytes
WHERE id = 'documents';

-- 4. Verify the setup
SELECT 
  'Bucket Configuration' as check_type,
  name,
  public,
  file_size_limit,
  CASE 
    WHEN file_size_limit >= 52428800 THEN '✅ 50MB+ limit'
    ELSE '❌ Limit too small'
  END as status
FROM storage.buckets 
WHERE id = 'documents'

UNION ALL

SELECT 
  'Table RLS Status' as check_type,
  'knowledge_vault_documents' as name,
  CASE WHEN relrowsecurity THEN 'true' ELSE 'false' END as public,
  NULL as file_size_limit,
  CASE WHEN relrowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as status
FROM pg_class 
WHERE relname = 'knowledge_vault_documents';

-- 5. Test query to verify table structure
SELECT 'Table Structure Check' as info, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'knowledge_vault_documents'; 