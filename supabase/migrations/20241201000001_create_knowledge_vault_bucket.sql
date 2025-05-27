-- Create the knowledge_vault_documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge_vault_documents',
  'knowledge_vault_documents',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the knowledge_vault_documents bucket
CREATE POLICY "Users can upload to knowledge_vault_documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'knowledge_vault_documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view knowledge_vault_documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'knowledge_vault_documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own knowledge_vault_documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'knowledge_vault_documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own knowledge_vault_documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'knowledge_vault_documents' AND
  auth.role() = 'authenticated'
); 