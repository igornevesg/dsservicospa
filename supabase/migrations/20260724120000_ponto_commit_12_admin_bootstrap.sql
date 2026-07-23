begin;

-- Recuperação segura: somente quando não existe administrador ativo,
-- promove o usuário Auth mais antigo deste projeto.
do $$
declare
  owner_id uuid;
begin
  if not exists(
    select 1 from public.profiles
    where role='admin' and is_active=true
  ) then
    select id into owner_id
    from auth.users
    order by created_at asc
    limit 1;

    if owner_id is not null then
      update public.profiles
      set role='admin',company_id=null,employee_id=null,is_active=true,updated_at=now()
      where id=owner_id;
    end if;
  end if;
end $$;

commit;
