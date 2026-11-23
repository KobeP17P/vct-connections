-- Chosen usernames (not Google names) and editor score removal.

alter table public.profiles
  add column if not exists username_set boolean not null default false;

create unique index if not exists profiles_display_name_ci_key
  on public.profiles (lower(btrim(display_name)));

grant delete on table public.daily_results to authenticated;

create policy "daily_results_delete_editors"
  on public.daily_results
  for delete
  to authenticated
  using ((select public.is_official_editor()));
