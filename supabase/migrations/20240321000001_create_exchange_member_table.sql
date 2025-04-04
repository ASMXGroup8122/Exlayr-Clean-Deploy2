-- Create exchange member table
create table if not exists public.exchange_member (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    exchange_id uuid not null references public.exchange(id) on delete cascade,
    role text not null check (role in ('admin', 'member')),
    status text not null check (status in ('pending', 'active', 'suspended')) default 'pending',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(user_id, exchange_id)
);

-- Add RLS policies
alter table public.exchange_member enable row level security;

-- Allow authenticated users to view exchange members
create policy "Users can view exchange members"
    on public.exchange_member
    for select
    to authenticated
    using (
        -- User can view if they are:
        -- 1. An admin
        -- 2. A member of the same exchange
        -- 3. The exchange owner
        exists (
            select 1 from auth.users u
            where u.id = auth.uid()
            and (
                u.account_type = 'admin'
                or u.id in (
                    select user_id 
                    from public.exchange_member 
                    where exchange_id = exchange_member.exchange_id
                )
                or u.id = (
                    select created_by 
                    from public.exchange 
                    where id = exchange_member.exchange_id
                )
            )
        )
    );

-- Allow admins to manage exchange members
create policy "Admins can manage exchange members"
    on public.exchange_member
    for all
    to authenticated
    using (
        exists (
            select 1 from auth.users
            where id = auth.uid()
            and account_type = 'admin'
        )
    );

-- Allow exchange admins to manage their exchange members
create policy "Exchange admins can manage their exchange members"
    on public.exchange_member
    for all
    to authenticated
    using (
        exists (
            select 1 from public.exchange_member em
            where em.exchange_id = exchange_member.exchange_id
            and em.user_id = auth.uid()
            and em.role = 'admin'
            and em.status = 'active'
        )
    );

-- Create trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger handle_exchange_member_updated_at
    before update on public.exchange_member
    for each row
    execute function public.handle_updated_at();

-- Grant access to authenticated users
grant all on public.exchange_member to authenticated; 