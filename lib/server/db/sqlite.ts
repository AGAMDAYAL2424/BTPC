import 'server-only';
import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Faq, Lang } from '../../shared/types';
import { INTENTS } from '../../shared/intents';
import { SCHEMA_SQL } from './schema';
import type {
  AdminRecord,
  Analytics,
  CachedResult,
  FlaggedRow,
  FlagInput,
  KnowledgeRepo,
  MessageLog,
  SessionRecord,
} from './repo';

function toBlob(vector: Float32Array): Buffer {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
}

function fromBlob(blob: Buffer): Float32Array {
  // Copy rather than view: better-sqlite3's buffer is not guaranteed aligned
  // to 4 bytes, and Float32Array over a misaligned offset throws.
  const copy = Buffer.from(blob);
  return new Float32Array(copy.buffer, copy.byteOffset, copy.byteLength / 4);
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Cluster key for near-identical questions, so "kya metro chalegi" asked forty
 * times is one queue row with a count of forty rather than forty rows.
 *
 * Sorted content words rather than the raw string, which folds word order and
 * filler differences together without needing a similarity pass over the whole
 * queue on every insert.
 */
function clusterKey(normalized: string): string {
  const words = normalized
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .sort()
    .join(' ');
  return createHash('sha256').update(words || normalized).digest('hex').slice(0, 16);
}

function rowToFaq(r: Record<string, unknown>): Faq {
  return {
    id: r.id as string,
    intentId: r.intent_id as string,
    displayOrder: r.display_order as number,
    questionHi: r.question_hi as string,
    questionEn: r.question_en as string,
    answerHi: r.answer_hi as string,
    answerEn: r.answer_en as string,
    variantsHi: parseJson(r.variants_hi as string, [] as string[]),
    variantsEn: parseJson(r.variants_en as string, [] as string[]),
    variantsRoman: parseJson(r.variants_roman as string, [] as string[]),
    keywords: parseJson(r.keywords as string, [] as string[]),
    volatility: r.volatility as Faq['volatility'],
    provenance: r.provenance as string,
    source: r.source as Faq['source'],
    status: r.status as Faq['status'],
    lastUpdated: r.last_updated as string,
  };
}

export class SqliteRepo implements KnowledgeRepo {
  private readonly db: Database.Database;

  constructor(file: string) {
    mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.exec(SCHEMA_SQL);
    this.seedIntents();
  }

  private seedIntents(): void {
    const stmt = this.db.prepare(`
      INSERT INTO intents (id, name_hi, name_en, description_en, out_of_scope, display_order, featured)
      VALUES (@id, @name_hi, @name_en, @description_en, @out_of_scope, @display_order, @featured)
      ON CONFLICT(id) DO UPDATE SET
        name_hi = @name_hi, name_en = @name_en, description_en = @description_en,
        out_of_scope = @out_of_scope, display_order = @display_order, featured = @featured
    `);
    const run = this.db.transaction(() => {
      for (const i of INTENTS) {
        stmt.run({
          id: i.id,
          name_hi: i.nameHi,
          name_en: i.nameEn,
          description_en: i.descriptionEn,
          out_of_scope: JSON.stringify(i.outOfScope),
          display_order: i.displayOrder,
          featured: i.featured ? 1 : 0,
        });
      }
    });
    run();
  }

  // ---------------------------------------------------------------- knowledge

  listPublishedFaqs(): Faq[] {
    return this.db
      .prepare(`SELECT * FROM faqs WHERE status = 'published' ORDER BY display_order`)
      .all()
      .map((r) => rowToFaq(r as Record<string, unknown>));
  }

  listAllFaqs(): Faq[] {
    return this.db
      .prepare(`SELECT * FROM faqs ORDER BY display_order`)
      .all()
      .map((r) => rowToFaq(r as Record<string, unknown>));
  }

  getFaq(id: string): Faq | null {
    const r = this.db.prepare(`SELECT * FROM faqs WHERE id = ?`).get(id);
    return r ? rowToFaq(r as Record<string, unknown>) : null;
  }

  upsertFaq(faq: Faq): void {
    this.db
      .prepare(`
        INSERT INTO faqs (
          id, intent_id, display_order, question_hi, question_en, answer_hi, answer_en,
          variants_hi, variants_en, variants_roman, keywords, volatility, provenance,
          source, status, last_updated
        ) VALUES (
          @id, @intent_id, @display_order, @question_hi, @question_en, @answer_hi, @answer_en,
          @variants_hi, @variants_en, @variants_roman, @keywords, @volatility, @provenance,
          @source, @status, @last_updated
        )
        ON CONFLICT(id) DO UPDATE SET
          intent_id = @intent_id, display_order = @display_order,
          question_hi = @question_hi, question_en = @question_en,
          answer_hi = @answer_hi, answer_en = @answer_en,
          variants_hi = @variants_hi, variants_en = @variants_en,
          variants_roman = @variants_roman, keywords = @keywords,
          volatility = @volatility, provenance = @provenance, source = @source,
          status = @status, last_updated = @last_updated,
          updated_at = datetime('now')
      `)
      .run({
        id: faq.id,
        intent_id: faq.intentId,
        display_order: faq.displayOrder,
        question_hi: faq.questionHi,
        question_en: faq.questionEn,
        answer_hi: faq.answerHi,
        answer_en: faq.answerEn,
        variants_hi: JSON.stringify(faq.variantsHi),
        variants_en: JSON.stringify(faq.variantsEn),
        variants_roman: JSON.stringify(faq.variantsRoman),
        keywords: JSON.stringify(faq.keywords),
        volatility: faq.volatility,
        provenance: faq.provenance,
        source: faq.source,
        status: faq.status,
        last_updated: faq.lastUpdated,
      });
  }

  setFaqStatus(id: string, status: Faq['status']): void {
    this.db
      .prepare(`UPDATE faqs SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(status, id);
  }

  getVector(faqId: string): Float32Array | null {
    const r = this.db.prepare(`SELECT vector FROM faq_vectors WHERE faq_id = ?`).get(faqId) as
      | { vector: Buffer }
      | undefined;
    return r ? fromBlob(r.vector) : null;
  }

  listVectors(): Map<string, Float32Array> {
    const rows = this.db.prepare(`SELECT faq_id, vector FROM faq_vectors`).all() as Array<{
      faq_id: string;
      vector: Buffer;
    }>;
    const map = new Map<string, Float32Array>();
    for (const r of rows) map.set(r.faq_id, fromBlob(r.vector));
    return map;
  }

  putVector(faqId: string, model: string, vector: Float32Array): void {
    this.db
      .prepare(`
        INSERT INTO faq_vectors (faq_id, model, dim, vector) VALUES (?, ?, ?, ?)
        ON CONFLICT(faq_id) DO UPDATE SET model = excluded.model,
          dim = excluded.dim, vector = excluded.vector, created_at = datetime('now')
      `)
      .run(faqId, model, vector.length, toBlob(vector));
  }

  // ------------------------------------------------------------------ flagged

  flagQuestion(input: FlagInput): FlaggedRow {
    const cluster = clusterKey(input.questionNorm);
    const existing = this.db
      .prepare(`SELECT * FROM flagged WHERE cluster_id = ? AND status = 'new'`)
      .get(cluster) as Record<string, unknown> | undefined;

    if (existing) {
      this.db
        .prepare(`
          UPDATE flagged SET occurrences = occurrences + 1, last_seen = datetime('now'),
            purge_after = datetime('now', '+' || ? || ' days')
          WHERE id = ?
        `)
        .run(input.retentionDays, existing.id as number);
      return this.getFlagged(existing.id as number)!;
    }

    const referenceId = `DTP-${randomUUID().slice(0, 6).toUpperCase()}`;
    const info = this.db
      .prepare(`
        INSERT INTO flagged (
          reference_id, question_raw, question_norm, lang, script, top_candidates,
          top_score, fallback_layer, cluster_id, ip_hash, purge_after
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+' || ? || ' days'))
      `)
      .run(
        referenceId,
        input.questionRaw,
        input.questionNorm,
        input.lang,
        input.script,
        JSON.stringify(input.topCandidates),
        input.topScore,
        input.fallbackLayer,
        cluster,
        input.ipHash,
        input.retentionDays,
      );
    return this.getFlagged(Number(info.lastInsertRowid))!;
  }

  private static toFlagged(r: Record<string, unknown>): FlaggedRow {
    return {
      id: r.id as number,
      referenceId: r.reference_id as string,
      questionRaw: r.question_raw as string,
      questionNorm: r.question_norm as string,
      lang: r.lang as FlaggedRow['lang'],
      script: r.script as FlaggedRow['script'],
      topCandidates: parseJson(r.top_candidates as string, [] as FlaggedRow['topCandidates']),
      topScore: r.top_score as number,
      fallbackLayer: r.fallback_layer as number,
      clusterId: r.cluster_id as string,
      occurrences: r.occurrences as number,
      status: r.status as FlaggedRow['status'],
      resolvedFaqId: (r.resolved_faq_id as string | null) ?? null,
      firstSeen: r.first_seen as string,
      lastSeen: r.last_seen as string,
    };
  }

  listFlagged(status: FlaggedRow['status'], limit = 200): FlaggedRow[] {
    return this.db
      .prepare(`
        SELECT * FROM flagged WHERE status = ?
        ORDER BY occurrences DESC, last_seen DESC LIMIT ?
      `)
      .all(status, limit)
      .map((r) => SqliteRepo.toFlagged(r as Record<string, unknown>));
  }

  getFlagged(id: number): FlaggedRow | null {
    const r = this.db.prepare(`SELECT * FROM flagged WHERE id = ?`).get(id);
    return r ? SqliteRepo.toFlagged(r as Record<string, unknown>) : null;
  }

  resolveFlagged(id: number, faqId: string): void {
    this.db
      .prepare(`UPDATE flagged SET status = 'answered', resolved_faq_id = ? WHERE id = ?`)
      .run(faqId, id);
  }

  dismissFlagged(id: number): void {
    this.db.prepare(`UPDATE flagged SET status = 'dismissed' WHERE id = ?`).run(id);
  }

  /**
   * Clears the raw question text once its retention deadline passes, keeping
   * the row so the recurrence count and analytics survive. An answered row no
   * longer needs the original phrasing at all.
   */
  purgeExpiredFlagged(): number {
    const info = this.db
      .prepare(`
        UPDATE flagged SET question_raw = '[purged]', ip_hash = NULL
        WHERE purge_after < datetime('now') AND question_raw != '[purged]'
      `)
      .run();
    return info.changes;
  }

  // ---------------------------------------------------------------- analytics

  logMessage(log: MessageLog): number {
    const info = this.db
      .prepare(`
        INSERT INTO messages (
          session_id, turn, text_hash, text_length, lang, script, matched_faq_id,
          intent_id, score, band, fallback_layer, rule_kind, tier, llm_fired,
          polish_rejected, cache_hit, latency_ms
        ) VALUES (
          @session_id, @turn, @text_hash, @text_length, @lang, @script, @matched_faq_id,
          @intent_id, @score, @band, @fallback_layer, @rule_kind, @tier, @llm_fired,
          @polish_rejected, @cache_hit, @latency_ms
        )
      `)
      .run({
        session_id: log.sessionId,
        turn: log.turn,
        text_hash: log.textHash,
        text_length: log.textLength,
        lang: log.lang,
        script: log.script,
        matched_faq_id: log.matchedFaqId,
        intent_id: log.intentId,
        score: log.score,
        band: log.band,
        fallback_layer: log.fallbackLayer,
        rule_kind: log.ruleKind,
        tier: log.tier,
        llm_fired: log.llmFired ? 1 : 0,
        polish_rejected: log.polishRejected ? 1 : 0,
        cache_hit: log.cacheHit ? 1 : 0,
        latency_ms: log.latencyMs,
      });
    return Number(info.lastInsertRowid);
  }

  recordFeedback(messageId: number, rating: 1 | -1): void {
    this.db
      .prepare(`INSERT INTO feedback (message_id, rating) VALUES (?, ?)`)
      .run(messageId, rating);
  }

  analytics(sinceIso?: string): Analytics {
    const since = sinceIso ?? '1970-01-01';
    const g = <T>(sql: string, ...p: unknown[]): T[] =>
      this.db.prepare(sql).all(...p) as T[];

    const total = (
      this.db
        .prepare(`SELECT COUNT(*) n FROM messages WHERE created_at >= ?`)
        .get(since) as { n: number }
    ).n;

    const bucket = (rows: Array<{ k: string | null; n: number }>): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const r of rows) out[r.k ?? 'none'] = r.n;
      return out;
    };

    const byBand = bucket(
      g<{ k: string; n: number }>(
        `SELECT band k, COUNT(*) n FROM messages WHERE created_at >= ? GROUP BY band`,
        since,
      ),
    );
    const byTier = bucket(
      g<{ k: string; n: number }>(
        `SELECT tier k, COUNT(*) n FROM messages WHERE created_at >= ? GROUP BY tier`,
        since,
      ),
    );
    const byLang = bucket(
      g<{ k: string; n: number }>(
        `SELECT lang k, COUNT(*) n FROM messages WHERE created_at >= ? GROUP BY lang`,
        since,
      ),
    );
    const fallbackByLayer = bucket(
      g<{ k: string; n: number }>(
        `SELECT CAST(fallback_layer AS TEXT) k, COUNT(*) n FROM messages
         WHERE created_at >= ? AND fallback_layer > 0 GROUP BY fallback_layer`,
        since,
      ),
    );

    const byIntent = g<Analytics['byIntent'][number]>(
      `SELECT
         m.intent_id AS intentId,
         COUNT(*) AS asked,
         SUM(CASE WHEN m.band = 'confident' THEN 1 ELSE 0 END) AS confident,
         SUM(CASE WHEN m.band = 'miss' THEN 1 ELSE 0 END) AS missed,
         SUM(CASE WHEN m.rule_kind IS NOT NULL THEN 1 ELSE 0 END) AS ruleRouted,
         COALESCE(SUM(CASE WHEN f.rating = 1 THEN 1 ELSE 0 END), 0) AS helpful,
         COALESCE(SUM(CASE WHEN f.rating = -1 THEN 1 ELSE 0 END), 0) AS notHelpful
       FROM messages m
       LEFT JOIN feedback f ON f.message_id = m.id
       WHERE m.created_at >= ? AND m.intent_id IS NOT NULL
       GROUP BY m.intent_id
       ORDER BY asked DESC`,
      since,
    );

    const topFlagged = g<Analytics['topFlagged'][number]>(
      `SELECT reference_id AS referenceId, question_raw AS question, occurrences
       FROM flagged WHERE status = 'new' ORDER BY occurrences DESC LIMIT 10`,
    );

    const sums = this.db
      .prepare(`
        SELECT
          COALESCE(SUM(llm_fired), 0) AS llmCalls,
          COALESCE(SUM(polish_rejected), 0) AS polishRejections,
          COALESCE(AVG(cache_hit), 0) AS cacheHitRate
        FROM messages WHERE created_at >= ?
      `)
      .get(since) as { llmCalls: number; polishRejections: number; cacheHitRate: number };

    const latencies = g<{ latency_ms: number }>(
      `SELECT latency_ms FROM messages WHERE created_at >= ? ORDER BY latency_ms`,
      since,
    ).map((r) => r.latency_ms);
    const at = (q: number): number =>
      latencies.length === 0 ? 0 : (latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * q))] ?? 0);

    return {
      totalMessages: total,
      byBand,
      byTier,
      byLang,
      byIntent,
      fallbackByLayer,
      topFlagged,
      llmCalls: sums.llmCalls,
      polishRejections: sums.polishRejections,
      cacheHitRate: sums.cacheHitRate,
      medianLatencyMs: at(0.5),
      p95LatencyMs: at(0.95),
    };
  }

  // -------------------------------------------------------------------- cache

  getCachedResult(queryHash: string): CachedResult | null {
    const r = this.db
      .prepare(`SELECT faq_id, band, score, candidates FROM query_cache WHERE query_hash = ?`)
      .get(queryHash) as
      | { faq_id: string | null; band: string; score: number; candidates: string }
      | undefined;
    if (!r) return null;
    this.db
      .prepare(`UPDATE query_cache SET hits = hits + 1, last_hit = datetime('now') WHERE query_hash = ?`)
      .run(queryHash);
    return {
      faqId: r.faq_id,
      band: r.band as CachedResult['band'],
      score: r.score,
      candidates: parseJson(r.candidates, [] as CachedResult['candidates']),
    };
  }

  putCachedResult(queryHash: string, result: CachedResult): void {
    this.db
      .prepare(`
        INSERT INTO query_cache (query_hash, faq_id, band, score, candidates)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(query_hash) DO UPDATE SET faq_id = excluded.faq_id,
          band = excluded.band, score = excluded.score, candidates = excluded.candidates
      `)
      .run(queryHash, result.faqId, result.band, result.score, JSON.stringify(result.candidates));
  }

  /** Called whenever the knowledge base changes, or a cached answer goes stale. */
  clearResultCache(): void {
    this.db.prepare(`DELETE FROM query_cache`).run();
  }

  getCachedVector(queryHash: string): Float32Array | null {
    const r = this.db
      .prepare(`SELECT vector FROM vector_cache WHERE query_hash = ?`)
      .get(queryHash) as { vector: Buffer } | undefined;
    return r ? fromBlob(r.vector) : null;
  }

  putCachedVector(queryHash: string, model: string, vector: Float32Array): void {
    this.db
      .prepare(`
        INSERT INTO vector_cache (query_hash, model, dim, vector) VALUES (?, ?, ?, ?)
        ON CONFLICT(query_hash) DO NOTHING
      `)
      .run(queryHash, model, vector.length, toBlob(vector));
  }

  getPolished(faqId: string, lang: Lang): string | null {
    const r = this.db
      .prepare(`SELECT polished_text FROM polish_cache WHERE faq_id = ? AND lang = ?`)
      .get(faqId, lang) as { polished_text: string } | undefined;
    return r?.polished_text ?? null;
  }

  putPolished(faqId: string, lang: Lang, text: string, verified: boolean): void {
    this.db
      .prepare(`
        INSERT INTO polish_cache (faq_id, lang, polished_text, verified) VALUES (?, ?, ?, ?)
        ON CONFLICT(faq_id, lang) DO UPDATE SET polished_text = excluded.polished_text,
          verified = excluded.verified, created_at = datetime('now')
      `)
      .run(faqId, lang, text, verified ? 1 : 0);
  }

  clearPolishCache(faqId?: string): void {
    if (faqId) this.db.prepare(`DELETE FROM polish_cache WHERE faq_id = ?`).run(faqId);
    else this.db.prepare(`DELETE FROM polish_cache`).run();
  }

  // --------------------------------------------------------------------- auth

  findAdmin(username: string): AdminRecord | null {
    const r = this.db
      .prepare(`SELECT id, username, password_hash, role FROM admins WHERE username = ?`)
      .get(username) as
      | { id: number; username: string; password_hash: string; role: string }
      | undefined;
    return r
      ? { id: r.id, username: r.username, passwordHash: r.password_hash, role: r.role }
      : null;
  }

  createAdmin(username: string, passwordHash: string, role: string): number {
    const info = this.db
      .prepare(`INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)`)
      .run(username, passwordHash, role);
    return Number(info.lastInsertRowid);
  }

  touchAdminLogin(adminId: number): void {
    this.db.prepare(`UPDATE admins SET last_login = datetime('now') WHERE id = ?`).run(adminId);
  }

  createSession(id: string, adminId: number, idleMinutes: number, absoluteHours: number): void {
    this.db
      .prepare(`
        INSERT INTO sessions (id, admin_id, expires_at, absolute_expires_at)
        VALUES (?, ?, datetime('now', '+' || ? || ' minutes'), datetime('now', '+' || ? || ' hours'))
      `)
      .run(id, adminId, idleMinutes, absoluteHours);
  }

  getSession(id: string): SessionRecord | null {
    const r = this.db
      .prepare(`
        SELECT s.id, s.admin_id, a.role, a.username FROM sessions s
        JOIN admins a ON a.id = s.admin_id
        WHERE s.id = ? AND s.expires_at > datetime('now')
          AND s.absolute_expires_at > datetime('now')
      `)
      .get(id) as
      | { id: string; admin_id: number; role: string; username: string }
      | undefined;
    return r ? { id: r.id, adminId: r.admin_id, role: r.role, username: r.username } : null;
  }

  refreshSession(id: string, idleMinutes: number): void {
    this.db
      .prepare(`
        UPDATE sessions SET expires_at = datetime('now', '+' || ? || ' minutes') WHERE id = ?
      `)
      .run(idleMinutes, id);
  }

  deleteSession(id: string): void {
    this.db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
  }

  deleteSessionsForAdmin(adminId: number): void {
    this.db.prepare(`DELETE FROM sessions WHERE admin_id = ?`).run(adminId);
  }

  countRecentLoginFailures(key: string, windowMinutes: number): number {
    return (
      this.db
        .prepare(`
          SELECT COUNT(*) n FROM login_attempts
          WHERE key = ? AND created_at > datetime('now', '-' || ? || ' minutes')
        `)
        .get(key, windowMinutes) as { n: number }
    ).n;
  }

  recordLoginFailure(key: string): void {
    this.db.prepare(`INSERT INTO login_attempts (key) VALUES (?)`).run(key);
  }

  clearLoginFailures(key: string): void {
    this.db.prepare(`DELETE FROM login_attempts WHERE key = ?`).run(key);
  }

  // -------------------------------------------------------------------- quota

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  bumpQuota(kind: 'embed' | 'llm', by = 1): number {
    const col = kind === 'embed' ? 'embed_calls' : 'llm_calls';
    this.db
      .prepare(`
        INSERT INTO quota (day, ${col}) VALUES (?, ?)
        ON CONFLICT(day) DO UPDATE SET ${col} = ${col} + ?
      `)
      .run(this.today(), by, by);
    return this.getQuota(kind);
  }

  getQuota(kind: 'embed' | 'llm'): number {
    const col = kind === 'embed' ? 'embed_calls' : 'llm_calls';
    const r = this.db.prepare(`SELECT ${col} AS n FROM quota WHERE day = ?`).get(this.today()) as
      | { n: number }
      | undefined;
    return r?.n ?? 0;
  }

  getSetting(key: string): string | null {
    const r = this.db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as
      | { value: string }
      | undefined;
    return r?.value ?? null;
  }

  putSetting(key: string, value: string): void {
    this.db
      .prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `)
      .run(key, value);
  }

  close(): void {
    this.db.close();
  }
}
