# BRICS India 2026 · Delhi Traffic Police Help Desk

A bilingual (Hindi / English) FAQ chatbot for the BRICS Summit 2026, answering
from the 60 approved Q&A pairs in `FAQs.docx`.

It is a **retrieval** system, not a generative one. The answers are an official
police advisory, so the maths decides *which* answer the citizen wants and the
text itself is served from the document. A model that paraphrased "keep a 60 to
90 minute buffer" into "leave a bit early", or invented a helpline number,
would be a liability.

---

## Quick start

```bash
npm install
npm run seed:extract     # FAQs.docx -> data/source-hi.json (verbatim)
npm run seed:build       # + data/enrichment.ts -> data/faqs.seed.json
npm run db:init          # create the database and load the knowledge base
npm run dev              # http://localhost:3000
```

`npm run db:reset` starts the database over: knowledge base reloaded, queue and
analytics cleared, staff accounts kept.

Create a staff account for the admin portal:

```bash
npm run admin:create -- yourname 'a-strong-passphrase-12+'
```

Then sign in at `/admin`.

**No API key is needed.** The bot works fully without one; see below.

---

## Getting the free AI key

One free key from Google AI Studio covers both jobs the model does.

1. Go to **https://aistudio.google.com/apikey**
2. Sign in with any Google account
3. *Create API key*, copy it
4. Put it in `.env.local`:

```
GEMINI_API_KEY=your-key-here
```

5. Embed the knowledge base and re-fit the scoring weights:

```bash
npm run seed:embed
npm run eval -- --tune
```

Models used: `gemini-embedding-001` for embeddings and `gemini-2.5-flash-lite`
for candidate arbitration and tone. Both are on the free tier, and the four
cache layers keep real usage far below its limits.

Alternatives behind the same interface: **Groq** (`console.groq.com/keys`, very
fast, no embeddings), **OpenRouter** (`openrouter.ai/keys`, `:free` models),
**Cohere** (`dashboard.cohere.com/api-keys`, multilingual embeddings).

### What changes without a key

Nothing breaks. The bot serves the deterministic engine and answers verbatim.
Measured on the gold set with **no embeddings at all**: 86.7% top-1 accuracy,
98.3% top-3 recall, zero out-of-scope questions answered confidently. The key
adds the semantic channel, tie-break arbitration, and conversational tone.

---

## How a question is answered

```
question (any script)
  ↓  normalise      NFC · case · punctuation · Devanagari digits
  ↓  detect script  Devanagari ratio -> hi | en | hinglish
  ↓  transliterate  Devanagari -> Latin, so कया मेट्रो चलेगी meets "kya metro chalegi"
  ↓
  ├─ EMERGENCY rule ────────→ 112, plus the approved guidance. Never reaches a model.
  ├─ PERSONAL RECORD rule ──→ honest refusal + the authenticated channel
  ├─ HUMAN REQUEST rule ────→ 1095, with a summary to read out
  ↓
  ├─ cache hit ─────────────→ answered with zero API calls
  ↓
  four scoring channels, all absolute
  ├─ semantic   cosine over gemini-embedding-001          weight 0.34
  ├─ lexical    BM25, hand-rolled, saturating             weight 0.29
  ├─ phonetic   Indic folding + Double Metaphone          weight 0.12
  └─ keyword    curated bilingual synonym groups          weight 0.25
  ↓
  band by fused score, margin over runner-up, and absolute evidence
  ├─ confident  → answer
  ├─ ambiguous  → answer + "did you mean" chips, or ask which topic
  └─ miss       → honest fallback + reference number + flagged to /admin
```

### Why the phonetic layer exists

Transliteration and typing disagree systematically. Sanscript renders `घर` as
`ghara` and `निकलना` as `nikalana`, but people type `ghar` and `nikalna`: Hindi
deletes the inherent short vowel and ITRANS keeps it. Dropping every
non-initial vowel collapses both onto one consonant skeleton. That single trick
is what makes all of these reach the same row:

| typed | folds to | | typed | folds to |
|---|---|---|---|---|
| `ghara` / `ghar` | `gr` | | `bamda` / `band` | `bNd` |
| `nikalana` / `nikalna` | `nklN` | | `metro` / `mtro` | `mtr` |
| `kitani` / `kitni` | `ktN` | | `zaroori` / `jaruri` | `jrr` |
| `chahie` / `chahiye` | `ch` | | `delhi` / `dilli` | `dl` |

---

