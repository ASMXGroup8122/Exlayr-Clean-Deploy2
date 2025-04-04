-- Create document comments table
CREATE TABLE IF NOT EXISTS public.document_comments (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  document_id uuid NOT NULL,
  section_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  CONSTRAINT document_comments_pkey PRIMARY KEY (id)
);

-- Add RLS policies
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for testing
CREATE POLICY "Allow all operations" ON public.document_comments
FOR ALL
USING (true)
WITH CHECK (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS document_comments_document_id_idx ON public.document_comments (document_id);
CREATE INDEX IF NOT EXISTS document_comments_section_id_idx ON public.document_comments (section_id);
CREATE INDEX IF NOT EXISTS document_comments_user_id_idx ON public.document_comments (user_id);

-- Add comment
COMMENT ON TABLE public.document_comments IS 'Stores comments on document sections for review'; 