begin;

alter table public.manual_sheet_batches
  alter column document_path drop not null,
  alter column original_filename drop not null,
  alter column document_mime drop not null,
  alter column document_sha256 drop not null;

alter table public.manual_sheet_batches
  drop constraint if exists manual_sheet_batches_document_mime_check;
alter table public.manual_sheet_batches
  add constraint manual_sheet_batches_document_mime_check
  check(document_mime is null or document_mime in ('application/pdf','image/jpeg','image/png'));

create unique index if not exists manual_batches_context_unique
  on public.manual_sheet_batches(company_id,work_site_id,competence);

commit;