## The model's three jobs, and what it cannot do

1. **Embed the query.** One short call, cached.
2. **Break a tie.** Given the top five *questions* (never the answers), return
   an id or nothing. It can only return an identifier, so it cannot introduce
   content. This is also the defence against prompt injection: "ignore previous
   instructions" has nothing to steer, because there is no path from model
   output to answer text.
3. **Polish tone.** Off by default for any answer carrying a number, date or
   helpline, which is most of the corpus. Generated once per row per language
   and cached, never per visitor, at temperature zero.

Every polished string is then verified mechanically, and any failure serves the
canonical text instead:

- every digit in the original still present, and no new digit introduced
- no invented links
- length within 0.6 to 1.6 times the original
- Hindi answers still predominantly Devanagari, English answers not
- no model preamble, no em-dashes

Rejections are counted and shown as a per-topic rate in the admin analytics.

---

## Tiered serving

A per-visitor AI budget that **degrades quality instead of refusing service**.

| Tier | Entered when | Behaviour |
|---|---|---|
| AI-assisted | within budget, clean traffic | full pipeline |
| Deterministic | budget spent · daily quota reached · no key · spam suspected | BM25 + phonetic + keyword, answers verbatim. Fully functional |
| Throttled | genuine flood only | `429` with `Retry-After` |

Spam scoring combines burst rate, near-identical repeats, gibberish (character
entropy and vowel ratio, only when nothing matched), degenerate input and
length abuse. A false positive costs a little answer polish, not access to
public safety information, which is why the thresholds lean permissive.

Four cache layers make the free tier comfortable: query→result, query→vector,
(row, language)→polished text, and an in-memory LRU in front of hot rows.

---

## The admin loop

`/admin` is the coverage-gap instrument and the escalation handoff channel.

1. A question the advisory does not cover falls through and is **flagged**.
2. Near-identical questions are **clustered by content words**, so one question
   asked forty times is one row with a count of forty.
3. Staff write both answers and publish. The row is embedded, the index is
   rebuilt, and cached answers are dropped.
4. The **next question is answered**, with no restart. The original phrasing
   that failed becomes a matching variant.

Rows are labelled `no match` (nothing came close) or `unclear topic` (the bot
had to ask which topic was meant). Both are coverage gaps; the first is the
clearer case to write an answer for.

A high recurrence count is the signal worth acting on. Writing an entry for
every one-off question grows the knowledge base with rows that never fire
again, which is maintenance cost with no benefit. Honest fallback is the better
outcome for genuinely rare questions, so the queue also has a **dismiss**
action and the library has a **retire** action.

---

## Two safety boundaries that bypass retrieval

Nearest-neighbour search over 60 rows always returns something plausible, so
these are deterministic rules that run **before** scoring and before any model
call. Matching is exact-term, never fuzzy: spelling tolerance is the last thing
you want deciding whether a message is an emergency.

**Emergency → 112.** Acute distress fires immediately. An incident word plus an
occurrence marker fires too, unless the message is phrased as a question. That
distinction is what separates `accident ho gaya hai` (a report) from
`accident ho jaye to kya kare` (asking about the rules), and it is why the
informational rows about accidents and ambulances remain reachable.

**Personal records → refused.** Challans, towed vehicles, pass approvals and
FIR status belong to an account this bot cannot see. These get an honest
boundary disclosure and a route to the authenticated channel, never a
similarity match into a generic row.

---

## Verification

```bash
npm test                 # 109 unit and integration tests
npm run eval             # retrieval accuracy against the gold set
npm run eval -- --tune   # re-fit weights and thresholds
npm run eval -- --failures
npm run lint:content     # em-dashes, filler, and numbers lost in translation
npm run typecheck
npm run build
```

Security checks worth re-running after any change to the build:

```bash
npm run build
grep -rl GEMINI_API_KEY .next/static/ || echo 'key absent from client bundle'
curl -sI localhost:3000/hi | grep -i content-security-policy
```

`npm run eval` fails the command if top-1 drops below 80% or any out-of-scope
question is answered confidently.

The gold set (`tests/eval/goldset.json`) is 180 in-scope queries, three per row
across Devanagari, English and romanised Hinglish, deliberately phrased
*differently* from the variants in the knowledge base. Reusing variant text
would measure string equality and nothing else: on variant-echoing probes this
engine scores 96%, and on the honest set it scores 86.7%. Plus 30 out-of-scope
queries that must not be answered, and 18 rule cases.

