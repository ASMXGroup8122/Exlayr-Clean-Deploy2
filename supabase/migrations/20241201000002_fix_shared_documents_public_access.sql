-- Add missing RLS policy to allow public access to shared documents by token
CREATE POLICY "Public can access shared documents by token" ON shared_documents
  FOR SELECT USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Also allow public access for updates (to track access count)
CREATE POLICY "Public can update access tracking for shared documents" ON shared_documents
  FOR UPDATE USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  ); 