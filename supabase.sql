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
