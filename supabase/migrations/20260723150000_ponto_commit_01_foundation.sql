begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin','supervisor','employee');
create type public.employment_status as enum ('active','inactive','leave','terminated');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default encode(extensions.gen_random_bytes(12),'hex'),
  legal_name text not null,
  display_name text not null,
  tax_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_sites (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default encode(extensions.gen_random_bytes(12),'hex'),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  allowed_radius_meters integer not null default 150 check (allowed_radius_meters between 20 and 2000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,name)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default encode(extensions.gen_random_bytes(12),'hex'),
  company_id uuid not null references public.companies(id) on delete restrict,
  default_work_site_id uuid references public.work_sites(id) on delete set null,
  full_name text not null,
  registration_number text not null unique,
  cpf_last4 char(4),
  phone text,
  status public.employment_status not null default 'active',
  hired_at date,
  terminated_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'employee',
  employee_id uuid unique references public.employees(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employee_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_site_id uuid not null references public.work_sites(id) on delete restrict,
  starts_at date not null default current_date,
  ends_at date,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path=public as $$ begin new.updated_at=now(); return new; end; $$;
create trigger companies_updated before update on public.companies for each row execute function public.set_updated_at();
create trigger work_sites_updated before update on public.work_sites for each row execute function public.set_updated_at();
create trigger employees_updated before update on public.employees for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1)))
  on conflict(id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.current_role() returns public.app_role language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() and is_active=true $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_role()='admin',false) $$;
create or replace function public.is_manager() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_role() in ('admin','supervisor'),false) $$;

alter table public.companies enable row level security;
alter table public.work_sites enable row level security;
alter table public.employees enable row level security;
alter table public.profiles enable row level security;
alter table public.employee_assignments enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read_self_or_manager on public.profiles for select to authenticated using (id=auth.uid() or public.is_manager());
create policy profiles_update_admin on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy companies_read_authenticated on public.companies for select to authenticated using (is_active or public.is_manager());
create policy companies_manage_admin on public.companies for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sites_read_authenticated on public.work_sites for select to authenticated using (is_active or public.is_manager());
create policy sites_manage_manager on public.work_sites for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy employees_read_self_or_manager on public.employees for select to authenticated using (id=(select employee_id from public.profiles where profiles.id=auth.uid()) or public.is_manager());
create policy employees_manage_manager on public.employees for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy assignments_read_self_or_manager on public.employee_assignments for select to authenticated using (employee_id=(select employee_id from public.profiles where profiles.id=auth.uid()) or public.is_manager());
create policy assignments_manage_manager on public.employee_assignments for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy audit_read_admin on public.audit_logs for select to authenticated using (public.is_admin());

insert into public.companies(legal_name,display_name) values
('Nova Geração Montes Claros','Nova Geração Montes Claros'),
('Nova Geração Janaúba','Nova Geração Janaúba'),
('Nova Geração Capelinha','Nova Geração Capelinha')
on conflict do nothing;

commit;
