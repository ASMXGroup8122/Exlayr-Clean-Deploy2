-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can view their organization settings" ON "organization_settings";
DROP POLICY IF EXISTS "Organization admins can insert organization settings" ON "organization_settings";
DROP POLICY IF EXISTS "Organization admins can update organization settings" ON "organization_settings";
DROP POLICY IF EXISTS "Users can insert organization settings" ON "organization_settings";
DROP POLICY IF EXISTS "Users can update organization settings" ON "organization_settings";

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