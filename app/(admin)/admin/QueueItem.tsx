'use client';

import { useActionState, useEffect, useRef } from 'react';
import { dismissFlaggedAction, publishAnswerAction } from './actions';

interface Row {
  id: number;
  referenceId: string;
  questionRaw: string;
  lang: string;
  script: string;
  occurrences: number;
  topScore: number;
  fallbackLayer: number;
  firstSeen: string;
  lastSeen: string;
  topCandidates: Array<{ faqId: string; score: number; question: string }>;
}

/**
 * One queue row, collapsed until opened, with the answer editor inside.
 *
 * Both answer languages are required. A published entry with only one of them
 * would serve an empty bubble to half the audience, which is worse than the
 * question staying in the queue.
 */
export default function QueueItem({
  row,
  intents,
}: {
  row: Row;
  intents: Array<{ id: string; name: string }>;
}) {
  const [publishState, publish, publishing] = useActionState(publishAnswerAction, null);
  const [dismissState, dismiss, dismissing] = useActionState(dismissFlaggedAction, null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (publishState?.error) alertRef.current?.focus();
  }, [publishState]);

  const resolved = publishState?.ok || dismissState?.ok;

  return (
    <details className="queue-item" open={Boolean(publishState?.error)}>
      <summary className="queue-head">
        <span className="queue-q" lang={row.lang}>
          {row.questionRaw}
        </span>
        <span className="queue-meta">
          <span className="badge badge-count">asked {row.occurrences}x</span>
          {/* Layer 1 means the bot had to ask which topic was meant; layer 3
              means nothing came close at all. Both are coverage gaps, but a
              layer 3 row is the more clear-cut one to write an answer for. */}
          <span className={`badge ${row.fallbackLayer >= 3 ? 'badge-draft' : 'badge-retired'}`}>
            {row.fallbackLayer >= 3 ? 'no match' : 'unclear topic'}
          </span>
          <span>best match {row.topScore.toFixed(2)}</span>
          <span>{row.script}</span>
          <span>{row.referenceId}</span>
        </span>
      </summary>

      <div className="queue-body">
        {resolved ? (
          <div className="alert alert-ok" role="status">
            <span>{publishState?.message ?? dismissState?.message}</span>
          </div>
        ) : (
          <>
            {publishState?.error ? (
              <div className="alert alert-error" role="alert" tabIndex={-1} ref={alertRef}>
                <span>{publishState.error}</span>
              </div>
            ) : null}
            {dismissState?.error ? (
              <div className="alert alert-error" role="alert">
                <span>{dismissState.error}</span>
              </div>
            ) : null}

            <div className="candidates">
              <p style={{ fontWeight: 500, marginBottom: 4 }}>
                What the bot nearly matched
              </p>
              <ul>
                {row.topCandidates.length === 0 ? (
                  <li>Nothing came close.</li>
                ) : (
                  row.topCandidates.map((c) => (
                    <li key={c.faqId}>
                      {c.score.toFixed(2)} · {c.faqId} · {c.question}
                    </li>
                  ))
                )}
              </ul>
              <p className="intent-note">
                First asked {row.firstSeen}. Last asked {row.lastSeen}.
              </p>
            </div>

            <form action={publish}>
              <input type="hidden" name="flaggedId" value={row.id} />

              <div className="field-row">
                <div className="field">
                  <label htmlFor={`intent-${row.id}`}>Topic</label>
                  <select id={`intent-${row.id}`} name="intentId" required defaultValue="">
                    <option value="" disabled>
                      Choose a topic
                    </option>
                    {intents.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                  <span className="field-hint">
                    Groups the entry for analytics and for the browse list.
                  </span>
                </div>

                <div className="field">
                  <label htmlFor={`vol-${row.id}`}>Does this change day to day?</label>
                  <select id={`vol-${row.id}`} name="volatility" defaultValue="stable">
                    <option value="stable">No, it is a standing rule</option>
                    <option value="volatile">Yes, show a freshness caveat</option>
                  </select>
                  <span className="field-hint">
                    Anything tied to a specific date or a live closure should be volatile.
                  </span>
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor={`qhi-${row.id}`}>Question (Hindi)</label>
                  <input
                    id={`qhi-${row.id}`}
                    name="questionHi"
                    lang="hi"
                    required
                    maxLength={300}
                    defaultValue={row.lang === 'hi' ? row.questionRaw : ''}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`qen-${row.id}`}>Question (English)</label>
                  <input
                    id={`qen-${row.id}`}
                    name="questionEn"
                    required
                    maxLength={300}
                    defaultValue={row.lang === 'en' ? row.questionRaw : ''}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor={`ahi-${row.id}`}>Answer (Hindi)</label>
                <textarea id={`ahi-${row.id}`} name="answerHi" lang="hi" required maxLength={2000} />
                <span className="field-hint">
                  Match the advisory&apos;s voice. Use a plain hyphen, never an em-dash.
                </span>
              </div>

              <div className="field">
                <label htmlFor={`aen-${row.id}`}>Answer (English)</label>
                <textarea id={`aen-${row.id}`} name="answerEn" required maxLength={2000} />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor={`kw-${row.id}`}>Keywords</label>
                  <input
                    id={`kw-${row.id}`}
                    name="keywords"
                    maxLength={500}
                    placeholder="parking, pragati maidan, bhairon marg"
                  />
                  <span className="field-hint">
                    Comma separated, in either script. These drive keyword matching.
                  </span>
                </div>
                <div className="field">
                  <label htmlFor={`prov-${row.id}`}>Source</label>
                  <input
                    id={`prov-${row.id}`}
                    name="provenance"
                    maxLength={200}
                    placeholder="Traffic advisory dated ..."
                  />
                  <span className="field-hint">
                    Shown under the answer so citizens can see where it came from.
                  </span>
                </div>
              </div>

              <div className="actions">
                <button type="submit" className="btn" disabled={publishing}>
                  {publishing ? 'Publishing' : 'Publish answer'}
                </button>
              </div>
            </form>

            <form action={dismiss} style={{ marginTop: 12 }}>
              <input type="hidden" name="flaggedId" value={row.id} />
              <button type="submit" className="btn-danger" disabled={dismissing}>
                {dismissing ? 'Dismissing' : 'Dismiss without answering'}
              </button>
            </form>
          </>
        )}
      </div>
    </details>
  );
}
