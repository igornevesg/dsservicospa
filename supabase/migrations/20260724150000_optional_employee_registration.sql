begin;

alter table public.employees
  alter column registration_number drop not null;

comment on column public.employees.registration_number is
  'Matrícula interna opcional. Quando informada, permanece única.';

commit;
