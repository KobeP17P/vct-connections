-- PostgREST upserts require UPDATE on every column in the payload,
-- including user_id. Column-limited grants made profile writes 403.
grant select, insert, update on table public.profiles to authenticated;
