-- Schema for grow sync. Same Supabase project and login as Tage, own table. Run once in the SQL editor.
-- Ids are text and unique per user, so items that exist once per thing can use a fixed id
-- ("chk:<habit>:<day>", "week:2026-11-02", "vision") and two devices never create duplicates.

create table public.grow_items (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  kind text not null,                  -- area | skill | habit | check | quest | moment | entry | bucket | learn | reward | vision
  data jsonb not null,
  updated_at bigint not null,          -- the item's own updatedAt (ms), decides which edit wins
  synced_at timestamptz not null default now(),  -- set by the server on every write, used as pull cursor
  primary key (user_id, id)
);

create index grow_items_user_synced on public.grow_items (user_id, synced_at);

-- Everyone sees and changes only their own items.
alter table public.grow_items enable row level security;
create policy "own grow items" on public.grow_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A late upload of an older version never overwrites a newer one.
create function public.grow_items_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.synced_at := now();
  return new;
end $$;

create trigger grow_items_before_write before insert or update on public.grow_items
  for each row execute function public.grow_items_before_write();

-- Push changes to other open devices right away.
alter publication supabase_realtime add table public.grow_items;

-- ============================================================================================
-- Phase 2: photo proofs and the Sunday reminder. Run once in the SQL editor, after the part above.
-- ============================================================================================

-- Photo proofs: a private bucket, each account only reaches its own folder "<user id>/…".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('grow-proofs', 'grow-proofs', false, 5242880, array['image/jpeg']);

create policy "own grow proofs read" on storage.objects for select to authenticated
  using (bucket_id = 'grow-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own grow proofs add" on storage.objects for insert to authenticated
  with check (bucket_id = 'grow-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own grow proofs change" on storage.objects for update to authenticated
  using (bucket_id = 'grow-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own grow proofs delete" on storage.objects for delete to authenticated
  using (bucket_id = 'grow-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Push subscriptions, one row per device. last_week is the week of the last reminder, so each week gets one at most.
create table public.grow_push_subs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  tz text not null default 'Europe/Berlin',
  last_week text,
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

alter table public.grow_push_subs enable row level security;
create policy "own push subs" on public.grow_push_subs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- The VAPID keys, made by the edge function on its first call. No policies: only the function
-- (service role) can read them.
create table public.grow_push_keys (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null
);
alter table public.grow_push_keys enable row level security;

-- Every hour on Sundays and Mondays (UTC, which covers Sunday evening in every time zone) the cron job
-- calls the edge function; the function decides who is due. Calls without a token are fine, see its header.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('grow-week-reminder', '0 * * * 0,1', $$
  select net.http_post(
    url := 'https://ejmpbeesbctabrwdysfj.supabase.co/functions/v1/grow-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
