-- Create document_section_status table
create table if not exists public.document_section_status (
  id uuid not null default extensions.uuid_generate_v4(),
  document_id text not null,
  section_id text not null,
  section_title text not null,
  status text not null,
  updated_by text not null, -- This should be a user ID in a real implementation
  updated_at timestamp with time zone not null default now(),
  comment text null,
  constraint document_section_status_pkey primary key (id),
  constraint document_section_status_status_check check (
    status = any (array['pending', 'approved', 'rejected', 'needs_revision'])
  )
);

-- Add RLS policies
alter table public.document_section_status enable row level security;

-- Allow authenticated users to view document section status
create policy "Users can view document section status"
  on public.document_section_status
  for select
  to authenticated
  using (true);

-- Allow authenticated users to insert document section status
create policy "Users can insert document section status"
  on public.document_section_status
  for insert
  to authenticated
  with check (true);

-- Create function to notify sponsors when document section status changes
create or replace function public.handle_document_section_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_creator text;
  v_notification_type text;
  v_notification_message text;
begin
  -- Get the document creator
  select instrumentcreatedby into v_document_creator
  from public.listing
  where instrumentid = new.document_id;
  
  -- Set notification type based on status
  if new.status = 'approved' then
    v_notification_type := 'success';
    v_notification_message := 'Section "' || new.section_title || '" has been approved.';
  elsif new.status = 'needs_revision' then
    v_notification_type := 'warning';
    v_notification_message := 'Section "' || new.section_title || '" needs revision.';
    if new.comment is not null then
      v_notification_message := v_notification_message || ' Comment: ' || new.comment;
    end if;
  elsif new.status = 'rejected' then
    v_notification_type := 'error';
    v_notification_message := 'Section "' || new.section_title || '" has been rejected.';
    if new.comment is not null then
      v_notification_message := v_notification_message || ' Comment: ' || new.comment;
    end if;
  else
    v_notification_type := 'info';
    v_notification_message := 'Section "' || new.section_title || '" status changed to ' || new.status || '.';
  end if;
  
  -- Create notification for document creator
  insert into public.notifications (
    user_id,
    title,
    message,
    type,
    read,
    action_url
  ) values (
    v_document_creator,
    'Document Section Status Update',
    v_notification_message,
    v_notification_type,
    false,
    '/dashboard/sponsor/listings/' || new.document_id || '/document'
  );
  
  return new;
end;
$$;

-- Create trigger for document section status changes
create trigger on_document_section_status_change
  after insert on public.document_section_status
  for each row
  execute function public.handle_document_section_status_change(); 