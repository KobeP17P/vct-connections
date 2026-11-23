-- Per-day rank history for the signed-in player. Mistakes stay off the client.

create or replace function private.player_daily_ranks(target_user text)
returns table (
  puzzle_id integer,
  puzzle_date date,
  won boolean,
  daily_rank integer,
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
      rank() over (
        partition by r.puzzle_date
        order by r.mistakes asc, r.finished_at asc, r.user_id
      )::integer as daily_rank,
      count(*) over (partition by r.puzzle_date)::integer as daily_players
    from public.daily_results r
  )
  select
    puzzle_id,
    puzzle_date,
    won,
    daily_rank,
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
  daily_rank integer,
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
