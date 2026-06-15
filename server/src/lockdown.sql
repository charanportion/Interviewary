-- One-time security lockdown for the Supabase project — run in the Supabase SQL
-- editor (or via psql) against the existing database.
--
-- Closes the "UNRESTRICTED" exposure: enables Row Level Security with NO policies
-- and revokes the public PostgREST roles (anon, authenticated) on every table that
-- holds data. Result:
--   • anyone with the public anon key gets ZERO rows / denied writes via the Data API
--   • the billing server (direct Postgres, table-owner role) is unaffected
--   • the landing site (service_role key) is unaffected (service_role bypasses RLS)
--
-- Safe to run multiple times.

do $$
declare t text;
begin
  foreach t in array array[
    -- billing (server, direct Postgres)
    'customers', 'license_keys', 'sessions', 'usage_ledger', 'webhook_events',
    -- landing analytics / PII (service_role)
    'downloads', 'events'
  ]
  loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('alter table public.%I enable row level security;', t);
      execute format('revoke all on public.%I from anon, authenticated;', t);
    end if;
  end loop;
end $$;

-- Verify (relrowsecurity should be true for each):
--   select relname, relrowsecurity from pg_class
--   where relname in ('customers','license_keys','sessions','usage_ledger',
--                     'webhook_events','downloads','events');
