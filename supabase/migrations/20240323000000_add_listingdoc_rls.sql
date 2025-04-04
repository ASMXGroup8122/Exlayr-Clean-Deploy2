-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own listings' documents" ON public.listingdocumentdirectlisting;
DROP POLICY IF EXISTS "Users can update their own listings' documents" ON public.listingdocumentdirectlisting;
DROP POLICY IF EXISTS "Users can insert documents for their own listings" ON public.listingdocumentdirectlisting;
DROP POLICY IF EXISTS "Users can manage listing documents" ON public.listingdocumentdirectlisting;

-- Enable RLS
ALTER TABLE public.listingdocumentdirectlisting ENABLE ROW LEVEL SECURITY;

-- Create a completely permissive policy for testing
CREATE POLICY "Allow all operations" ON public.listingdocumentdirectlisting
FOR ALL
USING (true)
WITH CHECK (true); 