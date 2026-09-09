'use client';

import { useActionState } from 'react';
import { editAnswerAction, setFaqStatusAction } from '../actions';

interface Row {
  id: string;
  intentName: string;
  questionEn: string;
  questionHi: string;
  answerEn: string;
  answerHi: string;
  status: string;
  source: string;
  volatility: string;
  lastUpdated: string;
}

export default function FaqRow({ faq }: { faq: Row }) {
  const [editState, edit, editing] = useActionState(editAnswerAction, null);
  const [statusState, setStatus, settingStatus] = useActionState(setFaqStatusAction, null);

  return (
    <details className="queue-item">
      <summary className="queue-head">
        <span className="queue-q">{faq.questionEn}</span>
        <span className="queue-meta">
          <span className={`badge badge-${faq.status}`}>{faq.status}</span>
          {faq.source === 'admin' ? <span className="badge badge-admin">staff</span> : null}
          {faq.volatility === 'volatile' ? (
            <span className="badge badge-draft">volatile</span>
          ) : null}
          <span>{faq.id}</span>
          <span>{faq.lastUpdated}</span>
        </span>
      </summary>

      <div className="queue-body">
        <p className="intent-note" style={{ marginBottom: 12 }}>
          Topic: {faq.intentName}
        </p>
        <p lang="hi" style={{ fontWeight: 500, marginBottom: 12 }}>
          {faq.questionHi}
        </p>

        {editState?.error ? (
          <div className="alert alert-error" role="alert">
            <span>{editState.error}</span>
          </div>
        ) : null}
        {editState?.ok ? (
          <div className="alert alert-ok" role="status">
            <span>{editState.message}</span>
          </div>
        ) : null}
        {statusState?.error ? (
          <div className="alert alert-error" role="alert">
            <span>{statusState.error}</span>
          </div>
        ) : null}
        {statusState?.ok ? (
          <div className="alert alert-ok" role="status">
            <span>{statusState.message}</span>
          </div>
        ) : null}

        <form action={edit}>
          <input type="hidden" name="faqId" value={faq.id} />
          <div className="field">
            <label htmlFor={`e-hi-${faq.id}`}>Answer (Hindi)</label>
            <textarea
              id={`e-hi-${faq.id}`}
              name="answerHi"
              lang="hi"
              required
              maxLength={2000}
              defaultValue={faq.answerHi}
            />
          </div>
          <div className="field">
            <label htmlFor={`e-en-${faq.id}`}>Answer (English)</label>
            <textarea
              id={`e-en-${faq.id}`}
              name="answerEn"
              required
              maxLength={2000}
              defaultValue={faq.answerEn}
            />
          </div>
          <div className="actions">
            <button type="submit" className="btn" disabled={editing}>
              {editing ? 'Saving' : 'Save answer'}
            </button>
          </div>
        </form>

        <form action={setStatus} style={{ marginTop: 14 }}>
          <input type="hidden" name="faqId" value={faq.id} />
          <div className="actions">
            {faq.status === 'published' ? (
              <button
                type="submit"
                name="status"
                value="retired"
                className="btn-danger"
                disabled={settingStatus}
              >
                Retire this entry
              </button>
            ) : (
              <button
                type="submit"
                name="status"
                value="published"
                className="btn-quiet"
                disabled={settingStatus}
              >
                Publish this entry
              </button>
            )}
            <span className="field-hint">
              A retired entry stops answering immediately and leaves the browse list.
            </span>
          </div>
        </form>
      </div>
    </details>
  );
}
