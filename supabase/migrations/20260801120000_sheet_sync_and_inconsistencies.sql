begin;

alter table public.companies add column if not exists address text;
alter table public.companies add column if not exists external_source text;
alter table public.companies add column if not exists external_key text;
alter table public.companies add column if not exists source_updated_at timestamptz;
alter table public.work_sites add column if not exists external_source text;
alter table public.work_sites add column if not exists external_key text;
alter table public.work_sites add column if not exists source_updated_at timestamptz;
alter table public.employees add column if not exists external_source text;
alter table public.employees add column if not exists external_key text;
alter table public.employees add column if not exists source_updated_at timestamptz;

create unique index if not exists companies_external_unique on public.companies(external_source,external_key) where external_key is not null;
create unique index if not exists sites_external_unique on public.work_sites(external_source,external_key) where external_key is not null;
create unique index if not exists employees_external_unique on public.employees(external_source,external_key) where external_key is not null;

create or replace function public.sync_google_sheet_roster(p_companies jsonb,p_employees jsonb)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare item jsonb; company_uuid uuid; site_uuid uuid; employee_uuid uuid; companies_count int:=0; sites_count int:=0; employees_count int:=0;
begin
  for item in select value from jsonb_array_elements(p_companies) loop
    company_uuid:=null;
    if nullif(item->>'taxId','') is not null then select id into company_uuid from public.companies where tax_id=item->>'taxId' limit 1; end if;
    if company_uuid is not null then
      update public.companies set legal_name=item->>'legalName',display_name=item->>'displayName',address=coalesce(nullif(item->>'address',''),address),is_active=true,external_source='google_sheets',external_key=item->>'externalKey',source_updated_at=now() where id=company_uuid;
    else
      insert into public.companies(legal_name,display_name,tax_id,address,is_active,external_source,external_key,source_updated_at)
      values(item->>'legalName',item->>'displayName',nullif(item->>'taxId',''),nullif(item->>'address',''),true,'google_sheets',item->>'externalKey',now())
      on conflict(external_source,external_key) where external_key is not null do update set
        legal_name=excluded.legal_name,display_name=excluded.display_name,tax_id=coalesce(excluded.tax_id,companies.tax_id),address=coalesce(excluded.address,companies.address),is_active=true,source_updated_at=now();
    end if;
    companies_count:=companies_count+1;
  end loop;
  for item in select value from jsonb_array_elements(p_employees) loop
    select id into company_uuid from public.companies where external_source='google_sheets' and external_key=item->>'companyKey' limit 1;
    if company_uuid is null then continue; end if;
    site_uuid:=null; select id into site_uuid from public.work_sites where company_id=company_uuid and lower(name)=lower(item->>'siteName') limit 1;
    if site_uuid is not null then
      update public.work_sites set is_active=true,external_source='google_sheets',external_key=item->>'companyKey',source_updated_at=now() where id=site_uuid;
    else
      insert into public.work_sites(company_id,name,address,is_active,external_source,external_key,source_updated_at)
      values(company_uuid,item->>'siteName',null,true,'google_sheets',item->>'companyKey',now())
      on conflict(external_source,external_key) where external_key is not null do update set company_id=excluded.company_id,name=excluded.name,is_active=true,source_updated_at=now()
      returning id into site_uuid;
    end if;
    sites_count:=sites_count+1;
    employee_uuid:=null;
    if nullif(item->>'cpf','') is not null then select id into employee_uuid from public.employees where cpf_normalized=item->>'cpf' limit 1; end if;
    if employee_uuid is not null then
      update public.employees set company_id=company_uuid,default_work_site_id=site_uuid,full_name=item->>'fullName',status='active',job_title=coalesce(nullif(item->>'jobTitle',''),job_title),shift_pattern=coalesce(nullif(item->>'shift',''),shift_pattern),external_source='google_sheets',external_key=item->>'externalKey',source_updated_at=now() where id=employee_uuid;
    else
      insert into public.employees(company_id,default_work_site_id,full_name,cpf_normalized,cpf_last4,status,job_title,shift_pattern,external_source,external_key,source_updated_at)
      values(company_uuid,site_uuid,item->>'fullName',nullif(item->>'cpf',''),right(nullif(item->>'cpf',''),4),'active',nullif(item->>'jobTitle',''),nullif(item->>'shift',''),'google_sheets',item->>'externalKey',now())
      on conflict(external_source,external_key) where external_key is not null do update set
        company_id=excluded.company_id,default_work_site_id=excluded.default_work_site_id,full_name=excluded.full_name,
        cpf_normalized=coalesce(excluded.cpf_normalized,employees.cpf_normalized),cpf_last4=coalesce(excluded.cpf_last4,employees.cpf_last4),status='active',
        job_title=coalesce(excluded.job_title,employees.job_title),shift_pattern=coalesce(excluded.shift_pattern,employees.shift_pattern),source_updated_at=now();
    end if;
    employees_count:=employees_count+1;
  end loop;
  insert into public.audit_logs(action,entity_table,metadata) values('google_sheets.synchronized','external_sources',jsonb_build_object('companies',companies_count,'sites',sites_count,'employees',employees_count));
  return jsonb_build_object('companies',companies_count,'sites',sites_count,'employees',employees_count);
end; $$;

revoke all on function public.sync_google_sheet_roster(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.sync_google_sheet_roster(jsonb,jsonb) to service_role;

commit;
