import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { kv, assertKvConfigured } from './_lib/kv';
import { verify, hashIp } from './_lib/hmac';
import { isValidName, isValidEmail } from './_lib/validate';
import { rateLimit } from './_lib/ratelimit';

const LEADERBOARD_KEY = 'leaderboard';
const TOP_N = 10;

interface ScorePayload {
  sessionId: string;
  startTime: number;
  signature: string; // HMAC of `${sessionId}:${startTime}`
  name: string;
  score: number;
  eraReached: string;
  loop: number;
  durationMs: number;
  optInEmail?: boolean;
  email?: string;
}

interface PublicEntry {
  rank: number;
  name: string;
  score: number;
  era: string;
  loop: number;
  playedAt: number; // ms epoch
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    assertKvConfigured();

    if (req.method === 'GET') return handleGet(res);
    if (req.method === 'POST') return await handlePost(req, res);
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('scores handler error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function handleGet(res: VercelResponse) {
  // Top N scores, descending. ZRANGE with REV in Vercel KV's @upstash/redis.
  const ids = (await kv.zrange<string[]>(LEADERBOARD_KEY, 0, TOP_N - 1, {
    rev: true,
  })) as string[];
  const entries: PublicEntry[] = [];
  if (ids && ids.length) {
    // Pull each entry hash. (Pipeline would be faster but this is fine for top-10.)
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const data = (await kv.hgetall<Record<string, string>>(`entry:${id}`)) || {};
      entries.push({
        rank: i + 1,
        name: data.name ?? 'PLAYER',
        score: Number(data.score ?? 0),
        era: data.era ?? '',
        loop: Number(data.loop ?? 0),
        playedAt: Number(data.playedAt ?? 0),
      });
    }
  }
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  return res.status(200).json({ entries });
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const body = (typeof req.body === 'string' ? safeJson(req.body) : req.body) as ScorePayload;
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });

  const {
    sessionId,
    startTime,
    signature,
    name,
    score,
    eraReached,
    loop,
    durationMs,
    optInEmail,
    email,
  } = body;

  // ---- Auth & integrity ----
  if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ error: 'Bad sessionId' });
  if (!Number.isFinite(startTime)) return res.status(400).json({ error: 'Bad startTime' });
  if (!verify(`${sessionId}:${startTime}`, signature)) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  // Session window: must be at most 6 hours old, must not be from the future.
  const age = Date.now() - startTime;
  if (age < -60_000 || age > 6 * 60 * 60 * 1000) {
    return res.status(403).json({ error: 'Session expired' });
  }

  // Reject session-replay: only one submission per sessionId.
  const usedKey = `session-used:${sessionId}`;
  const newlySet = await kv.set(usedKey, 1, { nx: true, ex: 6 * 60 * 60 });
  if (newlySet !== 'OK') return res.status(409).json({ error: 'Session already used' });

  // ---- Field validation ----
  if (!isValidName(name)) return res.status(400).json({ error: 'Invalid name' });
  if (!Number.isFinite(score) || score < 0 || score > 99_999_999) {
    return res.status(400).json({ error: 'Invalid score' });
  }
  if (typeof eraReached !== 'string' || eraReached.length > 12) {
    return res.status(400).json({ error: 'Invalid era' });
  }
  if (!Number.isFinite(loop) || loop < 0 || loop > 99) {
    return res.status(400).json({ error: 'Invalid loop' });
  }
  if (!Number.isFinite(durationMs) || durationMs < 1500 || durationMs > 12 * 60 * 60 * 1000) {
    return res.status(400).json({ error: 'Invalid duration' });
  }

  // ---- Sanity: max ~1500 score points per second is plenty even with bonuses ----
  const maxPerSec = 1500;
  if (score / (durationMs / 1000) > maxPerSec) {
    return res.status(403).json({ error: 'Score implausible for duration' });
  }

  let cleanEmail: string | null = null;
  if (optInEmail && email && email.trim().length > 0) {
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    cleanEmail = email.trim();
  }

  // ---- Rate limit per IP ----
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '';
  const ipHash = hashIp(ip);
  const limit = await rateLimit(ipHash);
  if (!limit.allowed) {
    return res
      .status(429)
      .json({ error: 'Too many submissions. Try again later.', resetAt: limit.resetAt });
  }

  // ---- Persist ----
  const id = randomUUID();
  const playedAt = Date.now();
  const entry: Record<string, string> = {
    name: name.trim(),
    score: String(Math.floor(score)),
    era: eraReached,
    loop: String(Math.floor(loop)),
    playedAt: String(playedAt),
    ipHash,
  };
  if (cleanEmail) entry.email = cleanEmail; // private — never returned by GET.

  await kv.hset(`entry:${id}`, entry);
  await kv.zadd(LEADERBOARD_KEY, { score: Math.floor(score), member: id });

  // Trim leaderboard to top 100 in a deterministic way.
  // Keep the highest 100 scores; remove the lowest overflow count.
  const size = (await kv.zcard(LEADERBOARD_KEY)) as number;
  const overflow = size - 100;
  if (overflow > 0) {
    await kv.zremrangebyrank(LEADERBOARD_KEY, 0, overflow - 1);
  }

  // Compute rank of the new entry.
  const rankFromTop = await kv.zrevrank(LEADERBOARD_KEY, id);

  return res.status(200).json({
    ok: true,
    rank: rankFromTop !== null && rankFromTop !== undefined ? rankFromTop + 1 : null,
  });
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
