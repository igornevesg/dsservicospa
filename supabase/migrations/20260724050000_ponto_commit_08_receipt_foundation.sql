begin;

alter table public.clock_attempts
  add column if not exists nsr bigint,
  add column if not exists mark_hash char(64);

create sequence if not exists public.clock_nsr_seq as bigint start 1 increment 1 no cycle;

with ordered as (
  select id,row_number() over(order by server_recorded_at,id) as new_nsr
  from public.clock_attempts
  where status='accepted' and nsr is null
)
update public.clock_attempts a
set nsr=ordered.new_nsr
from ordered
where a.id=ordered.id;

update public.clock_attempts
set mark_hash=encode(extensions.digest(convert_to(
  concat_ws('|','DS-REP-P-v1',nsr::text,company_id::text,employee_id::text,work_site_id::text,event_type::text,to_char(server_recorded_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),
  'UTF8'
),'sha256'),'hex')
where status='accepted' and mark_hash is null;

select setval('public.clock_nsr_seq',coalesce((select max(nsr) from public.clock_attempts where nsr is not null),0)+1,false);

create unique index if not exists clock_attempts_nsr_unique on public.clock_attempts(nsr) where nsr is not null;
create unique index if not exists clock_attempts_mark_hash_unique on public.clock_attempts(mark_hash) where mark_hash is not null;

alter table public.clock_attempts
  add constraint clock_attempts_receipt_fields_check
  check (
    (status='accepted' and nsr is not null and mark_hash is not null)
    or (status='rejected' and nsr is null and mark_hash is null)
  ) not valid;
alter table public.clock_attempts validate constraint clock_attempts_receipt_fields_check;

create or replace function public.assign_clock_receipt_fields()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status='accepted' then
    new.nsr=nextval('public.clock_nsr_seq');
    new.mark_hash=encode(extensions.digest(convert_to(
      concat_ws('|','DS-REP-P-v1',new.nsr::text,new.company_id::text,new.employee_id::text,new.work_site_id::text,new.event_type::text,to_char(new.server_recorded_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),
      'UTF8'
    ),'sha256'),'hex');
  else
    new.nsr=null;
    new.mark_hash=null;
  end if;
  return new;
end;
$$;

drop trigger if exists clock_attempts_assign_receipt_fields on public.clock_attempts;
create trigger clock_attempts_assign_receipt_fields
before insert on public.clock_attempts
for each row execute function public.assign_clock_receipt_fields();

create table public.rep_configuration (
  singleton boolean primary key default true check(singleton),
  employer_name text,
  employer_tax_id text,
  employer_registration text,
  inpi_registration text,
  developer_name text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.rep_configuration(singleton) values(true) on conflict(singleton) do nothing;
alter table public.rep_configuration enable row level security;
create policy rep_configuration_admin_read on public.rep_configuration for select to authenticated using(public.is_admin());
create policy rep_configuration_admin_update on public.rep_configuration for update to authenticated using(public.is_admin()) with check(public.is_admin());
revoke insert,delete on public.rep_configuration from authenticated;

commit;
