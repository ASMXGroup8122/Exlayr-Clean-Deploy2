-- Enable RLS on shared_documents table
ALTER TABLE shared_documents ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to create shared documents for their own listings
CREATE POLICY "Users can create shared documents for their listings" ON shared_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM listing 
      WHERE listing.instrumentid = shared_documents.listing_id 
      AND listing.instrumentcreatedby = auth.uid()
    )
  );

-- Policy to allow users to read their own shared documents
CREATE POLICY "Users can read their own shared documents" ON shared_documents
  FOR SELECT USING (created_by = auth.uid());

-- Policy to allow public access to shared documents by token (for validation)
CREATE POLICY "Public can access shared documents by token" ON shared_documents
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Policy to allow users to update their own shared documents
CREATE POLICY "Users can update their own shared documents" ON shared_documents
  FOR UPDATE USING (created_by = auth.uid()); 