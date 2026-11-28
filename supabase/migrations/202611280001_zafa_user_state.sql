-- Apply only to a new Supabase development project, then test before production.
begin;
-- Security-definer helper checks the server-side session belonging to the JWT.
-- An already-deleted user's stale JWT cannot read/write data.
create or replace function public.zafa_session_ok(max_age_seconds integer default 0)
returns boolean language sql stable security definer set search_path = ''
as $$
  select max_age_seconds in (0, 300)
    and (select auth.uid()) is not null
    and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true'
    and ((select auth.jwt()) ->> 'client_id') is null
    and exists (
      select 1 from auth.sessions s
      where s.user_id = (select auth.uid())
        and s.id = case
          when ((select auth.jwt()) ->> 'session_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then ((select auth.jwt()) ->> 'session_id')::uuid
          else null end
        and (s.not_after is null or s.not_after > now())
        and (max_age_seconds = 0 or s.created_at >= now() - make_interval(secs => max_age_seconds))
    );
$$;
revoke all on function public.zafa_session_ok(integer) from public, anon, authenticated;
grant execute on function public.zafa_session_ok(integer) to authenticated;
create table public.zafa_user_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('workspace','drawings','alerts','academy','paper_journal','preferences')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 262144),
  updated_at timestamptz not null default now(),
  primary key(user_id, scope)
);
alter table public.zafa_user_state enable row level security;
alter table public.zafa_user_state force row level security;
revoke all on table public.zafa_user_state from public, anon, authenticated;
grant select, delete on table public.zafa_user_state to authenticated;
grant insert (user_id,scope,payload) on table public.zafa_user_state to authenticated;
grant update (user_id,scope,payload) on table public.zafa_user_state to authenticated;
create or replace function public.zafa_state_timestamp()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;
revoke all on function public.zafa_state_timestamp() from public, anon, authenticated;
create trigger zafa_state_timestamp before insert or update on public.zafa_user_state
for each row execute function public.zafa_state_timestamp();
create policy "own read" on public.zafa_user_state for select to authenticated
using ((select auth.uid()) = user_id and (select public.zafa_session_ok(0)));
create policy "own insert" on public.zafa_user_state for insert to authenticated
with check ((select auth.uid()) = user_id and (select public.zafa_session_ok(0)));
create policy "own update" on public.zafa_user_state for update to authenticated
using ((select auth.uid()) = user_id and (select public.zafa_session_ok(0)))
with check ((select auth.uid()) = user_id and (select public.zafa_session_ok(0)));
create policy "own delete" on public.zafa_user_state for delete to authenticated
using ((select auth.uid()) = user_id and (select public.zafa_session_ok(0)));
comment on table public.zafa_user_state is 'Per-account private application state; no passwords, exchange keys, market histories or payment data. Maximum six bounded scopes; account removal cascades.';
commit;
