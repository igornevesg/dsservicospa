begin;

-- Commit 02: cadastros administrativos e endurecimento de autorização.
-- Nenhuma chave de serviço é armazenada no banco ou exposta ao cliente.

alter table public.profiles
  add column if not exists company_id uuid references public.companies(id) on delete restrict;

alter table public.employees
  add column if not exists corporate_email text,
  add column if not exists cpf_normalized varchar(11),
  add column if not exists job_title text,
  add column if not exists shift_pattern text;

create unique index if not exists employees_corporate_email_unique
  on public.employees (lower(corporate_email))
  where corporate_email is not null;

create unique index if not exists employees_cpf_unique
  on public.employees (cpf_normalized)
  where cpf_normalized is not null;

alter table public.employees
  drop constraint if exists employees_cpf_normalized_check;
alter table public.employees
  add constraint employees_cpf_normalized_check
  check (cpf_normalized is null or cpf_normalized ~ '^[0-9]{11}$');

alter table public.profiles
  drop constraint if exists profiles_role_company_check;
alter table public.profiles
  add constraint profiles_role_company_check
  check (
    (role = 'admin' and company_id is null)
    or (role = 'supervisor' and company_id is not null)
    or role = 'employee'
  );

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select company_id
  from public.profiles
  where id = auth.uid() and is_active = true
$$;

create or replace function public.can_manage_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    public.is_admin()
    or (
      public.current_role() = 'supervisor'
      and public.current_company_id() = target_company_id
    ),
    false
  )
$$;

-- Impede alteração de papel, empresa, vínculo e status do próprio perfil pelo cliente.
create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    if new.role is distinct from old.role
      or new.company_id is distinct from old.company_id
      or new.employee_id is distinct from old.employee_id
      or new.is_active is distinct from old.is_active then
      raise exception 'profile security fields cannot be changed by the current user';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_security_fields on public.profiles;
create trigger profiles_protect_security_fields
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

-- Reescreve políticas amplas do Commit 01 para isolamento por empresa.
drop policy if exists profiles_read_self_or_manager on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists companies_read_authenticated on public.companies;
drop policy if exists companies_manage_admin on public.companies;
drop policy if exists sites_read_authenticated on public.work_sites;
drop policy if exists sites_manage_manager on public.work_sites;
drop policy if exists employees_read_self_or_manager on public.employees;
drop policy if exists employees_manage_manager on public.employees;
drop policy if exists assignments_read_self_or_manager on public.employee_assignments;
drop policy if exists assignments_manage_manager on public.employee_assignments;

create policy profiles_read_scoped
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or (public.current_role() = 'supervisor' and company_id = public.current_company_id())
);

create policy profiles_update_admin_only
on public.profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy companies_read_scoped
on public.companies for select to authenticated
using (
  public.is_admin()
  or id = public.current_company_id()
);

create policy companies_manage_admin_only
on public.companies for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy sites_read_scoped
on public.work_sites for select to authenticated
using (
  public.is_admin()
  or company_id = public.current_company_id()
);

create policy sites_manage_scoped
on public.work_sites for all to authenticated
using (public.can_manage_company(company_id))
with check (public.can_manage_company(company_id));

create policy employees_read_scoped
on public.employees for select to authenticated
using (
  id = (select employee_id from public.profiles where profiles.id = auth.uid())
  or public.can_manage_company(company_id)
);

create policy employees_manage_scoped
on public.employees for all to authenticated
using (public.can_manage_company(company_id))
with check (public.can_manage_company(company_id));

create policy assignments_read_scoped
on public.employee_assignments for select to authenticated
using (
  employee_id = (select employee_id from public.profiles where profiles.id = auth.uid())
  or exists (
    select 1 from public.employees e
    where e.id = employee_assignments.employee_id
      and public.can_manage_company(e.company_id)
  )
);

create policy assignments_manage_scoped
on public.employee_assignments for all to authenticated
using (
  exists (
    select 1 from public.employees e
    where e.id = employee_assignments.employee_id
      and public.can_manage_company(e.company_id)
  )
)
with check (
  exists (
    select 1 from public.employees e
    where e.id = employee_assignments.employee_id
      and public.can_manage_company(e.company_id)
  )
);

-- Auditoria somente por função server-side/service role; clientes autenticados não inserem diretamente.
revoke insert, update, delete on public.audit_logs from authenticated;

create index if not exists work_sites_company_id_idx on public.work_sites(company_id);
create index if not exists employees_company_id_idx on public.employees(company_id);
create index if not exists profiles_company_id_idx on public.profiles(company_id);
create index if not exists employee_assignments_employee_id_idx on public.employee_assignments(employee_id);

commit;
