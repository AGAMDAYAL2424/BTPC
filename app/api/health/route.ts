// Touches SQLite and the retrieval index, so this cannot run on the edge
// runtime, and it must never be cached: a cached health check reports the
// health of whenever it was cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getRepo } from '../../../lib/server/db';
import { getIndex } from '../../../lib/server/retrieval/store';

/**
 * Liveness and readiness for the process supervisor and the uptime monitor.
 *
 * "The port is open" is not the question worth asking. A Node process whose
 * database file has gone read-only, or whose index built empty, still accepts
 * connections and still answers - with nothing. So this reads one row from
 * SQLite and confirms the index actually holds the knowledge base, which is the
 * narrowest check that distinguishes serving from merely running.
 *
 * The body is deliberately thin. This endpoint is reachable from the internet,
 * so it carries no version, no path, and no error detail; a failure logs
 * server-side and returns a bare 503.
 */
export async function GET(): Promise<Response> {
  try {
    const repo = getRepo();
    // Single-row read. Cheap enough to poll every few seconds for six days.
    repo.getQuota('llm');

    const rows = getIndex().listFaqs().length;
    if (rows === 0) {
      console.error('[health] retrieval index is empty');
      return json({ status: 'degraded' }, 503);
    }

    return json({ status: 'ok', rows }, 200);
  } catch (error) {
    console.error('[health] check failed', error);
    return json({ status: 'error' }, 503);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
