-- Create table for organization settings to store external API keys
CREATE TABLE IF NOT EXISTS "organization_settings" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" UUID NOT NULL,
  "elevenlabs_api_key" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE ("organization_id")
);

-- Add RLS policies for organization settings
ALTER TABLE "organization_settings" ENABLE ROW LEVEL SECURITY;

-- Policy for selecting organization settings - only for organization members
CREATE POLICY "Organization members can view their organization settings" 
ON "organization_settings" FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM users
  WHERE auth.uid() = id AND organization_id IS NOT NULL
));

-- Policy for inserting organization settings - anyone with the organization_id should be allowed to save API keys
CREATE POLICY "Users can insert organization settings" 
ON "organization_settings" FOR INSERT 
WITH CHECK (organization_id IN (
  SELECT organization_id FROM users
  WHERE auth.uid() = id
));

-- Policy for updating organization settings - anyone with the organization_id should be allowed to update API keys
CREATE POLICY "Users can update organization settings" 
ON "organization_settings" FOR UPDATE 
USING (organization_id IN (
  SELECT organization_id FROM users
  WHERE auth.uid() = id
))
WITH CHECK (organization_id IN (
  SELECT organization_id FROM users
  WHERE auth.uid() = id
)); 