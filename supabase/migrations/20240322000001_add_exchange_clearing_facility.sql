-- Add clearing column to exchange table
ALTER TABLE public.exchange
ADD COLUMN clearing text;

-- Add comment to explain the column
COMMENT ON COLUMN public.exchange.clearing IS 'The clearing facility associated with the exchange'; 