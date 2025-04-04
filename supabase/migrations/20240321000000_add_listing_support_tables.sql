-- Create listing status history table
create table if not exists public.listing_status_history (
  id uuid not null default extensions.uuid_generate_v4(),
  listing_id integer not null references public.listing(instrumentid),
  previous_status text not null,
  new_status text not null,
  changed_by uuid not null references public.users(id),
  changed_at timestamp with time zone not null default now(),
  reason text null,
  constraint listing_status_history_pkey primary key (id),
  constraint listing_status_history_status_check check (
    new_status = any (array['draft', 'pending', 'approved', 'rejected'])
  )
);

-- Create notifications table
create table if not exists public.notifications (
  id uuid not null default extensions.uuid_generate_v4(),
  user_id uuid not null references public.users(id),
  title text not null,
  message text not null,
  type text not null,
  read boolean not null default false,
  action_url text null,
  created_at timestamp with time zone not null default now(),
  constraint notifications_pkey primary key (id),
  constraint notifications_type_check check (
    type = any (array['info', 'warning', 'error', 'success'])
  )
);

-- Create function for submitting listing for approval
create or replace function public.submit_listing_for_approval(
    p_listing_id integer,
    p_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_current_status text;
begin
    -- Check if listing exists and get current status
    select instrumentsecuritiesadmissionstatus into v_current_status
    from public.listing
    where instrumentid = p_listing_id
    and instrumentcreatedby = p_user_id;

    if v_current_status is null then
        raise exception 'Listing not found or unauthorized access';
    end if;

    if v_current_status != 'draft' then
        raise exception 'Can only submit listings in draft status';
    end if;

    -- Start transaction
    begin
        -- Update listing status
        update public.listing
        set 
            instrumentsecuritiesadmissionstatus = 'pending',
            instrumentupdatedat = now()
        where instrumentid = p_listing_id;

        -- Record the status change
        insert into public.listing_status_history (
            listing_id,
            previous_status,
            new_status,
            changed_by
        ) values (
            p_listing_id,
            v_current_status,
            'pending',
            p_user_id
        );

        -- Create notifications for admins
        insert into public.notifications (
            user_id,
            title,
            message,
            type,
            action_url
        )
        select 
            u.id,
            'New Listing Submission',
            'A new listing has been submitted for approval',
            'info',
            '/dashboard/admin/listings/' || p_listing_id::text
        from public.users u
        where u.account_type = 'admin';

    exception when others then
        -- Log error and re-raise
        raise;
    end;
end;
$$;

-- Create trigger function for updating timestamp
create or replace function public.update_listing_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    new.instrumentupdatedat = now();
    return new;
end;
$$;

-- Create trigger
drop trigger if exists update_listing_updated_at_trigger on public.listing;
create trigger update_listing_updated_at_trigger
    before update on public.listing
    for each row
    execute function public.update_listing_updated_at(); 