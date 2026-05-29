-- Interviewary — Supabase schema
-- Run this once in your project's SQL editor (Dashboard → SQL → New query).
--
-- Two tables:
--   downloads — one row per gated download on the marketing site (lead capture).
--   events    — opt-in, anonymous usage events sent by the extension.
--
-- Security model: all writes happen on the server (the Next.js API routes
-- /api/leads and /api/events) using the service_role key, which bypasses RLS. No
-- Supabase key ships to the browser or the extension. We keep Row-Level Security
-- ENABLED with NO anon policies, so direct anonymous access (read or write) is
-- denied — only the server can touch these tables. You read the data from the
-- Supabase dashboard, which also uses service_role.

-- ─────────────────────────────────────────────────────────────────────────────
-- downloads
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.downloads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null,
  phone       text,
  consent     boolean not null default false,
  user_agent  text,
  referrer    text
);

-- RLS on, no anon policies: only the server (service_role) can read or write.
alter table public.downloads enable row level security;
drop policy if exists "anon can insert downloads" on public.downloads;

-- ─────────────────────────────────────────────────────────────────────────────
-- events
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  client_id   uuid not null,           -- random per-install id; not linked to any email
  event       text not null,           -- e.g. interview_started, answer_evaluated
  session_id  uuid,                    -- per-interview id (not a person)
  properties  jsonb not null default '{}'::jsonb
);

create index if not exists events_created_at_idx on public.events (created_at);
create index if not exists events_event_idx       on public.events (event);
create index if not exists events_client_id_idx    on public.events (client_id);

-- RLS on, no anon policies: only the server (service_role) can read or write.
alter table public.events enable row level security;
drop policy if exists "anon can insert events" on public.events;
