/**
 * Client-side wrapper around the leaderboard API.
 *
 * In dev (vite serves the static frontend on 5173), the /api/* routes only
 * exist when running `vercel dev`. Wrap fetches with try/catch so the game
 * still works without a backend; just no online leaderboard.
 */

export interface SessionToken {
  sessionId: string;
  startTime: number;
  signature: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  era: string;
  loop: number;
  playedAt: number;
}

export interface ScoreSubmission {
  session: SessionToken;
  name: string;
  score: number;
  eraReached: string;
  loop: number;
  durationMs: number;
  optInEmail: boolean;
  email?: string;
}

export interface SubmissionResult {
  ok: boolean;
  rank?: number | null;
  error?: string;
}

const API_BASE = ''; // same origin

export async function startSession(): Promise<SessionToken | null> {
  try {
    const res = await fetch(`${API_BASE}/api/session`, { method: 'POST' });
    if (!res.ok) return null;
    return (await res.json()) as SessionToken;
  } catch {
    return null;
  }
}

export async function fetchTopScores(): Promise<LeaderboardEntry[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/scores`, { method: 'GET' });
    if (!res.ok) return null;
    const data = (await res.json()) as { entries?: LeaderboardEntry[] };
    return data.entries ?? [];
  } catch {
    return null;
  }
}

export async function submitScore(s: ScoreSubmission): Promise<SubmissionResult> {
  try {
    const res = await fetch(`${API_BASE}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: s.session.sessionId,
        startTime: s.session.startTime,
        signature: s.session.signature,
        name: s.name,
        score: s.score,
        eraReached: s.eraReached,
        loop: s.loop,
        durationMs: s.durationMs,
        optInEmail: s.optInEmail,
        email: s.email ?? '',
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<SubmissionResult>;
    if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    return { ok: true, rank: data.rank ?? null };
  } catch (err) {
    return { ok: false, error: 'Network error' };
  }
}

// Local fallback so the menu shows recent scores even with no backend.
const LOCAL_KEY = 'timepilot.localScores';

export interface LocalScore {
  name: string;
  score: number;
  era: string;
  loop: number;
  playedAt: number;
}

export function readLocalScores(): LocalScore[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushLocalScore(s: LocalScore): void {
  try {
    const arr = readLocalScores();
    arr.push(s);
    arr.sort((a, b) => b.score - a.score);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(arr.slice(0, 10)));
  } catch {
    // ignore
  }
}
