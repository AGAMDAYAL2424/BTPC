import 'server-only';

/**
 * The schema, inlined as a module rather than read from a .sql file at runtime.
 *
 * Reading a sibling file needs a path, and a path built from `import.meta.dirname`
 * does not survive bundling: the value is undefined inside the server bundle,
 * and a non-literal path also widens what output file tracing has to include.
 * Inlining keeps the bundle self-contained and the path problem disappears.
 */
export const SCHEMA_SQL = `-- BRICS Delhi Traffic FAQ chatbot schema.
--
-- Two deliberate choices worth reading before editing:
--
--  1. \`messages\` stores a HASH of the question text, never the text. Citizen
--     questions on a civic service will contain phone numbers, addresses,
--     vehicle numbers and grievance details nobody asked for. The text lives
--     in exactly one table, \`flagged\`, which is the only place an admin needs
--     to read it, and which has a purge deadline on every row.
--
--  2. \`ip_hash\` is a salted hash, never a raw address, and it is never stored
--     on the same row as question text. Raw IP plus grievance text is the
--     actual privacy hazard here.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS intents (
  id                TEXT PRIMARY KEY,
  name_hi           TEXT NOT NULL,
  name_en           TEXT NOT NULL,
  description_en    TEXT NOT NULL DEFAULT '',
  out_of_scope      TEXT NOT NULL DEFAULT '[]',   -- JSON array
  display_order     INTEGER NOT NULL DEFAULT 0,
  featured          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS faqs (
  id                TEXT PRIMARY KEY,
  intent_id         TEXT NOT NULL REFERENCES intents(id),
  display_order     INTEGER NOT NULL DEFAULT 0,
  question_hi       TEXT NOT NULL,
  question_en       TEXT NOT NULL,
  answer_hi         TEXT NOT NULL,
  answer_en         TEXT NOT NULL,
  variants_hi       TEXT NOT NULL DEFAULT '[]',
  variants_en       TEXT NOT NULL DEFAULT '[]',
  variants_roman    TEXT NOT NULL DEFAULT '[]',
  keywords          TEXT NOT NULL DEFAULT '[]',
  volatility        TEXT NOT NULL DEFAULT 'stable',
  provenance        TEXT NOT NULL DEFAULT '',
  source            TEXT NOT NULL DEFAULT 'seed',
  status            TEXT NOT NULL DEFAULT 'published',
  last_updated      TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS faqs_status ON faqs(status);
CREATE INDEX IF NOT EXISTS faqs_intent ON faqs(intent_id);

CREATE TABLE IF NOT EXISTS faq_vectors (
  faq_id            TEXT PRIMARY KEY REFERENCES faqs(id) ON DELETE CASCADE,
  model             TEXT NOT NULL,
  dim               INTEGER NOT NULL,
  vector            BLOB NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The unanswered-question queue. This is the coverage-gap instrument and the
-- context-handoff channel for escalations, since a phone number cannot receive
-- a transcript.
CREATE TABLE IF NOT EXISTS flagged (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_id      TEXT NOT NULL UNIQUE,
  question_raw      TEXT NOT NULL,
  question_norm     TEXT NOT NULL,
  lang              TEXT NOT NULL,
  script            TEXT NOT NULL,
  top_candidates    TEXT NOT NULL DEFAULT '[]',
  top_score         REAL NOT NULL DEFAULT 0,
  fallback_layer    INTEGER NOT NULL DEFAULT 3,
  cluster_id        TEXT NOT NULL,
  occurrences       INTEGER NOT NULL DEFAULT 1,
  ip_hash           TEXT,
  status            TEXT NOT NULL DEFAULT 'new',
  resolved_faq_id   TEXT REFERENCES faqs(id),
  first_seen        TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen         TEXT NOT NULL DEFAULT (datetime('now')),
  purge_after       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS flagged_status ON flagged(status, occurrences DESC);
CREATE INDEX IF NOT EXISTS flagged_cluster ON flagged(cluster_id);
CREATE INDEX IF NOT EXISTS flagged_purge ON flagged(purge_after);

-- Analytics. Text is hashed, not stored; see the header note.
CREATE TABLE IF NOT EXISTS messages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id        TEXT NOT NULL,
  turn              INTEGER NOT NULL,
  text_hash         TEXT NOT NULL,
  text_length       INTEGER NOT NULL,
  lang              TEXT NOT NULL,
  script            TEXT NOT NULL,
  matched_faq_id    TEXT,
  intent_id         TEXT,
  score             REAL NOT NULL DEFAULT 0,
  band              TEXT NOT NULL,
  fallback_layer    INTEGER NOT NULL DEFAULT 0,
  rule_kind         TEXT,
  tier              TEXT NOT NULL,
  llm_fired         INTEGER NOT NULL DEFAULT 0,
  polish_rejected   INTEGER NOT NULL DEFAULT 0,
  cache_hit         INTEGER NOT NULL DEFAULT 0,
  latency_ms        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS messages_intent ON messages(intent_id);
CREATE INDEX IF NOT EXISTS messages_session ON messages(session_id);

CREATE TABLE IF NOT EXISTS feedback (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id        INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  rating            INTEGER NOT NULL,   -- 1 helpful, -1 not helpful
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A repeated question costs zero API calls. This is what keeps the free tier
-- comfortable during a traffic spike.
CREATE TABLE IF NOT EXISTS query_cache (
  query_hash        TEXT PRIMARY KEY,
  faq_id            TEXT,
  band              TEXT NOT NULL,
  score             REAL NOT NULL,
  candidates        TEXT NOT NULL DEFAULT '[]',
  hits              INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  last_hit          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vector_cache (
  query_hash        TEXT PRIMARY KEY,
  model             TEXT NOT NULL,
  dim               INTEGER NOT NULL,
  vector            BLOB NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tone is generated once per row per language, never per visitor.
CREATE TABLE IF NOT EXISTS polish_cache (
  faq_id            TEXT NOT NULL,
  lang              TEXT NOT NULL,
  polished_text     TEXT NOT NULL,
  verified          INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (faq_id, lang)
);

CREATE TABLE IF NOT EXISTS admins (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  username          TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'editor',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  last_login        TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id                TEXT PRIMARY KEY,
  admin_id          INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at        TEXT NOT NULL,          -- idle timeout
  absolute_expires_at TEXT NOT NULL,        -- hard ceiling regardless of use
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS sessions_admin ON sessions(admin_id);

CREATE TABLE IF NOT EXISTS login_attempts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  key               TEXT NOT NULL,          -- hashed ip or username
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS login_attempts_key ON login_attempts(key, created_at);

CREATE TABLE IF NOT EXISTS quota (
  day               TEXT PRIMARY KEY,       -- YYYY-MM-DD
  embed_calls       INTEGER NOT NULL DEFAULT 0,
  llm_calls         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key               TEXT PRIMARY KEY,
  value             TEXT NOT NULL
);
`;
