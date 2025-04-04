-- Create view for exchange members
create view exchange_member_view as
select 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.status,
    u.is_org_admin,
    u.created_at,
    e.id as exchange_id,
    e.exchange_name,
    e.status as exchange_status,
    case when u.id = e.created_by then 'admin' else 'member' end as member_role
from auth.users u
join exchange e on u.organization_id = e.id;

-- Create view for pending exchange approvals
create view pending_exchange_approvals as
select 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.created_at as request_date,
    e.id as exchange_id,
    e.exchange_name
from auth.users u
join exchange e on u.organization_id = e.id
where u.status = 'pending'
and e.status = 'active';

-- Function to approve exchange member
create or replace function approve_exchange_member(
    p_exchange_id uuid,
    p_user_id uuid,
    p_approver_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_is_admin boolean;
    v_exchange_status text;
begin
    -- Check if exchange exists and is active
    select status into v_exchange_status
    from exchange
    where id = p_exchange_id;

    if v_exchange_status is null then
        raise exception 'Exchange not found';
    end if;

    if v_exchange_status != 'active' then
        raise exception 'Exchange is not active';
    end if;

    -- Check if approver is exchange admin
    select exists (
        select 1 
        from auth.users u
        join exchange e on u.organization_id = e.id
        where e.id = p_exchange_id
        and u.id = p_approver_id
        and (u.is_org_admin = true or u.id = e.created_by)
    ) into v_is_admin;

    if not v_is_admin then
        raise exception 'Unauthorized: Only exchange admins can approve members';
    end if;

    -- Update member status
    update auth.users
    set status = 'active',
        updated_at = now()
    where id = p_user_id
    and organization_id = p_exchange_id;

    -- Record approval in history
    insert into approval_history (
        organization_id,
        organization_type,
        affected_user_id,
        approver_id,
        action_type,
        new_status
    ) values (
        p_exchange_id,
        'exchange',
        p_user_id,
        p_approver_id,
        'member_approval',
        'active'
    );
end;
$$; 