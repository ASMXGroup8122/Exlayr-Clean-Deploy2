-- Create table for spoken voice profiles
CREATE TABLE IF NOT EXISTS "spoken_voice_profiles" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "voice_id" TEXT NOT NULL,
  "settings" JSONB NOT NULL DEFAULT '{"stability": 0.30, "clarity": 0.75}'::JSONB,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS spoken_voice_profiles_organization_id_idx ON "spoken_voice_profiles"("organization_id");
CREATE INDEX IF NOT EXISTS spoken_voice_profiles_user_id_idx ON "spoken_voice_profiles"("user_id");

-- Add RLS policies for spoken voice profiles
ALTER TABLE "spoken_voice_profiles" ENABLE ROW LEVEL SECURITY;

-- Policy for selecting voice profiles - only for organization members
CREATE POLICY "Organization members can view voice profiles" 
ON "spoken_voice_profiles" FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM organization_members
  WHERE user_id = auth.uid()
));

-- Policy for inserting voice profiles - only for organization members
CREATE POLICY "Organization members can insert voice profiles" 
ON "spoken_voice_profiles" FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  ) AND
  user_id = auth.uid()
);

-- Policy for updating voice profiles - only for the creator or admin
CREATE POLICY "Users can update their own voice profiles" 
ON "spoken_voice_profiles" FOR UPDATE 
USING (
  user_id = auth.uid() OR
  (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
);

-- Policy for deleting voice profiles - only for the creator or admin
CREATE POLICY "Users can delete their own voice profiles" 
ON "spoken_voice_profiles" FOR DELETE 
USING (
  user_id = auth.uid() OR
  (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
); 