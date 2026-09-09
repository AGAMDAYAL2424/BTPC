import { redirect } from 'next/navigation';
import { currentSession } from '../../../lib/server/auth/session';
import { getRepo } from '../../../lib/server/db';
import { INTENTS } from '../../../lib/shared/intents';
import AdminShell from './AdminShell';
import QueueItem from './QueueItem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The unanswered-question queue.
 *
 * This is the coverage-gap instrument: the proportion of questions landing here
 * is what tells you whether the knowledge base still matches what the public is
 * asking. Rows are clustered by content words, so one question asked forty
 * times is one row with a count of forty rather than forty rows.
 *
 * A high recurrence count is the signal worth acting on. Writing a new answer
 * for every one-off question grows the knowledge base with entries that never
 * fire again, which is a maintenance cost with no benefit; honest fallback is
 * the better outcome for genuinely rare questions.
 */
export default async function QueuePage() {
  const session = await currentSession();
  if (!session) redirect('/admin/login');

  const repo = getRepo();
  const queue = repo.listFlagged('new', 100);
  const answered = repo.listFlagged('answered', 5);
  const faqs = repo.listAllFaqs();

  const recurring = queue.filter((q) => q.occurrences >= 3).length;
  const totalAsks = queue.reduce((sum, q) => sum + q.occurrences, 0);

  return (
    <AdminShell current="queue" username={session.username}>
      <h2 className="admin-h2">Unanswered questions</h2>
      <p className="admin-lede">
        Questions the bot could not answer from the advisory. Near-identical questions are
        grouped, so the count shows how many people asked the same thing. Prioritise the
        high counts: a question asked once is usually better served by honest fallback than
        by a new entry that never fires again.
      </p>

      <div className="stats">
        <div className="stat">
          <p className="stat-label">Waiting</p>
          <p className="stat-value">{queue.length}</p>
          <p className="stat-note">distinct questions</p>
        </div>
        <div className="stat">
          <p className="stat-label">Total asks</p>
          <p className="stat-value">{totalAsks}</p>
          <p className="stat-note">across all waiting rows</p>
        </div>
        <div className="stat">
          <p className="stat-label">Asked 3 or more times</p>
          <p className="stat-value">{recurring}</p>
          <p className="stat-note">worth writing an answer for</p>
        </div>
        <div className="stat">
          <p className="stat-label">Answered</p>
          <p className="stat-value">{answered.length > 0 ? answered.length : 0}</p>
          <p className="stat-note">recently resolved</p>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="admin-panel admin-empty">
          <p>
            Nothing waiting. Every question asked so far was answered from the advisory.
          </p>
        </div>
      ) : (
        queue.map((row) => (
          <QueueItem
            key={row.id}
            row={{
              id: row.id,
              referenceId: row.referenceId,
              questionRaw: row.questionRaw,
              lang: row.lang,
              script: row.script,
              occurrences: row.occurrences,
              topScore: row.topScore,
              fallbackLayer: row.fallbackLayer,
              firstSeen: row.firstSeen,
              lastSeen: row.lastSeen,
              topCandidates: row.topCandidates.map((c) => ({
                faqId: c.faqId,
                score: c.score,
                question: faqs.find((f) => f.id === c.faqId)?.questionEn ?? c.faqId,
              })),
            }}
            intents={INTENTS.map((i) => ({ id: i.id, name: i.nameEn }))}
          />
        ))
      )}
    </AdminShell>
  );
}
