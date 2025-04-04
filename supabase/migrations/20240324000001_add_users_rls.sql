-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can update user status" ON public.users;
DROP POLICY IF EXISTS "Exchange admins can update member status" ON public.users;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow service role to bypass RLS
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Allow admins to update any user's status
CREATE POLICY "Admins can update user status"
ON public.users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'is_admin' = 'true'
      OR auth.users.email = 'admin@exlayr.com'  -- Allow platform admin
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'is_admin' = 'true'
      OR auth.users.email = 'admin@exlayr.com'  -- Allow platform admin
    )
  )
);

-- Allow exchange admins to update member statuses
CREATE POLICY "Exchange admins can update member status"
ON public.users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM exchange_member_roles emr
    WHERE emr.user_id = auth.uid()
    AND emr.role = 'admin'
    AND EXISTS (
      SELECT 1 FROM exchange_member_roles target_member
      WHERE target_member.user_id = public.users.id
      AND target_member.exchange_id = emr.exchange_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM exchange_member_roles emr
    WHERE emr.user_id = auth.uid()
    AND emr.role = 'admin'
    AND EXISTS (
      SELECT 1 FROM exchange_member_roles target_member
      WHERE target_member.user_id = public.users.id
      AND target_member.exchange_id = emr.exchange_id
    )
  )
); 