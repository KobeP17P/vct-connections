-- COMMS daily leaderboard
-- Clerk is the identity provider. RLS keys off auth.jwt()->>'sub'.
-- Aggregates are computed in a private definer function so players
-- cannot read each other's raw daily results.

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  user_id text primary key default (auth.jwt() ->> 'sub'),
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_results (
  id bigint generated always as identity primary key,
  user_id text not null default (auth.jwt() ->> 'sub'),
  puzzle_id integer not null check (puzzle_id > 0),
  puzzle_date date not null,
  mistakes smallint not null check (mistakes between 0 and 4),
  won boolean not null,
  finished_at timestamptz not null default now(),
  unique (user_id, puzzle_id),
  unique (user_id, puzzle_date)
);

create index daily_results_user_id_idx on public.daily_results (user_id);
create index daily_results_puzzle_date_idx on public.daily_results (puzzle_date);

alter table public.profiles enable row level security;
alter table public.daily_results enable row level security;

grant select, insert, update (display_name, updated_at) on table public.profiles to authenticated;
grant select, insert on table public.daily_results to authenticated;

create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "daily_results_select_own"
  on public.daily_results
  for select
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "daily_results_insert_own"
  on public.daily_results
  for insert
  to authenticated
  with check (
    (select auth.jwt()->>'sub') = user_id
    and puzzle_date <= (current_date + 1)
  );

create or replace function private.leaderboard_rows()
returns table (
  user_id text,
  display_name text,
  current_streak integer,
  max_streak integer,
  daily_avg numeric,
  dailies_played integer
)
language sql
stable
security definer
set search_path = public
as $$
  with last_play as (
    select distinct on (r.user_id)
      r.user_id,
      r.puzzle_date as last_date,
      r.won as last_won
    from public.daily_results r
    order by r.user_id, r.puzzle_date desc
  ),
  win_days as (
    select
      r.user_id,
      r.puzzle_date,
      r.puzzle_date - (row_number() over (
        partition by r.user_id
        order by r.puzzle_date
      ))::integer as streak_id
    from public.daily_results r
    where r.won
  ),
  streaks as (
    select
      user_id,
      streak_id,
      count(*)::integer as streak_len,
      max(puzzle_date) as end_date
    from win_days
    group by user_id, streak_id
  ),
  max_streaks as (
    select user_id, coalesce(max(streak_len), 0) as max_streak
    from streaks
    group by user_id
  ),
  current_streaks as (
    select
      lp.user_id,
      case
        when not lp.last_won then 0
        when lp.last_date < (current_date - 1) then 0
        else coalesce((
          select s.streak_len
          from streaks s
          where s.user_id = lp.user_id
            and s.end_date = lp.last_date
        ), 0)
      end as current_streak
    from last_play lp
  ),
  avgs as (
    select
      user_id,
      count(*)::integer as dailies_played,
      round(avg(mistakes)::numeric, 2) as daily_avg
    from public.daily_results
    group by user_id
  )
  select
    a.user_id,
    coalesce(nullif(btrim(p.display_name), ''), 'Agent') as display_name,
    coalesce(c.current_streak, 0) as current_streak,
    coalesce(m.max_streak, 0) as max_streak,
    a.daily_avg,
    a.dailies_played
  from avgs a
  left join public.profiles p on p.user_id = a.user_id
  left join current_streaks c on c.user_id = a.user_id
  left join max_streaks m on m.user_id = a.user_id;
$$;

revoke all on function private.leaderboard_rows() from public, anon;
grant execute on function private.leaderboard_rows() to authenticated;

create or replace function public.get_leaderboard()
returns table (
  user_id text,
  display_name text,
  current_streak integer,
  max_streak integer,
  daily_avg numeric,
  dailies_played integer
)
language sql
stable
security definer
set search_path = public
as $$
  select * from private.leaderboard_rows();
$$;

revoke all on function public.get_leaderboard() from public, anon;
grant execute on function public.get_leaderboard() to authenticated;

grant usage, select on sequence public.daily_results_id_seq to authenticated;
