begin;

create type public.clock_event_type as enum ('clock_in','break_start','break_end','clock_out');
create type public.clock_attempt_status as enum ('accepted','rejected');

create table public.authorized_devices (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default encode(extensions.gen_random_bytes(12),'hex'),
  work_site_id uuid not null references public.work_sites(id) on delete cascade,
  installation_id text not null,
  label text,
  is_active boolean not null default true,
  authorized_by uuid references auth.users(id) on delete set null,
  authorized_at timestamptz not null default now(),
  unique(work_site_id, installation_id)
);

create table public.clock_capture_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.clock_attempts (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default encode(extensions.gen_random_bytes(12),'hex'),
  employee_id uuid not null references public.employees(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  work_site_id uuid not null references public.work_sites(id) on delete restrict,
  event_type public.clock_event_type not null,
  status public.clock_attempt_status not null,
  rejection_code text,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  accuracy_meters numeric(8,2) not null check (accuracy_meters >= 0),
  distance_meters numeric(10,2),
  photo_path text not null,
  device_installation_id text not null,
  device_platform text,
  device_model text,
  user_agent text,
  client_captured_at timestamptz,
  server_recorded_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb
);

create index clock_attempts_employee_server_idx on public.clock_attempts(employee_id, server_recorded_at desc);
create index clock_attempts_site_server_idx on public.clock_attempts(work_site_id, server_recorded_at desc);
create index clock_capture_tokens_expiry_idx on public.clock_capture_tokens(expires_at);

alter table public.authorized_devices enable row level security;
alter table public.clock_capture_tokens enable row level security;
alter table public.clock_attempts enable row level security;

create policy authorized_devices_read_manager on public.authorized_devices for select to authenticated
using (public.can_manage_company((select company_id from public.work_sites where id=work_site_id)));
create policy authorized_devices_manage_manager on public.authorized_devices for all to authenticated
using (public.can_manage_company((select company_id from public.work_sites where id=work_site_id)))
with check (public.can_manage_company((select company_id from public.work_sites where id=work_site_id)));

create policy clock_attempts_read_self on public.clock_attempts for select to authenticated
using (employee_id=(select employee_id from public.profiles where id=auth.uid()));
create policy clock_attempts_read_manager on public.clock_attempts for select to authenticated
using (public.can_manage_company(company_id));

-- Inserts are server-only through service_role after all evidence is validated.
-- Capture tokens are never exposed through PostgREST policies.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('clock-evidence','clock-evidence',false,1048576,array['image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=1048576,allowed_mime_types=array['image/jpeg'];

create or replace function public.clock_distance_meters(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) returns double precision
language sql immutable strict parallel safe
as $$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians(lat2-lat1)/2),2) +
    cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lon2-lon1)/2),2)
  ));
$$;

commit;
