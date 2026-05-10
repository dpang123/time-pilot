import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { sign } from './_lib/hmac';

/**
 * POST /api/session
 * Issues a short-lived signed session token used to authorise score submission.
 *
 * Returns: { sessionId, startTime, signature }
 *   signature = HMAC(`${sessionId}:${startTime}`)
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const sessionId = randomUUID();
  const startTime = Date.now();
  const signature = sign(`${sessionId}:${startTime}`);
  return res.status(200).json({ sessionId, startTime, signature });
}
