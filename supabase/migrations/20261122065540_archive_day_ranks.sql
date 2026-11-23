-- Per-day ranks for the archive. Names only — mistakes stay server-side.

create or replace function private.archive_rank_rows()
returns table (
  puzzle_id integer,
  puzzle_date date,
  user_id text,
  display_name text,
  daily_rank integer,
  won boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.puzzle_id,
    r.puzzle_date,
    r.user_id,
    coalesce(nullif(btrim(p.display_name), ''), 'Agent') as display_name,
    rank() over (
      partition by r.puzzle_date
      order by r.mistakes asc, r.finished_at asc, r.user_id
    )::integer as daily_rank,
    r.won
  from public.daily_results r
  left join public.profiles p on p.user_id = r.user_id;
$$;

revoke all on function private.archive_rank_rows() from public, anon, authenticated;

create or replace function public.get_archive_ranks()
returns table (
  puzzle_id integer,
  puzzle_date date,
  user_id text,
  display_name text,
  daily_rank integer,
  won boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select * from private.archive_rank_rows();
$$;

revoke all on function public.get_archive_ranks() from public, anon;
grant execute on function public.get_archive_ranks() to authenticated;
