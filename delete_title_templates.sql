-- Delete Problematic Title Templates
-- These templates don't have corresponding database columns and cause processing issues

-- Delete the 3 problematic title templates
DELETE FROM direct_listingprompts WHERE promptname = 'sec3prompt_title';
DELETE FROM direct_listingprompts WHERE promptname = 'sec4prompt_title';
DELETE FROM direct_listingprompts WHERE promptname = 'sec5prompt_title';

-- Verify deletion
SELECT COUNT(*) as remaining_templates FROM direct_listingprompts;

-- Show what templates are left (should be 57 now)
SELECT 
  CASE 
    WHEN promptname LIKE 'sec1prompt%' THEN 'Section 1'
    WHEN promptname LIKE 'sec2prompt%' THEN 'Section 2'
    WHEN promptname LIKE 'sec3prompt%' THEN 'Section 3'
    WHEN promptname LIKE 'sec4prompt%' THEN 'Section 4'
    WHEN promptname LIKE 'sec5prompt%' THEN 'Section 5'
    WHEN promptname LIKE 'sec6prompt%' THEN 'Section 6'
  END as section,
  COUNT(*) as template_count
FROM direct_listingprompts 
WHERE promptname LIKE 'sec%prompt%'
GROUP BY 
  CASE 
    WHEN promptname LIKE 'sec1prompt%' THEN 'Section 1'
    WHEN promptname LIKE 'sec2prompt%' THEN 'Section 2'
    WHEN promptname LIKE 'sec3prompt%' THEN 'Section 3'
    WHEN promptname LIKE 'sec4prompt%' THEN 'Section 4'
    WHEN promptname LIKE 'sec5prompt%' THEN 'Section 5'
    WHEN promptname LIKE 'sec6prompt%' THEN 'Section 6'
  END
ORDER BY section; 