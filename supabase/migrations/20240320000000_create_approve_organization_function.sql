-- Function to approve an organization and its creator in a single transaction
CREATE OR REPLACE FUNCTION approve_organization(
    organization_id UUID,
    organization_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    creator_id UUID;
BEGIN
    -- Start transaction
    BEGIN
        -- Get the creator's user ID based on organization type
        CASE organization_type
            WHEN 'sponsor' THEN
                SELECT created_by INTO creator_id FROM exchange_sponsor WHERE id = organization_id;
            WHEN 'issuer' THEN
                SELECT created_by INTO creator_id FROM issuers WHERE id = organization_id;
            WHEN 'exchange' THEN
                SELECT created_by INTO creator_id FROM exchanges WHERE id = organization_id;
            ELSE
                RAISE EXCEPTION 'Invalid organization type: %', organization_type;
        END CASE;

        -- Update organization status based on type
        CASE organization_type
            WHEN 'sponsor' THEN
                UPDATE exchange_sponsor SET status = 'active' WHERE id = organization_id;
            WHEN 'issuer' THEN
                UPDATE issuers SET status = 'active' WHERE id = organization_id;
            WHEN 'exchange' THEN
                UPDATE exchanges SET status = 'active' WHERE id = organization_id;
        END CASE;

        -- Update creator's status
        UPDATE users
        SET status = 'active'
        WHERE id = creator_id;

        -- Record in approval history
        INSERT INTO approval_history (
            organization_id,
            organization_type,
            new_status,
            affected_user_id,
            action_type
        ) VALUES (
            organization_id,
            organization_type,
            'active',
            creator_id,
            'organization_approval'
        );

    EXCEPTION WHEN OTHERS THEN
        -- Rollback transaction on error
        RAISE;
    END;
END;
$$; 