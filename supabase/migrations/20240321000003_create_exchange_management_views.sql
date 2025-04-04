-- Drop existing views and functions
drop view if exists exchange_member_view;
drop view if exists pending_exchange_approvals;
drop function if exists approve_exchange_member;

-- Create view for exchange members
create view exchange_member_view as
select 
    em.id,
    em.user_id,
    em.exchange_id,
    em.role,
    em.status,
    em.created_at,
    u.email,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as full_name
from exchange_member em
join auth.users u on em.user_id = u.id;

-- Create view for pending exchange approvals
create view pending_exchange_approvals as
select 
    em.id as member_id,
    em.user_id,
    u.email,
    u.first_name,
    u.last_name,
    em.created_at as request_date,
    em.exchange_id,
    e.exchange_name
from exchange_member em
join auth.users u on em.user_id = u.id
join exchange e on em.exchange_id = e.id
where em.status = 'pending'
and e.status = 'active';

-- Function to approve exchange member
create or replace function approve_exchange_member(
    p_member_id uuid,
    p_approver_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_is_admin boolean;
    v_exchange_id uuid;
    v_exchange_status text;
begin
    -- Get exchange ID and check if it exists and is active
    select em.exchange_id, e.status 
    into v_exchange_id, v_exchange_status
    from exchange_member em
    join exchange e on em.exchange_id = e.id
    where em.id = p_member_id;

    if v_exchange_id is null then
        raise exception 'Member not found';
    end if;

    if v_exchange_status != 'active' then
        raise exception 'Exchange is not active';
    end if;

    -- Check if approver is exchange admin
    select exists (
        select 1 
        from exchange_member em
        where em.exchange_id = v_exchange_id
        and em.user_id = p_approver_id
        and em.role = 'admin'
        and em.status = 'active'
    ) into v_is_admin;

    if not v_is_admin then
        raise exception 'Unauthorized: Only exchange admins can approve members';
    end if;

    -- Update member status
    update exchange_member
    set status = 'active',
        updated_at = now()
    where id = p_member_id;

    -- Record approval in history
    insert into approval_history (
        organization_id,
        organization_type,
        affected_user_id,
        approver_id,
        action_type,
        new_status
    ) values (
        v_exchange_id,
        'exchange',
        (select user_id from exchange_member where id = p_member_id),
        p_approver_id,
        'member_approval',
        'active'
    );
end;
$$;

-- Grant access to authenticated users
grant select on exchange_member_view to authenticated;
grant select on pending_exchange_approvals to authenticated; 