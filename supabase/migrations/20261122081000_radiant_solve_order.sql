-- Radiant is awarded when groups are solved Radiant → Immortal → Gold → Iron.
-- Rank scores: Iron 0, Silver 1, Plat 2, Diamond 3, Immortal 4, Radiant 5.

alter table public.daily_results
  add column if not exists radiant boolean not null default false;

drop function if exists public.get_my_daily_ranks();
drop function if exists private.player_daily_ranks(text);

create or replace function private.leaderboard_rows()
returns table (
  user_id text,
  display_name text,
  current_streak integer,
  max_streak integer,
  rank_avg numeric,
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
      round(avg(
        case
          when not won then 0
          when radiant then 5
          when mistakes <= 0 then 4
          when mistakes = 1 then 3
          when mistakes = 2 then 2
          else 1
        end
      )::numeric, 2) as rank_avg
    from public.daily_results
    group by user_id
  )
  select
    a.user_id,
    coalesce(nullif(btrim(p.display_name), ''), 'Agent') as display_name,
    coalesce(c.current_streak, 0) as current_streak,
    coalesce(m.max_streak, 0) as max_streak,
    a.rank_avg,
    a.dailies_played
  from avgs a
  left join public.profiles p on p.user_id = a.user_id
  left join current_streaks c on c.user_id = a.user_id
  left join max_streaks m on m.user_id = a.user_id;
$$;

create or replace function private.player_daily_ranks(target_user text)
returns table (
  puzzle_id integer,
  puzzle_date date,
  won boolean,
  mistakes smallint,
  radiant boolean,
  daily_players integer
)
language sql
stable
security definer
set search_path = public
as $$
  with day_ranks as (
    select
      r.user_id,
      r.puzzle_id,
      r.puzzle_date,
      r.won,
      r.mistakes,
      r.radiant,
      count(*) over (partition by r.puzzle_date)::integer as daily_players
    from public.daily_results r
  )
  select
    puzzle_id,
    puzzle_date,
    won,
    mistakes,
    radiant,
    daily_players
  from day_ranks
  where user_id = target_user
  order by puzzle_date desc, puzzle_id desc;
$$;

revoke all on function private.player_daily_ranks(text) from public, anon, authenticated;

create or replace function public.get_my_daily_ranks()
returns table (
  puzzle_id integer,
  puzzle_date date,
  won boolean,
  mistakes smallint,
  radiant boolean,
  daily_players integer
)
language sql
stable
security definer
set search_path = public
as $$
  select * from private.player_daily_ranks((select auth.jwt() ->> 'sub'));
$$;

revoke all on function public.get_my_daily_ranks() from public, anon;
grant execute on function public.get_my_daily_ranks() to authenticated;
