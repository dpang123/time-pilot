import { kv } from './kv';

/**
 * Sliding-window rate limit using Vercel KV.
 * Limit: max 5 score submissions per IP per hour.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function rateLimit(ipHash: string): Promise<RateLimitResult> {
  const key = `ratelimit:${ipHash}`;
  const count = (await kv.incr(key)) as number;
  if (count === 1) {
    await kv.pexpire(key, WINDOW_MS);
  }
  const ttl = (await kv.pttl(key)) as number;
  return {
    allowed: count <= MAX_PER_WINDOW,
    remaining: Math.max(0, MAX_PER_WINDOW - count),
    resetAt: Date.now() + Math.max(0, ttl),
  };
}
