begin;

-- A coluna POSTO da planilha identifica o cliente. Os postos operacionais são
-- categorias padronizadas e devem existir em todas as empresas ativas.
insert into public.work_sites(company_id,name,address,is_active)
select c.id,site.name,c.address,true
from public.companies c
cross join (values
  ('Guarda Noturno'),
  ('Guarda Diurno'),
  ('Serviços Gerais'),
  ('Controle de Acesso')
) as site(name)
where c.is_active=true
  and not exists(
    select 1 from public.work_sites current
    where current.company_id=c.id and lower(current.name)=lower(site.name)
  );

-- Corrige o nome divergente da planilha de funcionários antes de desativar a
-- empresa duplicada. A sincronização seguinte fará o vínculo ao posto padrão.
do $$
declare source_company uuid; target_company uuid;
begin
  select id into source_company from public.companies where lower(display_name)='leenia' and is_active=true order by created_at desc limit 1;
  select id into target_company from public.companies where lower(display_name)='elenia' and is_active=true order by created_at limit 1;
  if source_company is not null and target_company is not null and source_company<>target_company then
    update public.employees set company_id=target_company,default_work_site_id=null where company_id=source_company;
    update public.work_sites set is_active=false where company_id=source_company;
    update public.companies set is_active=false where id=source_company;
  end if;
end $$;

-- Remove da operação a linha de instrução que foi interpretada como empresa.
update public.employees set status='inactive'
where company_id in (
  select id from public.companies where lower(display_name) like 'deve ser gerado 02 notas%'
);
update public.work_sites set is_active=false
where company_id in (
  select id from public.companies where lower(display_name) like 'deve ser gerado 02 notas%'
);
update public.companies set is_active=false
where lower(display_name) like 'deve ser gerado 02 notas%';

-- Postos antigos criados automaticamente com o nome do cliente deixam de ser
-- exibidos; cadastros manuais e os quatro postos padronizados são preservados.
update public.work_sites set is_active=false
where external_source='google_sheets'
  and name not in ('Guarda Noturno','Guarda Diurno','Serviços Gerais','Controle de Acesso');

insert into public.audit_logs(action,entity_table,metadata)
values('google_sheets.standard_sites_created','work_sites',jsonb_build_object(
  'sites',jsonb_build_array('Guarda Noturno','Guarda Diurno','Serviços Gerais','Controle de Acesso'),
  'removed_companies',jsonb_build_array('Leenia','Deve ser gerado 02 notas...')
));

commit;
