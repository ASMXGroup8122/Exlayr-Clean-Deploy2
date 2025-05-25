-- Migration to support guest comments
-- Make user_id nullable to allow guest comments
ALTER TABLE document_comments ALTER COLUMN user_id DROP NOT NULL;

-- Add a field to store guest user information
ALTER TABLE document_comments ADD COLUMN IF NOT EXISTS guest_user_info JSONB;

-- Update the constraint to allow either user_id or guest_user_info
ALTER TABLE document_comments ADD CONSTRAINT check_user_or_guest 
CHECK (
  (user_id IS NOT NULL AND guest_user_info IS NULL) OR 
  (user_id IS NULL AND guest_user_info IS NOT NULL)
); 