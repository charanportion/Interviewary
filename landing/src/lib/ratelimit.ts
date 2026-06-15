// Minimal in-memory rate limiter for Next.js route handlers. Best-effort: buckets
// live in the serving instance's memory (per-instance on serverless). Enough to
// blunt casual spam/scraping of the public endpoints; use Upstash/Redis for a
// hard guarantee across instances.

interface Bucket {
  count: number;
  resetAt: number;
}
const store = new Map<string, Bucket>();

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** Returns true if the request is allowed; false if it exceeded the limit. */
export function allow(name: string, req: Request, max: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${name}:${clientIp(req)}`;
  let b = store.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    store.set(key, b);
  }
  b.count++;
  if (store.size > 5000) for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
  return b.count <= max;
}
