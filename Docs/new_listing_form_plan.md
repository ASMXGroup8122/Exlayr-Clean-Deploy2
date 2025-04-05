# New Listing Form Plan

## Database Schema
```sql
create table public.listing (
  instrumentid uuid not null default extensions.uuid_generate_v4(),
  instrumentname text not null,
  instrumentticker text not null,
  instrumentisin text null,
  instrumentmic text null,
  instrumentcficode text null,
  instrumentinvestorcategory text not null,
  instrumentcategory text not null,
  instrumentsubcategory text not null,
  instrumentexchange text not null,
  instrumentexchangeboard text not null,
  instrumentlistingtype text not null,
  instrumentlistingdate date null,
  instrumentapprovaldate date null,
  instrumentsecuritiesadmissionstatus text not null default 'draft',
  instrumentsponsor text not null,
  instrumentcustodyagent text null,
  instrumentadministrator text null,
  instrumentisrestricted boolean not null default false,
  instrumentsecuritytokentype text null,
  instrumentbondsecurity text null,
  instrumentbondpccterm numeric null,
  instrumentbondpcccoupon text null,
  instrumentdividendrights text null,
  instrumentsecuritiesissued numeric not null,
  instrumentnosecuritiestobelisted numeric not null,
  instrumentofferproceeds text not null,
  instrumentuseofproceeds text not null,
  instrumentofferminimum numeric null,
  instrumentlistingprice numeric not null,
  instrumentequitynominalvalue numeric null,
  instrumentcurrency text not null,
  instrumentcurrencysymbol text not null,
  instrumentcurrencyinwords text not null,
  instrumentcurrencyofissuewords text not null,
  instrumentunitofsecurity text not null,
  instrumentpaymentofsecurities text not null,
  instrumentvotingrights text null,
  instrumenttransferlimitations text null,
  instrumentredemptionrights text null,
  instrumentconversionrights text null,
  instrumentotherterms text null,
  instrumenttradingcurrency text not null,
  instrumentsettlementcurrency text not null,
  instrumentdistributioncurrency text not null,
  instrumentminimumtradingsize numeric not null,
  instrumentminimumtradingincrement numeric not null,
  instrumentsettlementcycle text not null,
  instrumentclearinghouse text not null,
  instrumentregistrar text not null,
  instrumentpayingagent text not null,
  instrumentissuerid uuid not null,
  instrumentissuername text not null,
  instrumentcreatedby uuid not null references public.users(id),
  instrumentupdatedat timestamp with time zone not null default now(),
  constraint listing_pkey primary key (instrumentid),
  constraint listing_status_check check (
    instrumentsecuritiesadmissionstatus = any (array['draft', 'pending', 'approved', 'rejected'])
  ),
  constraint listing_category_check check (
    instrumentcategory = any (array['Equity', 'Bond', 'Fund', 'Derivative', 'Other'])
  ),
  constraint listing_exchange_board_check check (
    instrumentexchangeboard = any (array['Main', 'SME', 'VCAP'])
  ),
  constraint listing_type_check check (
    instrumentlistingtype = any (array['IPO', 'Direct Listing', 'Secondary Listing', 'Other'])
  )
);

-- After the listing table, add these supporting tables:

create table public.listing_status_history (
  id uuid not null default extensions.uuid_generate_v4(),
  listing_id uuid not null references public.listing(instrumentid),
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

create table public.notifications (
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

-- Create the function for submitting a listing for approval
create or replace function public.submit_listing_for_approval(
    p_listing_id uuid,
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

-- Create trigger to maintain updated_at
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

create trigger update_listing_updated_at_trigger
    before update on public.listing
    for each row
    execute function public.update_listing_updated_at();
```

## What We're Building
A multi-step form to create a new listing with all required fields from the database schema. This is a comprehensive securities listing form that captures:

1. Basic Instrument Information ✅
   - instrumentname (Name) ✅
   - instrumentticker (Ticker) ✅
   - instrumentisin (ISIN) ✅
   - instrumentmic (MIC code) ✅
   - instrumentcficode (CFI code) ✅
   - instrumentinvestorcategory ✅
   - instrumentcategory ✅
   - instrumentsubcategory ✅
   - instrumentsecuritytype ✅
   - instrumentsharesclass (for Equity) ✅
   - instrumentbondtype (for Bond) ✅

2. Listing Details (In Progress)
   - instrumentexchange (Exchange) ✅
   - instrumentwhichboard (Board) ✅
   - instrumentlistingtype (Listing Type)
   - instrumentlistingdate (auto-set to 'pending') ✅
   - instrumentapprovaldate (auto-set to 'pending') ✅
   - instrumentsecuritiesadmissionstatus (auto-set to 'pending') ✅

3. Financial Details (Next)
   - instrumentsecuritiesissued (Number of Securities issued)
   - instrumentnosecuritiestobelisted (Number to be listed)
   - instrumentofferproceeds
   - instrumentuseofproceeds
   - instrumentofferminimum
   - instrumentlistingprice
   - instrumentcurrency
   - instrumentcurrencysymbol
   - instrumentcurrencyinwords

4. Rights & Terms (Pending)
   - instrumentpreemptionrights
   - instrumentbondrights
   - instrumentdividendrights
   - instrumentequityvotingrights
   - instrumenttransferability
   - instrumentbondpccterm
   - instrumentbondpcccoupon
   - instrumentbondpccredemptionrights

5. Administrative Details (Pending)
   - instrumentsponsor
   - instrumentcustodyagent
   - instrumentadministrator
   - instrumentunderwriter1nameandaddress through instrumentunderwriter5nameandaddress
   - instrumentconnectedplatform

6. Additional Information (Pending)
   - instrumentpurposeoflisting
   - instrumentlistingdocument
   - instrumentcomplianceapproved
   - instrumentsecuritytokentype
   - instrumentofferperiodanddate

## Current Status
- ✅ Section 1 (Basic Instrument Information) is complete with correct schema mapping
- ✅ Exchange & Board selection from Section 2 is complete
- ✅ Auto-set fields (Status, Dates, Securities Admission) configured
- 🔄 Currently working on instrumentlistingtype field

## Next Steps
1. Complete Listing Details section by adding:
   - instrumentlistingtype dropdown (IPO, Direct Listing, etc.)

2. Begin Financial Details section implementation

## Technical Notes
- Using Tailwind CSS for styling
- Form state managed with React useState
- Data persistence with Supabase
- Form validation to be implemented
- Multi-step form navigation to be added
- Auto-set fields handled in backend submission
- All field names must match the database schema exactly 