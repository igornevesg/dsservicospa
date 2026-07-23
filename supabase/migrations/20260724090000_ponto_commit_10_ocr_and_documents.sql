begin;

create type public.manual_extraction_status as enum ('processing','review','confirmed','failed');

create table public.manual_sheet_extractions(
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default encode(extensions.gen_random_bytes(12),'hex'),
  batch_id uuid not null references public.manual_sheet_batches(id) on delete restrict,
  status public.manual_extraction_status not null default 'processing',
  model text not null,
  structured_result jsonb,
  error_message text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  confirmed_by uuid references auth.users(id) on delete restrict,
  confirmed_at timestamptz
);

alter table public.manual_sheet_extractions enable row level security;
create policy manual_extractions_read on public.manual_sheet_extractions for select to authenticated
using(exists(
  select 1 from public.manual_sheet_batches b
  where b.id=batch_id and public.can_access_company(b.company_id)
));
revoke insert,update,delete on public.manual_sheet_extractions from authenticated;
create index manual_extractions_batch_idx on public.manual_sheet_extractions(batch_id,created_at desc);

commit;
