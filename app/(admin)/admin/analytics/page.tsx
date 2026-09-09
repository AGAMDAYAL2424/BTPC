import { redirect } from 'next/navigation';
import { currentSession } from '../../../../lib/server/auth/session';
import { getRepo } from '../../../../lib/server/db';
import { INTENTS } from '../../../../lib/shared/intents';
import AdminShell from '../AdminShell';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pct(n: number, d: number): string {
  return d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`;
}

/**
 * Per-intent analytics, not aggregate.
 *
 * Aggregate numbers hide which topics are failing, which makes remediation
 * guesswork. The four columns that matter are: how often a topic is asked, how
 * often it was answered confidently, how often it fell through, and how often
 * a polished answer had to be discarded because the verifier caught drift.
 *
 * Reference bands: intent recognition of 80 to 90 percent is achievable and
 * below 70 percent signals a real problem; a fallback rate above 25 to 30
 * percent means the knowledge base is missing common questions.
 */
export default async function AnalyticsPage() {
  const session = await currentSession();
  if (!session) redirect('/admin/login');

  const repo = getRepo();
  const a = repo.analytics();
  const names = new Map(INTENTS.map((i) => [i.id, i.nameEn]));

  const confident = a.byBand.confident ?? 0;
  const ambiguous = a.byBand.ambiguous ?? 0;
  const missed = a.byBand.miss ?? 0;
  const answered = confident + ambiguous;

  return (
    <AdminShell current="analytics" username={session.username}>
      <h2 className="admin-h2">How the help desk is performing</h2>
      <p className="admin-lede">
        Question text is never stored here, only a hash and the outcome. The raw wording
        lives solely in the queue, where it is needed to write an answer, and is scrubbed
        on a retention deadline.
      </p>

      {a.totalMessages === 0 ? (
        <div className="admin-panel admin-empty">
          <p>No questions have been asked yet. Numbers will appear here once people use it.</p>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <p className="stat-label">Questions asked</p>
              <p className="stat-value">{a.totalMessages}</p>
            </div>
            <div className="stat">
              <p className="stat-label">Answered</p>
              <p className="stat-value">{pct(answered, a.totalMessages)}</p>
              <p className="stat-note">{answered} of {a.totalMessages}</p>
            </div>
            <div className="stat">
              <p className="stat-label">Fell through</p>
              <p className="stat-value">{pct(missed, a.totalMessages)}</p>
              <p className="stat-note">above 25 to 30% means gaps</p>
            </div>
            <div className="stat">
              <p className="stat-label">Cache hits</p>
              <p className="stat-value">{Math.round(a.cacheHitRate * 100)}%</p>
              <p className="stat-note">cost no API calls</p>
            </div>
            <div className="stat">
              <p className="stat-label">Median reply</p>
              <p className="stat-value">{a.medianLatencyMs}<span style={{ fontSize: '1rem' }}>ms</span></p>
              <p className="stat-note">p95 {a.p95LatencyMs}ms, target under 2000</p>
            </div>
            <div className="stat">
              <p className="stat-label">Rewrites rejected</p>
              <p className="stat-value">{a.polishRejections}</p>
              <p className="stat-note">of {a.llmCalls} model calls</p>
            </div>
          </div>

          <div className="admin-panel">
            <h3 style={{ marginBottom: 12 }}>By topic</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Topic</th>
                    <th scope="col">Asked</th>
                    <th scope="col">Answered confidently</th>
                    <th scope="col">Fell through</th>
                    <th scope="col">Routed by rule</th>
                    <th scope="col">Helpful</th>
                    <th scope="col">Not helpful</th>
                  </tr>
                </thead>
                <tbody>
                  {a.byIntent.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No topic data yet.</td>
                    </tr>
                  ) : (
                    a.byIntent.map((row) => (
                      <tr key={row.intentId}>
                        <td>{names.get(row.intentId) ?? row.intentId}</td>
                        <td className="num">{row.asked}</td>
                        <td className="num">
                          {row.confident} · {pct(row.confident, row.asked)}
                        </td>
                        <td className="num">
                          {row.missed} · {pct(row.missed, row.asked)}
                        </td>
                        <td className="num">{row.ruleRouted}</td>
                        <td className="num">{row.helpful}</td>
                        <td className="num">{row.notHelpful}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="field-row">
            <div className="admin-panel">
              <h3 style={{ marginBottom: 12 }}>Language</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <tbody>
                    {Object.entries(a.byLang).map(([lang, n]) => (
                      <tr key={lang}>
                        <td>{lang === 'hi' ? 'Hindi' : lang === 'en' ? 'English' : lang}</td>
                        <td className="num">{n}</td>
                        <td className="num">{pct(n, a.totalMessages)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-panel">
              <h3 style={{ marginBottom: 12 }}>How it was served</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <tbody>
                    {Object.entries(a.byTier).map(([tier, n]) => (
                      <tr key={tier}>
                        <td>
                          {tier === 'ai'
                            ? 'With the model'
                            : tier === 'deterministic'
                              ? 'Deterministic engine'
                              : 'Throttled'}
                        </td>
                        <td className="num">{n}</td>
                        <td className="num">{pct(n, a.totalMessages)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {a.topFlagged.length > 0 ? (
            <div className="admin-panel">
              <h3 style={{ marginBottom: 12 }}>Most asked unanswered questions</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <tbody>
                    {a.topFlagged.map((row) => (
                      <tr key={row.referenceId}>
                        <td>{row.question}</td>
                        <td className="num">
                          <span className="badge badge-count">{row.occurrences}x</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </AdminShell>
  );
}
