begin;

create type public.manual_sheet_status as enum ('draft','submitted','approved','rejected');
create type public.manual_occurrence_type as enum ('worked','absence','day_off','medical_leave','vacation','holiday','other');

alter table public.profiles drop constraint if exists profiles_role_company_check;
alter table public.profiles add constraint profiles_role_company_check check(
  (role='admin' and company_id is null)
  or (role in ('supervisor','operator') and company_id is not null)
  or role='employee'
);

create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_role() in ('admin','supervisor','operator'),false) $$;

create or replace function public.can_access_company(target_company_id uuid) returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.is_admin() or (public.current_role() in ('supervisor','operator') and public.current_company_id()=target_company_id),false) $$;

drop policy if exists employees_read_scoped on public.employees;
create policy employees_read_scoped on public.employees for select to authenticated
using(id=(select employee_id from public.profiles where profiles.id=auth.uid()) or public.can_access_company(company_id));

create table public.manual_sheet_batches(
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default encode(extensions.gen_random_bytes(12),'hex'),
  company_id uuid not null references public.companies(id) on delete restrict,
  work_site_id uuid not null references public.work_sites(id) on delete restrict,
  competence date not null check(date_trunc('month',competence)::date=competence),
  document_path text not null,
  original_filename text not null,
  document_mime text not null check(document_mime in ('application/pdf','image/jpeg','image/png')),
  document_sha256 char(64) not null,
  status public.manual_sheet_status not null default 'draft',
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  decided_by uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  decision_reason text,
  unique(company_id,work_site_id,competence,document_sha256)
);

create table public.manual_time_entries(
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default encode(extensions.gen_random_bytes(12),'hex'),
  batch_id uuid not null references public.manual_sheet_batches(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  work_site_id uuid not null references public.work_sites(id) on delete restrict,
  work_date date not null,
  occurrence public.manual_occurrence_type not null default 'worked',
  clock_in time,
  break_start time,
  break_end time,
  clock_out time,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique(batch_id,employee_id,work_date),
  check(occurrence<>'worked' or (clock_in is not null and clock_out is not null))
);

create table public.manual_entry_revisions(
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.manual_time_entries(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  previous_data jsonb not null,
  new_data jsonb not null,
  reason text not null check(char_length(reason) between 10 and 1000),
  created_at timestamptz not null default now()
);

alter table public.manual_sheet_batches enable row level security;
alter table public.manual_time_entries enable row level security;
alter table public.manual_entry_revisions enable row level security;
create policy manual_batches_read on public.manual_sheet_batches for select to authenticated using(public.can_access_company(company_id));
create policy manual_entries_read on public.manual_time_entries for select to authenticated using(public.can_access_company(company_id));
create policy manual_revisions_read on public.manual_entry_revisions for select to authenticated using(exists(select 1 from public.manual_time_entries e where e.id=entry_id and public.can_access_company(e.company_id)));
revoke insert,update,delete on public.manual_sheet_batches,public.manual_time_entries,public.manual_entry_revisions from authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('manual-time-sheets','manual-time-sheets',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf','image/jpeg','image/png'];

create index manual_batches_scope_idx on public.manual_sheet_batches(company_id,competence desc);
create index manual_entries_employee_date_idx on public.manual_time_entries(employee_id,work_date);

commit;
