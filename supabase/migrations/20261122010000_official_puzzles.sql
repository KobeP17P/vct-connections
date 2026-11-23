-- Official daily COMMS: live puzzles plus an unpublished backlog.
-- Editors are the first signed-in user to claim a seat, then that allowlist.

create table public.official_editors (
  user_id text primary key,
  created_at timestamptz not null default now()
);

create table public.official_puzzles (
  id bigint generated always as identity primary key,
  puzzle_id integer not null unique check (puzzle_id > 0),
  date date,
  author text not null default 'COMMS'
    check (char_length(btrim(author)) between 1 and 24),
  notes text not null default ''
    check (char_length(notes) <= 240),
  groups jsonb not null,
  created_by text not null default (auth.jwt() ->> 'sub'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index official_puzzles_date_key
  on public.official_puzzles (date)
  where date is not null;

create index official_puzzles_date_idx
  on public.official_puzzles (date);

alter table public.official_editors enable row level security;
alter table public.official_puzzles enable row level security;

grant select on table public.official_puzzles to anon, authenticated;
grant insert, update, delete on table public.official_puzzles to authenticated;
grant select, insert on table public.official_editors to authenticated;
grant usage, select on sequence public.official_puzzles_id_seq to authenticated;

create or replace function public.is_official_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.official_editors e
    where e.user_id = (select auth.jwt() ->> 'sub')
  );
$$;

create or replace function public.claim_editor_seat()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  sub text := (select auth.jwt() ->> 'sub');
begin
  if sub is null then
    return false;
  end if;
  if exists (select 1 from public.official_editors) then
    return exists (
      select 1 from public.official_editors where user_id = sub
    );
  end if;
  insert into public.official_editors (user_id) values (sub);
  return true;
end;
$$;

revoke all on function public.is_official_editor() from public, anon;
revoke all on function public.claim_editor_seat() from public, anon;
grant execute on function public.is_official_editor() to authenticated;
grant execute on function public.claim_editor_seat() to authenticated;

create policy "official_puzzles_select_live"
  on public.official_puzzles
  for select
  to anon, authenticated
  using (
    date is not null
    and date <= (current_date + 1)
  );

create policy "official_puzzles_select_editors"
  on public.official_puzzles
  for select
  to authenticated
  using ((select public.is_official_editor()));

create policy "official_puzzles_insert_editors"
  on public.official_puzzles
  for insert
  to authenticated
  with check ((select public.is_official_editor()));

create policy "official_puzzles_update_editors"
  on public.official_puzzles
  for update
  to authenticated
  using ((select public.is_official_editor()))
  with check ((select public.is_official_editor()));

create policy "official_puzzles_delete_editors"
  on public.official_puzzles
  for delete
  to authenticated
  using ((select public.is_official_editor()));

create policy "official_editors_select_own"
  on public.official_editors
  for select
  to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "official_editors_insert_bootstrap"
  on public.official_editors
  for insert
  to authenticated
  with check (false);
