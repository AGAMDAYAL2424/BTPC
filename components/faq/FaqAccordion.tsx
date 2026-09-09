import type { Faq, Lang } from '../../lib/shared/types';
import { INTENTS } from '../../lib/shared/intents';
import { t } from '../../lib/shared/strings';

/**
 * The whole advisory, server-rendered as static HTML.
 *
 * This exists because a chatbot whose content lives only inside a client
 * island is invisible: nothing is indexable, and nothing works with JavaScript
 * disabled. The rows are fixed, so rendering all of them costs nothing and
 * gives three things at once - a search surface, a no-JS fallback, and a browse
 * path for people who would rather scan than type.
 *
 * Grouped into topic clusters rather than rendered as one 60 row list, and
 * built from <details> so it needs no JavaScript to expand.
 */
export default function FaqAccordion({ faqs, lang }: { faqs: Faq[]; lang: Lang }) {
  const s = t(lang);
  const byIntent = new Map<string, Faq[]>();
  for (const faq of faqs) {
    const list = byIntent.get(faq.intentId);
    if (list) list.push(faq);
    else byIntent.set(faq.intentId, [faq]);
  }

  return (
    <section className="browse" id="all-questions">
      <div className="browse-inner">
        <h2>{s.browseTitle}</h2>
        <p className="browse-intro">{s.browseIntro}</p>

        {INTENTS.map((intent) => {
          const rows = byIntent.get(intent.id);
          if (!rows || rows.length === 0) return null;
          return (
            <div className="browse-group" key={intent.id}>
              <h3>
                {lang === 'hi' ? intent.nameHi : intent.nameEn}
                <span className="browse-count">{rows.length}</span>
              </h3>
              {rows.map((faq) => (
                <details className="qa" key={faq.id}>
                  <summary>{lang === 'hi' ? faq.questionHi : faq.questionEn}</summary>
                  <div className="qa-answer">
                    {lang === 'hi' ? faq.answerHi : faq.answerEn}
                    <p className="qa-meta">
                      {s.lastUpdatedLabel} {faq.lastUpdated}
                      {' · '}
                      {s.sourceLabel}: {faq.provenance}
                    </p>
                    {faq.volatility === 'volatile' ? (
                      <p className="notice">{s.volatileNotice}</p>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
