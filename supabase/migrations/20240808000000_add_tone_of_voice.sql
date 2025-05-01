-- Create tone_of_voice table
CREATE TABLE IF NOT EXISTS tone_of_voice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE
);

-- Add RLS (Row Level Security) policies
ALTER TABLE tone_of_voice ENABLE ROW LEVEL SECURITY;

-- Allow users to see only tones of voice belonging to their organization
CREATE POLICY tone_of_voice_select_policy ON tone_of_voice
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM user_organizations WHERE organization_id = tone_of_voice.organization_id
    )
  );

-- Allow users to insert tones of voice only for their organization
CREATE POLICY tone_of_voice_insert_policy ON tone_of_voice
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_organizations WHERE organization_id = tone_of_voice.organization_id
    )
  );

-- Allow users to update only tones of voice belonging to their organization
CREATE POLICY tone_of_voice_update_policy ON tone_of_voice
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM user_organizations WHERE organization_id = tone_of_voice.organization_id
    )
  );

-- Allow users to delete only tones of voice belonging to their organization
CREATE POLICY tone_of_voice_delete_policy ON tone_of_voice
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM user_organizations WHERE organization_id = tone_of_voice.organization_id
    )
  );

-- Add tone_of_voice_id to social_posts table
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS tone_of_voice_id UUID REFERENCES tone_of_voice (id) ON DELETE SET NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_tone_of_voice_updated_at
BEFORE UPDATE ON tone_of_voice
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 