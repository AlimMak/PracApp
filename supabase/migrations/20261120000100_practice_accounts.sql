
create table public.practice_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and coalesce(jsonb_typeof(payload -> 'records') = 'object', false)
    and coalesce(jsonb_typeof(payload -> 'imports') = 'array', false)
    and octet_length(payload::text) <= 4194304
  )
);

alter table public.practice_accounts enable row level security;
revoke all on public.practice_accounts from public, anon, authenticated;
grant select, insert, update on public.practice_accounts to authenticated;

create policy "read own practice" on public.practice_accounts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own practice" on public.practice_accounts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own practice" on public.practice_accounts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Compare and swap keeps a stale device from silently overwriting a newer one.
create function public.save_practice_account(expected_owner uuid, expected_revision integer, next_payload jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  written_revision integer;
begin
  if owner_id is null or owner_id is distinct from expected_owner then
    raise insufficient_privilege;
  end if;

  if expected_revision = 0 then
    insert into public.practice_accounts (user_id, payload)
    values (owner_id, next_payload)
    on conflict (user_id) do nothing
    returning revision into written_revision;
  else
    update public.practice_accounts
    set payload = next_payload, revision = revision + 1
    where user_id = owner_id and revision = expected_revision
    returning revision into written_revision;
  end if;
  return written_revision;
end;
$$;

revoke all on function public.save_practice_account(uuid, integer, jsonb) from public, anon;
grant execute on function public.save_practice_account(uuid, integer, jsonb) to authenticated;
