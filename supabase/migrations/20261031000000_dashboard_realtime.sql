-- Enable server-side dashboard refresh notifications for existing production tables.
-- This adds tables to the Realtime publication only; it does not change RLS or table access.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'Supabase Realtime publication "supabase_realtime" does not exist. Enable Realtime for this project, then rerun this migration.';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservations'
  ) then
    execute 'alter publication supabase_realtime add table public.reservations';
  end if;

  if to_regclass('public.reservation_inquiries') is not null and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservation_inquiries'
  ) then
    execute 'alter publication supabase_realtime add table public.reservation_inquiries';
  end if;
end
$$;