Thresholds are **fitted, not chosen**. `--tune` runs a two-stage coordinate
search: weights against ranking accuracy, then thresholds against banding.

---

## Layout

```
app/
  (public)/[lang]/     locale routes. Server-rendered; only the chat ships JS
  (admin)/admin/       queue · answer library · analytics
  api/chat             the pipeline. runtime = 'nodejs'
components/chat/       ChatIsland is the one client island
components/faq/        the full advisory as static HTML
lib/server/            every file starts `import 'server-only'`
  nlp/                 normalise · translit · phonetic · bm25 · lexicon
  retrieval/           scoring · fusion · bands
  rules/               emergency · personal records · human request
  ai/                  provider interface · gemini · guardrail
  guard/               rate limits · spam · tiers
  db/                  repository interface + SQLite adapter
data/
  source-hi.json       verbatim from FAQs.docx. Never hand-edited
  enrichment.ts        English text, variants, keywords, topic assignment
  faqs.seed.json       generated by seed:build
tests/eval/goldset.json
```

The Hindi text enters the codebase at exactly one point, `scripts/extract-docx.py`.
Re-run it if the department issues an updated document. `seed:build` refuses to
emit a seed whose English translation dropped a number the Hindi answer carried.

---

## Notable design decisions

**The advisory is also a static page.** A chatbot whose content lives only in a
client island is invisible: nothing indexable, nothing without JavaScript. All
60 rows render as a `<details>` accordion grouped by topic, which triples as an
SEO surface, a no-JS fallback, and a browse path.

**Routed locales, not a toggle.** `/hi` and `/en` each get a real `lang`
attribute, their own metadata and canonical, and somewhere for `hreflang` to
point. `/` redirects on `Accept-Language`, never on IP.

**Nine topics above the 60 rows.** "Sixty rows and a similarity score" is not
an intent architecture: per-topic analytics need more than one row per topic to
mean anything, and ambiguity that crosses a topic boundary should ask rather
than guess.

**Question text is stored in exactly one table.** Citizen questions on a civic
service contain phone numbers, addresses and vehicle numbers nobody asked for.
Analytics stores a hash and the outcome; the raw text lives only in the queue,
where it is needed to write an answer, and is scrubbed on a retention deadline.
IP addresses are salted-hashed and never written beside question text.

**Rate-limit keys are not bare IPs.** Indian mobile traffic sits behind carrier
NAT, so one address can be thousands of genuine users. The key composes a
hashed address with the user agent; a bare-address key is only the flood
backstop.

**scrypt, not bcrypt.** A deliberate deviation: bcrypt for Node needs a native
build through node-gyp, and scrypt is in the standard library and memory-hard
rather than only CPU-hard. Parameters are documented in
`lib/server/auth/password.ts`.

**One accent colour.** The BRICS logo has five; using all five as UI accents
reads as a dated government portal. They appear together only in the 4px ribbon
at the top of the page. Yellow (`#FDD314`, 1.45:1) and orange (`#F69434`,
2.28:1) never carry text.

**The locale pages render per request, not at build time.** They were static
first, which looked better on paper and was quietly broken: a CSP nonce cannot
be baked into HTML generated at build time, so the policy blocked all 22 of
Next's inline bootstrap scripts and the chat never hydrated in production. The
alternative was relaxing `script-src` to `'unsafe-inline'`, which gives up most
of the value of a policy on the one page that renders citizen-submitted text.
Hashed JS, CSS and font assets still cache on a CDN; only the HTML is
per-request, and HTML carrying a nonce must not be shared-cached anyway.

**`#0EA5E9` is not used for anything with white text.** Sky-500 with white
measures 2.77:1, which fails AA for body text *and* fails the 3:1 floor for
large text and UI components. Primary is `#0369A1` at 5.93:1. Every colour in
`app/globals.css` carries its measured ratio in a comment.

---

## Out of scope

Live road-closure data (no feed exists; rows marked volatile point at the
official advisory and carry a freshness caveat), authenticated citizen services,
voice input, and WhatsApp or SMS channels.

## Before going live

- Set `SESSION_SECRET` and `NEXT_PUBLIC_SITE_URL` in the production environment.
- **Have the English translations reviewed by the department.** The Hindi is the
  approved text; the English was written for this build and has not been through
  departmental sign-off.
- Triage the queue daily during the summit, and re-check rows marked volatile.
- Plan the decommission. A BRICS 2026 bot still answering in 2027 is stale
  knowledge by construction.
