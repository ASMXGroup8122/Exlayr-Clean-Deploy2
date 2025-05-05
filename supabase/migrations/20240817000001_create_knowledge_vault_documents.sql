-- Create table for knowledge vault documents
CREATE TABLE IF NOT EXISTS "knowledge_vault_documents" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "url" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "organization_id" UUID NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS knowledge_vault_documents_organization_id_idx ON "knowledge_vault_documents"("organization_id");
CREATE INDEX IF NOT EXISTS knowledge_vault_documents_user_id_idx ON "knowledge_vault_documents"("user_id");

-- Add RLS policies for knowledge vault documents
ALTER TABLE "knowledge_vault_documents" ENABLE ROW LEVEL SECURITY;

-- Policy for selecting documents - only for organization members
CREATE POLICY "Organization members can view documents" 
ON "knowledge_vault_documents" FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM users
    WHERE auth.uid() = id AND organization_id IS NOT NULL
  )
);

-- Policy for inserting documents - only for organization members
CREATE POLICY "Organization members can insert documents" 
ON "knowledge_vault_documents" FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  organization_id IN (
    SELECT organization_id FROM users
    WHERE auth.uid() = id AND organization_id IS NOT NULL
  )
);

-- Policy for updating documents - only for the creator or admin
CREATE POLICY "Users can update their own documents" 
ON "knowledge_vault_documents" FOR UPDATE 
USING (
  user_id = auth.uid() OR
  (organization_id IN (
    SELECT organization_id FROM users
    WHERE auth.uid() = id AND is_org_admin = true
  ))
);

-- Policy for deleting documents - only for the creator or admin
CREATE POLICY "Users can delete their own documents" 
ON "knowledge_vault_documents" FOR DELETE 
USING (
  user_id = auth.uid() OR
  (organization_id IN (
    SELECT organization_id FROM users
    WHERE auth.uid() = id AND is_org_admin = true
  ))
); 