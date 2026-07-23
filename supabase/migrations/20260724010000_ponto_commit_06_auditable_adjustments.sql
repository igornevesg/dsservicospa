begin;

create type public.clock_adjustment_status as enum ('pending','approved','rejected');

create table public.clock_adjustments (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default encode(extensions.gen_random_bytes(12),'hex'),
  employee_id uuid not null references public.employees(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  work_site_id uuid not null references public.work_sites(id) on delete restrict,
  work_date date not null,
  event_type public.clock_event_type not null,
  adjusted_at timestamptz not null,
  reason text not null check (char_length(reason) between 10 and 1000),
  status public.clock_adjustment_status not null default 'pending',
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  decision_reason text check (decision_reason is null or char_length(decision_reason) between 5 and 1000),
  check (
    (status='pending' and decided_by is null and decided_at is null)
    or (status in ('approved','rejected') and decided_by is not null and decided_at is not null)
  )
);

create index clock_adjustments_employee_date_idx on public.clock_adjustments(employee_id,work_date);
create index clock_adjustments_company_status_idx on public.clock_adjustments(company_id,status,requested_at desc);

alter table public.clock_adjustments enable row level security;

create policy clock_adjustments_read_manager
on public.clock_adjustments for select to authenticated
using (public.can_manage_company(company_id));

-- Creation and decisions are server-only after authorization checks.
revoke insert, update, delete on public.clock_adjustments from authenticated;

commit;
