// Shared security helpers for the billing server.

import type { Context, MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env.ts';

/**
 * CORS: allow the extension side panel (any chrome-extension:// origin) and the
 * configured landing origin(s). Never reflect arbitrary web origins, and never `*`.
 * Requests with no Origin header (server-to-server, curl) are unaffected by CORS.
 */
export function corsMiddleware(): MiddlewareHandler {
  const allowed = new Set(env.allowedOrigins);
  return cors({
    origin: (origin) => {
      if (!origin) return undefined; // non-browser caller — no CORS headers needed
      if (origin.startsWith('chrome-extension://')) return origin;
      if (allowed.has(origin)) return origin;
      return undefined; // disallowed → no ACAO header → browser blocks
    },
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-session-id', 'anthropic-version', 'anthropic-beta'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 600,
  });
}

/** Conservative response headers on every response. */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  // This is a credentials/billing API — never let intermediaries cache responses.
  c.header('Cache-Control', 'no-store');
};

/** Reject requests whose Content-Length exceeds `maxBytes` before reading the body. */
export function maxBody(maxBytes: number): MiddlewareHandler {
  return async (c, next) => {
    const len = Number(c.req.header('content-length') ?? 0);
    if (len > maxBytes) return c.json({ error: 'payload_too_large' }, 413);
    await next();
  };
}

/** Log full error server-side; return a safe generic message to the client. */
export function fail(c: Context, where: string, err: unknown, status = 502) {
  console.error(`[${where}]`, err);
  return c.json({ error: 'server_error', message: 'Something went wrong. Please try again.' }, status as never);
}
