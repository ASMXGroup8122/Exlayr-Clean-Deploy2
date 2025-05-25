-- Create shared_documents table for shareable document links
CREATE TABLE IF NOT EXISTS public.shared_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listing(instrumentid) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('view', 'comment')),
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  first_accessed_at TIMESTAMPTZ NULL,
  access_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS shared_documents_listing_id_idx ON public.shared_documents (listing_id);
CREATE INDEX IF NOT EXISTS shared_documents_token_idx ON public.shared_documents (token);
CREATE INDEX IF NOT EXISTS shared_documents_created_by_idx ON public.shared_documents (created_by);
CREATE INDEX IF NOT EXISTS shared_documents_expires_at_idx ON public.shared_documents (expires_at);

-- Enable RLS
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;

-- Policy for creators to view their own shared documents
CREATE POLICY "Users can view their own shared documents" 
ON public.shared_documents FOR SELECT 
USING (created_by = auth.uid());

-- Policy for creators to insert shared documents
CREATE POLICY "Users can create shared documents" 
ON public.shared_documents FOR INSERT 
WITH CHECK (created_by = auth.uid());

-- Policy for creators to update their own shared documents
CREATE POLICY "Users can update their own shared documents" 
ON public.shared_documents FOR UPDATE 
USING (created_by = auth.uid());

-- Policy for creators to delete their own shared documents
CREATE POLICY "Users can delete their own shared documents" 
ON public.shared_documents FOR DELETE 
USING (created_by = auth.uid());

-- Function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to validate and track access to shared documents
CREATE OR REPLACE FUNCTION validate_shared_document_access(share_token TEXT)
RETURNS TABLE(
  listing_id UUID,
  access_level TEXT,
  is_valid BOOLEAN,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  doc_record RECORD;
BEGIN
  -- Get the shared document record
  SELECT sd.listing_id, sd.access_level, sd.expires_at, sd.is_active, sd.first_accessed_at
  INTO doc_record
  FROM public.shared_documents sd
  WHERE sd.token = share_token;

  -- Check if document exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Check if document is active
  IF NOT doc_record.is_active THEN
    RETURN QUERY SELECT doc_record.listing_id, doc_record.access_level, FALSE, doc_record.expires_at;
    RETURN;
  END IF;

  -- Check if document has expired
  IF doc_record.expires_at IS NOT NULL AND doc_record.expires_at < now() THEN
    RETURN QUERY SELECT doc_record.listing_id, doc_record.access_level, FALSE, doc_record.expires_at;
    RETURN;
  END IF;

  -- Update access tracking
  UPDATE public.shared_documents 
  SET 
    access_count = access_count + 1,
    first_accessed_at = COALESCE(first_accessed_at, now())
  WHERE token = share_token;

  -- Return valid access
  RETURN QUERY SELECT doc_record.listing_id, doc_record.access_level, TRUE, doc_record.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE public.shared_documents IS 'Stores shareable document links with access control and expiration'; 