-- Create table for spoken voice profiles
CREATE TABLE IF NOT EXISTS "spoken_voice" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "voice_id" TEXT NOT NULL,
  "settings" JSONB NOT NULL DEFAULT '{"stability": 0.30, "clarity": 0.75}'::JSONB,
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "organization_id" UUID NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS spoken_voice_organization_id_idx ON "spoken_voice"("organization_id");
CREATE INDEX IF NOT EXISTS spoken_voice_user_id_idx ON "spoken_voice"("user_id");

-- Add RLS policies for spoken voice profiles
ALTER TABLE "spoken_voice" ENABLE ROW LEVEL SECURITY;

-- Policy for selecting voice profiles - only for organization members
CREATE POLICY "Organization members can view voice profiles" 
ON "spoken_voice" FOR SELECT 
USING (
  auth.uid() = user_id OR 
  organization_id IN (
    SELECT organization_id FROM users
    WHERE auth.uid() = id AND organization_id IS NOT NULL
  )
);

-- Policy for inserting voice profiles - only for organization members
CREATE POLICY "Organization members can insert voice profiles" 
ON "spoken_voice" FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  organization_id IN (
    SELECT organization_id FROM users
    WHERE auth.uid() = id AND organization_id IS NOT NULL
  )
);

-- Policy for updating voice profiles - only for the creator or admin
CREATE POLICY "Users can update their own voice profiles" 
ON "spoken_voice" FOR UPDATE 
USING (
  user_id = auth.uid() OR
  (organization_id IN (
    SELECT organization_id FROM users
    WHERE auth.uid() = id AND is_org_admin = true
  ))
);

-- Policy for deleting voice profiles - only for the creator or admin
CREATE POLICY "Users can delete their own voice profiles" 
ON "spoken_voice" FOR DELETE 
USING (
  user_id = auth.uid() OR
  (organization_id IN (
    SELECT organization_id FROM users
    WHERE auth.uid() = id AND is_org_admin = true
  ))
); 