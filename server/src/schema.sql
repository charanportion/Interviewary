-- Billing server schema (Supabase Postgres). Minimal: Polar is the source of truth
-- for entitlements + credit grants; these tables cache state for fast enforcement
-- and keep a local usage ledger reconciled via webhooks.

create table if not exists customers (
  polar_customer_id   text primary key,
  email               text,
  -- 'lifetime' | 'subscription' | 'none'
  entitlement         text        not null default 'none',
  subscription_status text,
  -- cached interview-minute balance (credited - consumed), authoritative copy
  -- lives on the Polar meter; refreshed on resolve + webhooks.
  credits_cached      integer     not null default 0,
  updated_at          timestamptz not null default now()
);

-- Maps a pasted license key (sha256) → customer, so we don't validate against
-- Polar on every call. Multiple keys may point at one customer.
create table if not exists license_keys (
  key_hash          text primary key,
  polar_customer_id text        not null references customers(polar_customer_id) on delete cascade,
  created_at        timestamptz not null default now()
);

create table if not exists sessions (
  id                uuid primary key,
  polar_customer_id text        not null,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  minutes_consumed  integer     not null default 0,
  -- 'active' | 'ended' | 'stopped'
  status            text        not null default 'active'
);

-- Local source of truth for metered usage; reconciled against Polar ingestion.
create table if not exists usage_ledger (
  id                uuid primary key default gen_random_uuid(),
  polar_customer_id text        not null,
  session_id        uuid,
  minutes           integer     not null,
  ingested_to_polar boolean     not null default false,
  created_at        timestamptz not null default now()
);

-- Idempotency for webhook delivery (Polar may retry).
create table if not exists webhook_events (
  polar_event_id text primary key,
  type           text        not null,
  received_at    timestamptz not null default now()
);

-- ───────── Security: lock these tables to server-only access ─────────
-- These tables are reached ONLY via the direct Postgres connection (table-owner
-- role) — never via Supabase's Data API. Enabling RLS with NO policies + revoking
-- the public PostgREST roles means anyone holding the project's anon key gets
-- nothing from these tables, while the server (owner) and service_role bypass RLS.
alter table customers      enable row level security;
alter table license_keys   enable row level security;
alter table sessions       enable row level security;
alter table usage_ledger   enable row level security;
alter table webhook_events enable row level security;

revoke all on customers, license_keys, sessions, usage_ledger, webhook_events
  from anon, authenticated;
