import { kv } from '@vercel/kv';

export { kv };

/**
 * Safety check: throws a clear error in dev if the KV environment variables
 * weren't pulled (vercel env pull). The KV client throws a less obvious
 * error otherwise.
 */
export function assertKvConfigured(): void {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error(
      'Vercel KV is not configured: set KV_REST_API_URL and KV_REST_API_TOKEN.',
    );
  }
}
