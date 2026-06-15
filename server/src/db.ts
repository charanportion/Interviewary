// Data-access layer over Supabase Postgres, via the `postgres` package's
// tagged-template API (parameters are bound safely, not string-interpolated).
//
// Connection string = your Supabase project's Postgres URL (Dashboard → Project
// Settings → Database → Connection string). The transaction pooler (port 6543)
// disables prepared statements, so we set prepare:false to stay compatible with
// both pooler modes.

import postgres from 'postgres';
import { createHash } from 'node:crypto';
import { env } from './env.ts';
import type { EntitlementStatus } from '@interview-copilot/shared';

const sql = postgres(env.databaseUrl, { prepare: false, ssl: 'require' });

export function hashLicenseKey(key: string): string {
  return createHash('sha256').update(key.trim()).digest('hex');
}

export interface CustomerRow {
  polar_customer_id: string;
  email: string | null;
  entitlement: EntitlementStatus;
  subscription_status: string | null;
  credits_cached: number;
}

export interface SessionRow {
  id: string;
  polar_customer_id: string;
  minutes_consumed: number;
  status: string;
}

export async function upsertCustomer(c: {
  polarCustomerId: string;
  email?: string | null;
  entitlement: EntitlementStatus;
  subscriptionStatus?: string | null;
  creditsCached: number;
}): Promise<void> {
  await sql`
    insert into customers
      (polar_customer_id, email, entitlement, subscription_status, credits_cached, updated_at)
    values
      (${c.polarCustomerId}, ${c.email ?? null}, ${c.entitlement},
       ${c.subscriptionStatus ?? null}, ${c.creditsCached}, now())
    on conflict (polar_customer_id) do update set
      email               = coalesce(excluded.email, customers.email),
      entitlement         = excluded.entitlement,
      subscription_status = excluded.subscription_status,
      credits_cached      = excluded.credits_cached,
      updated_at          = now()
  `;
}

export async function getCustomer(polarCustomerId: string): Promise<CustomerRow | null> {
  const rows = await sql<CustomerRow[]>`
    select polar_customer_id, email, entitlement, subscription_status, credits_cached
    from customers where polar_customer_id = ${polarCustomerId}
  `;
  return rows[0] ?? null;
}

export async function mapLicenseKey(keyHash: string, polarCustomerId: string): Promise<void> {
  await sql`
    insert into license_keys (key_hash, polar_customer_id)
    values (${keyHash}, ${polarCustomerId})
    on conflict (key_hash) do update set polar_customer_id = excluded.polar_customer_id
  `;
}

export async function customerIdForLicenseKey(keyHash: string): Promise<string | null> {
  const rows = await sql<{ polar_customer_id: string }[]>`
    select polar_customer_id from license_keys where key_hash = ${keyHash}
  `;
  return rows[0]?.polar_customer_id ?? null;
}

/** Atomically decrement cached credits by n (floored at 0). Returns new balance. */
export async function decrementCredits(polarCustomerId: string, n: number): Promise<number> {
  const rows = await sql<{ credits_cached: number }[]>`
    update customers
    set credits_cached = greatest(0, credits_cached - ${n}), updated_at = now()
    where polar_customer_id = ${polarCustomerId}
    returning credits_cached
  `;
  return rows[0]?.credits_cached ?? 0;
}

export async function createSession(id: string, polarCustomerId: string): Promise<void> {
  await sql`
    insert into sessions (id, polar_customer_id) values (${id}, ${polarCustomerId})
  `;
}

export async function getSession(id: string): Promise<SessionRow | null> {
  const rows = await sql<SessionRow[]>`
    select id, polar_customer_id, minutes_consumed, status from sessions where id = ${id}
  `;
  return rows[0] ?? null;
}

export async function bumpSessionMinutes(id: string, delta: number): Promise<void> {
  await sql`
    update sessions set minutes_consumed = minutes_consumed + ${delta} where id = ${id}
  `;
}

export async function endSession(id: string, status: 'ended' | 'stopped'): Promise<void> {
  await sql`
    update sessions set status = ${status}, ended_at = now() where id = ${id}
  `;
}

export async function recordUsage(u: {
  polarCustomerId: string;
  sessionId: string;
  minutes: number;
  ingested: boolean;
}): Promise<void> {
  await sql`
    insert into usage_ledger (polar_customer_id, session_id, minutes, ingested_to_polar)
    values (${u.polarCustomerId}, ${u.sessionId}, ${u.minutes}, ${u.ingested})
  `;
}

/** Returns true if this is the first time we've seen the event (so process it). */
export async function claimWebhookEvent(eventId: string, type: string): Promise<boolean> {
  const rows = await sql<{ polar_event_id: string }[]>`
    insert into webhook_events (polar_event_id, type)
    values (${eventId}, ${type})
    on conflict (polar_event_id) do nothing
    returning polar_event_id
  `;
  return rows.length > 0;
}

/** Release a claim so a failed-then-retried webhook delivery can be reprocessed. */
export async function unclaimWebhookEvent(eventId: string): Promise<void> {
  await sql`delete from webhook_events where polar_event_id = ${eventId}`;
}

/** Run the schema.sql migration (idempotent). Used by the db:init script. */
export async function runMigration(schemaSql: string): Promise<void> {
  // DDL with multiple statements — run as one unsafe (non-parameterized) batch.
  await sql.unsafe(schemaSql);
}
