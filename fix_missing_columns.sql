-- Fix Missing Database Columns for Document Generation System
-- This script adds the missing columns so all 60 templates can be processed

-- Add missing title columns for sections 3, 4, and 5
ALTER TABLE listingdocumentdirectlisting ADD COLUMN IF NOT EXISTS sec3_title TEXT;
ALTER TABLE listingdocumentdirectlisting ADD COLUMN IF NOT EXISTS sec4_title TEXT;
ALTER TABLE listingdocumentdirectlisting ADD COLUMN IF NOT EXISTS sec5_title TEXT;

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'listingdocumentdirectlisting' 
  AND column_name IN ('sec3_title', 'sec4_title', 'sec5_title')
ORDER BY column_name; 