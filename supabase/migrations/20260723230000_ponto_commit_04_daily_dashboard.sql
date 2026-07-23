begin;

-- Supports the manager's daily view while RLS continues to restrict company scope.
create index if not exists clock_attempts_company_server_idx
  on public.clock_attempts(company_id, server_recorded_at desc);

create index if not exists clock_attempts_status_server_idx
  on public.clock_attempts(status, server_recorded_at desc);

commit;
