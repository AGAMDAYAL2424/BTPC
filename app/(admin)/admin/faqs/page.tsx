import { redirect } from 'next/navigation';
import { currentSession } from '../../../../lib/server/auth/session';
import { getRepo } from '../../../../lib/server/db';
import { INTENTS } from '../../../../lib/shared/intents';
import AdminShell from '../AdminShell';
import FaqRow from './FaqRow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The answer library.
 *
 * Retiring an entry is as important as adding one: an entry that no longer
 * fires is a maintenance cost, and an entry whose facts have gone stale is
 * worse than no entry at all.
 */
export default async function FaqsPage() {
  const session = await currentSession();
  if (!session) redirect('/admin/login');

  const faqs = getRepo().listAllFaqs();
  const published = faqs.filter((f) => f.status === 'published').length;
  const fromAdmin = faqs.filter((f) => f.source === 'admin').length;
  const volatile = faqs.filter((f) => f.volatility === 'volatile').length;

  const byIntent = new Map(INTENTS.map((i) => [i.id, i.nameEn]));

  return (
    <AdminShell current="faqs" username={session.username}>
      <h2 className="admin-h2">Answer library</h2>
      <p className="admin-lede">
        Every entry the bot can answer from. The Hindi wording of the original 60 is the
        approved advisory text and is served exactly as written; edit it only when the
        department issues a correction.
      </p>

      <div className="stats">
        <div className="stat">
          <p className="stat-label">Published</p>
          <p className="stat-value">{published}</p>
          <p className="stat-note">of {faqs.length} total</p>
        </div>
        <div className="stat">
          <p className="stat-label">Written by staff</p>
          <p className="stat-value">{fromAdmin}</p>
          <p className="stat-note">added since launch</p>
        </div>
        <div className="stat">
          <p className="stat-label">Marked volatile</p>
          <p className="stat-value">{volatile}</p>
          <p className="stat-note">carry a freshness caveat</p>
        </div>
      </div>

      <div className="admin-panel">
        {faqs.map((faq) => (
          <FaqRow
            key={faq.id}
            faq={{
              id: faq.id,
              intentName: byIntent.get(faq.intentId) ?? faq.intentId,
              questionEn: faq.questionEn,
              questionHi: faq.questionHi,
              answerEn: faq.answerEn,
              answerHi: faq.answerHi,
              status: faq.status,
              source: faq.source,
              volatility: faq.volatility,
              lastUpdated: faq.lastUpdated,
            }}
          />
        ))}
      </div>
    </AdminShell>
  );
}
