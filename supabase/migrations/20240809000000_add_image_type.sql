-- Add image_type to social_posts table
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS image_type TEXT;

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN social_posts.image_type IS 'Type of image to generate (e.g., photorealistic editorial, cartoon, infographic)';

-- Update existing null values (optional - remove if not needed)
-- UPDATE social_posts SET image_type = 'photorealistic editorial' WHERE image_type IS NULL AND image_status = 'pending'; 