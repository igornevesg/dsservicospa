begin;

-- Mantém o registro importado mais antigo/mais completo como canônico. Os
-- duplicados ficam inativos para preservar referências de folhas e auditoria.
with ranked as (
  select id,
    row_number() over (
      partition by lower(regexp_replace(trim(full_name),'\s+',' ','g'))
      order by (cpf_normalized is not null) desc,created_at,id
    ) as position
  from public.employees
  where status='active' and external_source='google_sheets'
), duplicates as (
  select id from ranked where position>1
)
update public.employees employee
set status='inactive',external_key=null,source_updated_at=now()
where employee.id in (select id from duplicates);

create or replace function public.sync_google_sheet_roster(p_companies jsonb,p_sites jsonb,p_employees jsonb)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare item jsonb; company_uuid uuid; site_uuid uuid; employee_uuid uuid; companies_count int:=0; sites_count int:=0; employees_count int:=0;
begin
  for item in select value from jsonb_array_elements(p_companies) loop
    company_uuid:=null;
    if nullif(item->>'taxId','') is not null then
      select id into company_uuid from public.companies where tax_id=item->>'taxId' limit 1;
    end if;
    if company_uuid is null then
      select id into company_uuid from public.companies where external_source='google_sheets' and external_key=item->>'externalKey' limit 1;
    end if;
    if company_uuid is not null then
      update public.companies set
        legal_name=coalesce(nullif(item->>'legalName',''),legal_name),display_name=coalesce(nullif(item->>'displayName',''),display_name),
        address=coalesce(nullif(item->>'address',''),address),is_active=true,external_source='google_sheets',
        external_key=item->>'externalKey',source_updated_at=now()
      where id=company_uuid;
    else
      insert into public.companies(legal_name,display_name,tax_id,address,is_active,external_source,external_key,source_updated_at)
      values(item->>'legalName',item->>'displayName',nullif(item->>'taxId',''),nullif(item->>'address',''),true,'google_sheets',item->>'externalKey',now())
      returning id into company_uuid;
    end if;
    companies_count:=companies_count+1;
  end loop;

  for item in select value from jsonb_array_elements(p_sites) loop
    company_uuid:=null;
    select id into company_uuid from public.companies where external_source='google_sheets' and external_key=item->>'companyKey' limit 1;
    if company_uuid is null then continue; end if;
    site_uuid:=null;
    select id into site_uuid from public.work_sites where external_source='google_sheets' and external_key=item->>'externalKey' limit 1;
    if site_uuid is null then
      select id into site_uuid from public.work_sites where company_id=company_uuid and lower(name)=lower(item->>'name') limit 1;
    end if;
    if site_uuid is not null then
      update public.work_sites set company_id=company_uuid,name=item->>'name',address=coalesce(nullif(item->>'address',''),address),
        is_active=true,external_source='google_sheets',external_key=item->>'externalKey',source_updated_at=now()
      where id=site_uuid;
    else
      insert into public.work_sites(company_id,name,address,is_active,external_source,external_key,source_updated_at)
      values(company_uuid,item->>'name',nullif(item->>'address',''),true,'google_sheets',item->>'externalKey',now())
      returning id into site_uuid;
    end if;
    sites_count:=sites_count+1;
  end loop;

  for item in select value from jsonb_array_elements(p_employees) loop
    company_uuid:=null; site_uuid:=null; employee_uuid:=null;
    select id into company_uuid from public.companies where external_source='google_sheets' and external_key=item->>'companyKey' limit 1;
    select id into site_uuid from public.work_sites where external_source='google_sheets' and external_key=item->>'siteKey' limit 1;
    if company_uuid is null or site_uuid is null then continue; end if;
    if nullif(item->>'cpf','') is not null then
      select id into employee_uuid from public.employees where cpf_normalized=item->>'cpf' order by (status='active') desc,created_at limit 1;
    end if;
    if employee_uuid is null then
      select id into employee_uuid from public.employees
      where external_source='google_sheets' and external_key=item->>'externalKey'
      order by (status='active') desc,created_at limit 1;
    end if;
    if employee_uuid is null then
      select id into employee_uuid from public.employees
      where external_source='google_sheets'
        and lower(regexp_replace(trim(full_name),'\s+',' ','g'))=lower(regexp_replace(trim(item->>'fullName'),'\s+',' ','g'))
      order by (status='active') desc,(cpf_normalized is not null) desc,created_at limit 1;
    end if;
    if employee_uuid is not null then
      update public.employees set company_id=company_uuid,default_work_site_id=site_uuid,full_name=item->>'fullName',status='active',
        cpf_normalized=coalesce(nullif(item->>'cpf',''),cpf_normalized),cpf_last4=coalesce(right(nullif(item->>'cpf',''),4),cpf_last4),
        job_title=coalesce(nullif(item->>'jobTitle',''),job_title),shift_pattern=coalesce(nullif(item->>'shift',''),shift_pattern),
        external_source='google_sheets',external_key=item->>'externalKey',source_updated_at=now()
      where id=employee_uuid;
    else
      insert into public.employees(company_id,default_work_site_id,full_name,cpf_normalized,cpf_last4,status,job_title,shift_pattern,external_source,external_key,source_updated_at)
      values(company_uuid,site_uuid,item->>'fullName',nullif(item->>'cpf',''),right(nullif(item->>'cpf',''),4),'active',nullif(item->>'jobTitle',''),nullif(item->>'shift',''),'google_sheets',item->>'externalKey',now());
    end if;
    employees_count:=employees_count+1;
  end loop;

  insert into public.audit_logs(action,entity_table,metadata)
  values('google_sheets.synchronized','external_sources',jsonb_build_object('companies',companies_count,'sites',sites_count,'employees',employees_count));
  return jsonb_build_object('companies',companies_count,'sites',sites_count,'employees',employees_count);
end; $$;

revoke all on function public.sync_google_sheet_roster(jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.sync_google_sheet_roster(jsonb,jsonb,jsonb) to service_role;

insert into public.audit_logs(action,entity_table,metadata)
values('google_sheets.employee_duplicates_deactivated','employees',jsonb_build_object('strategy','normalized_name'));

commit;
