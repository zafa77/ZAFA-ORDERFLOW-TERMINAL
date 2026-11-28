-- Run against an isolated development database after migration, as an administrator.
-- Test data is rolled back. Never run against production.
begin;
insert into auth.users(id,aud,role,email,created_at,updated_at) values
('11111111-1111-4111-8111-111111111111','authenticated','authenticated','zafa-test-a@example.invalid',now(),now()),
('22222222-2222-4222-8222-222222222222','authenticated','authenticated','zafa-test-b@example.invalid',now(),now());
insert into auth.sessions(id,user_id,created_at,updated_at) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',now(),now()),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222',now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","is_anonymous":false}',true);
insert into public.zafa_user_state(user_id,scope,payload) values ('11111111-1111-4111-8111-111111111111','academy','{"done":1}');
do $$ begin
  if (select count(*) from public.zafa_user_state) <> 1 then raise exception 'Own read failed'; end if;
  if not public.zafa_session_ok(300) then raise exception 'Fresh session check failed'; end if;
  begin
    insert into public.zafa_user_state(user_id,scope,payload) values ('22222222-2222-4222-8222-222222222222','academy','{}');
    raise exception 'Cross-user insert unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.zafa_user_state set user_id='22222222-2222-4222-8222-222222222222';
    raise exception 'Cross-user reassignment unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.zafa_user_state(user_id,scope,payload) values ('11111111-1111-4111-8111-111111111111','preferences',jsonb_build_object('large',repeat('x',262145)));
    raise exception 'Oversize payload unexpectedly succeeded';
  exception when check_violation then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","is_anonymous":false}',true);
do $$ declare n integer; begin
  if exists(select 1 from public.zafa_user_state) then raise exception 'Cross-user read'; end if;
  update public.zafa_user_state set payload='{}'; get diagnostics n = row_count; if n<>0 then raise exception 'Cross-user update'; end if;
  delete from public.zafa_user_state; get diagnostics n = row_count; if n<>0 then raise exception 'Cross-user delete'; end if;
end $$;
insert into public.zafa_user_state(user_id,scope,payload) values ('22222222-2222-4222-8222-222222222222','academy','{"done":2}');
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
  begin perform count(*) from public.zafa_user_state; raise exception 'Anon read unexpectedly succeeded'; exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from auth.sessions where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","is_anonymous":false}',true);
do $$ begin if public.zafa_session_ok(0) or exists(select 1 from public.zafa_user_state) then raise exception 'Revoked session still has access'; end if; end $$;
reset role;
delete from auth.users where id='11111111-1111-4111-8111-111111111111';
do $$ begin if exists(select 1 from public.zafa_user_state where user_id='11111111-1111-4111-8111-111111111111') then raise exception 'Cascade failed'; end if; end $$;
rollback;
