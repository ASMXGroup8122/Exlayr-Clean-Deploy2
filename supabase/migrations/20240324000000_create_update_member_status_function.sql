-- Create a function to update member status in both tables within a transaction
CREATE OR REPLACE FUNCTION public.update_member_status(
    p_member_id UUID,
    p_user_id UUID,
    p_exchange_id UUID,
    p_new_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Start transaction
    BEGIN
        -- Update exchange_member_roles table
        UPDATE public.exchange_member_roles
        SET status = p_new_status
        WHERE id = p_member_id AND exchange_id = p_exchange_id;

        -- Update users table
        UPDATE public.users
        SET status = p_new_status
        WHERE id = p_user_id;

        -- If we're activating a member and the exchange isn't active, activate it
        IF p_new_status = 'active' THEN
            UPDATE public.exchange
            SET status = 'active'
            WHERE id = p_exchange_id AND status != 'active';
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- If anything fails, the transaction will be rolled back
        RAISE EXCEPTION 'Failed to update member status: %', SQLERRM;
    END;
END;
$$; 