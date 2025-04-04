-- Add clearinghouse column to listing table
ALTER TABLE public.listing
ADD COLUMN instrumentclearinghouse text;

-- Add comment to explain the column
COMMENT ON COLUMN public.listing.instrumentclearinghouse IS 'The clearinghouse associated with the listing'; 