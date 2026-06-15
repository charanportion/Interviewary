// Minimal in-memory fixed-window rate limiter (Hono middleware).
//
// Single-instance only — buckets live in this process's memory. For a multi-
// instance deployment, swap the Map for Redis/Upstash. Good enough to stop
// brute-force (license keys), checkout spam, and proxy hammering on one node.

import type { Context, MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';

interface Bucket {
  count: number;
  resetAt: number;
}

/** Best-effort client IP: trust the first X-Forwarded-For hop behind a proxy. */
export function clientIp(c: Context): string {
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const real = c.req.header('x-real-ip');
  if (real) return real;
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export function rateLimit(opts: {
  windowMs: number;
  max: number;
  name: string;
  key?: (c: Context) => string;
}): MiddlewareHandler {
  const store = new Map<string, Bucket>();
  const keyFn = opts.key ?? clientIp;

  return async (c, next) => {
    const now = Date.now();
    const k = `${opts.name}:${keyFn(c)}`;
    let b = store.get(k);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + opts.windowMs };
      store.set(k, b);
    }
    b.count++;
    if (b.count > opts.max) {
      c.header('Retry-After', String(Math.max(1, Math.ceil((b.resetAt - now) / 1000))));
      return c.json({ error: 'rate_limited', message: 'Too many requests. Slow down.' }, 429);
    }
    // Opportunistic cleanup so the map doesn't grow unbounded.
    if (store.size > 5000) {
      for (const [key, bucket] of store) if (bucket.resetAt <= now) store.delete(key);
    }
    await next();
  };
}
