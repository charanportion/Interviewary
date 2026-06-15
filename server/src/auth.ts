// Short-lived session tokens the extension uses to authenticate server calls.
// Issued after a license key resolves, so we don't hit Polar on every request.
// The token doubles as the bearer the LLM proxy reads (passed as the OpenAI
// `apiKey` from the extension), which the proxy swaps for our real upstream key.

import { SignJWT, jwtVerify } from 'jose';
import { env } from './env.ts';
import type { EntitlementStatus } from '@interview-copilot/shared';

const secret = new TextEncoder().encode(env.jwtSecret);

export interface SessionClaims {
  customerId: string;
  entitlement: EntitlementStatus;
}

export async function issueSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ entitlement: claims.entitlement })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.customerId)
    .setIssuedAt()
    .setExpirationTime(`${env.sessionTokenTtlSec}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return {
      customerId: payload.sub,
      entitlement: (payload.entitlement as EntitlementStatus) ?? 'none',
    };
  } catch {
    return null;
  }
}

/** Pull a bearer token from an Authorization header. */
export function bearer(authHeader: string | undefined | null): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return m?.[1] ?? null;
}
