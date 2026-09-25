-- Pundit Bible Studio: database set-up. Safe to run more than once.

-- One table holds everything: posts, fixtures, breaking news, settings.
create table if not exists public.docs (
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
alter table public.docs replica identity full;

-- Only signed-in users (you) can read or write. Sign-ups are switched off in set-up,
-- so nobody else can create an account.
alter table public.docs enable row level security;
drop policy if exists "signed in can do everything" on public.docs;
create policy "signed in can do everything" on public.docs
  for all to authenticated using (true) with check (true);

-- Merge fields into a document (creates it if missing).
create or replace function public.doc_merge(p_collection text, p_id text, p_patch jsonb)
returns void language sql security invoker as $$
  insert into public.docs (collection, id, data, updated_at)
  values (p_collection, p_id, p_patch, now())
  on conflict (collection, id)
  do update set data = public.docs.data || excluded.data, updated_at = now();
$$;
grant execute on function public.doc_merge(text, text, jsonb) to authenticated;

-- Live updates in the app
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- Photo storage (private)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "signed in read photos" on storage.objects;
create policy "signed in read photos" on storage.objects
  for select to authenticated using (bucket_id = 'photos');
drop policy if exists "signed in add photos" on storage.objects;
create policy "signed in add photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');
drop policy if exists "signed in change photos" on storage.objects;
create policy "signed in change photos" on storage.objects
  for update to authenticated using (bucket_id = 'photos');
drop policy if exists "signed in delete photos" on storage.objects;
create policy "signed in delete photos" on storage.objects
  for delete to authenticated using (bucket_id = 'photos');

-- Spend tracking for the monthly budgets (Claude = 'usage', Higgsfield = 'hfusage'). Only the server side can add to it.
drop function if exists public.add_usage(numeric);
create or replace function public.add_usage(p_usd numeric, p_doc text default 'usage')
returns jsonb language plpgsql security definer set search_path = public as $$
declare m text := to_char(now() at time zone 'Europe/London', 'YYYY-MM'); d jsonb;
begin
  insert into public.docs (collection, id, data) values ('meta', p_doc, jsonb_build_object('month', m, 'usd', 0, 'count', 0))
  on conflict (collection, id) do nothing;
  select data into d from public.docs where collection = 'meta' and id = p_doc for update;
  if d->>'month' is distinct from m then d := jsonb_build_object('month', m, 'usd', 0, 'count', 0); end if;
  d := jsonb_set(d, '{usd}', to_jsonb(round(coalesce((d->>'usd')::numeric, 0) + p_usd, 5)));
  d := jsonb_set(d, '{count}', to_jsonb(coalesce((d->>'count')::int, 0) + 1));
  update public.docs set data = d, updated_at = now() where collection = 'meta' and id = p_doc;
  return d;
end $$;
revoke all on function public.add_usage(numeric, text) from public, anon, authenticated;
grant execute on function public.add_usage(numeric, text) to service_role;

-- Scheduled every minute by set-up: live scores, goal alerts, posting reminders, automatic match posts.
create extension if not exists pg_cron;
create extension if not exists pg_net;
