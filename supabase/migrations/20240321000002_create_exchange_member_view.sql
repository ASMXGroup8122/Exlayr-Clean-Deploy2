-- Create exchange member view
CREATE OR REPLACE VIEW public.exchange_member_view AS
SELECT 
    em.id,
    em.user_id,
    em.exchange_id,
    em.role,
    em.status,
    em.created_at,
    u.email,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as full_name
FROM 
    public.exchange_member em
    JOIN public.user u ON em.user_id = u.id;

-- Grant access to authenticated users
GRANT SELECT ON public.exchange_member_view TO authenticated; 