import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC helpers for signing client → server score submissions.
 *
 * Flow:
 *   1. Client POSTs /api/session at game start; server returns
 *      { sessionId, startTime, signature } where signature = HMAC(sessionId|startTime).
 *   2. At game over, client POSTs the run details + signature back to /api/scores.
 *      Server verifies signature, checks that startTime is within a sane window,
 *      and that the score isn't impossibly high vs duration.
 *
 * The secret lives in env LEADERBOARD_SECRET. It MUST be set in Vercel.
 */

function secret(): string {
  const s = process.env.LEADERBOARD_SECRET;
  if (!s) throw new Error('LEADERBOARD_SECRET env var is not set');
  return s;
}

export function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

export function verify(payload: string, signature: string): boolean {
  if (!signature || typeof signature !== 'string') return false;
  const expected = sign(payload);
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

/** Hash an IP for storage so we don't keep raw IPs at rest. */
export function hashIp(ip: string): string {
  return createHmac('sha256', secret()).update('ip:' + ip).digest('hex').slice(0, 24);
}
