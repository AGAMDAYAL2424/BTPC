export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { getRepo } from '../../../lib/server/db';
import { limiterKey, FixedWindowLimiter } from '../../../lib/server/guard/ratelimit';

/** Ratings are cheap but still worth a limiter, so the table cannot be flooded. */
const limiter = new FixedWindowLimiter(15 * 60 * 1000, 200);

const BodySchema = z
  .object({
    messageId: z.number().int().positive(),
    rating: z.union([z.literal(1), z.literal(-1)]),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  const key = limiterKey(request.headers, 'feedback');
  if (!limiter.consume(key).allowed) {
    return new Response(null, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  try {
    getRepo().recordFeedback(parsed.data.messageId, parsed.data.rating);
  } catch (error) {
    // A rating that references a message that has been purged is not worth an
    // error to the visitor; it just does not get recorded.
    console.warn('[feedback] could not record rating', error instanceof Error ? error.message : '');
  }

  return new Response(null, { status: 204 });
}
