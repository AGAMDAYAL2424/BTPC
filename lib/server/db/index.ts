import 'server-only';
import path from 'node:path';
import { config } from '../config';
import { SqliteRepo } from './sqlite';
import type { KnowledgeRepo } from './repo';

/**
 * One connection per process, opened at first use rather than per request.
 *
 * Module scope on the server is process-wide shared memory, so nothing
 * request-specific may be cached here. A database handle is safe: it holds no
 * per-visitor state.
 */
let repo: SqliteRepo | null = null;

export function getRepo(): KnowledgeRepo {
  if (!repo) {
    const file = path.isAbsolute(config.databaseUrl)
      ? config.databaseUrl
      : path.join(process.cwd(), config.databaseUrl);
    repo = new SqliteRepo(file);
  }
  return repo;
}

export type { KnowledgeRepo } from './repo';
