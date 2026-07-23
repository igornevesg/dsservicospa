begin;

create table public.security_rate_limits (
  bucket_hash text primary key check (char_length(bucket_hash)=64),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.security_rate_limits enable row level security;
revoke all on public.security_rate_limits from anon, authenticated;

create or replace function public.consume_security_rate_limit(
  p_bucket_hash text,
  p_limit integer,
  p_window_seconds integer,
  p_block_seconds integer
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  current_row public.security_rate_limits%rowtype;
begin
  if p_bucket_hash !~ '^[a-f0-9]{64}$'
    or p_limit < 1 or p_limit > 1000
    or p_window_seconds < 1 or p_window_seconds > 86400
    or p_block_seconds < 1 or p_block_seconds > 86400 then
    raise exception 'invalid rate limit parameters';
  end if;

  insert into public.security_rate_limits(bucket_hash,attempt_count)
  values(p_bucket_hash,0)
  on conflict(bucket_hash) do nothing;

  select * into current_row
  from public.security_rate_limits
  where bucket_hash=p_bucket_hash
  for update;

  if current_row.blocked_until is not null and current_row.blocked_until > now() then
    return false;
  end if;

  if current_row.window_started_at <= now() - make_interval(secs=>p_window_seconds) then
    update public.security_rate_limits
    set window_started_at=now(),attempt_count=1,blocked_until=null,updated_at=now()
    where bucket_hash=p_bucket_hash;
    return true;
  end if;

  if current_row.attempt_count + 1 > p_limit then
    update public.security_rate_limits
    set attempt_count=attempt_count+1,blocked_until=now()+make_interval(secs=>p_block_seconds),updated_at=now()
    where bucket_hash=p_bucket_hash;
    return false;
  end if;

  update public.security_rate_limits
  set attempt_count=attempt_count+1,updated_at=now()
  where bucket_hash=p_bucket_hash;
  return true;
end;
$$;

revoke all on function public.consume_security_rate_limit(text,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text,integer,integer,integer) to service_role;

create index if not exists clock_capture_tokens_user_created_idx
  on public.clock_capture_tokens(user_id,created_at desc);

-- Short-lived challenges can be safely removed after their audit value expires.
create or replace function public.cleanup_expired_clock_tokens()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare deleted_count integer;
begin
  delete from public.clock_capture_tokens
  where expires_at < now() - interval '24 hours';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_expired_clock_tokens() from public, anon, authenticated;
grant execute on function public.cleanup_expired_clock_tokens() to service_role;

commit;
