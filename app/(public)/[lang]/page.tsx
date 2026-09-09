import Image from 'next/image';
import { notFound } from 'next/navigation';
import BricsRibbon from '../../../components/BricsRibbon';
import LangSwitch from '../../../components/LangSwitch';
import ChatIsland from '../../../components/chat/ChatIsland';
import FaqAccordion from '../../../components/faq/FaqAccordion';
import { FEATURED_INTENTS } from '../../../lib/shared/intents';
import { isLang, t } from '../../../lib/shared/strings';
import type { Suggestion } from '../../../lib/shared/reply';
import { getIndex } from '../../../lib/server/retrieval/store';

// The retrieval index and the database are native/filesystem bound, so this
// page renders on the Node runtime, not the edge.
export const runtime = 'nodejs';

/**
 * Rendered per request rather than prerendered, so the content security policy
 * can carry a per-request nonce.
 *
 * This was static first, which looked better on paper and was quietly broken:
 * a nonce cannot be baked into HTML generated at build time, so the policy
 * blocked all 22 of Next's inline bootstrap scripts and the chat never
 * hydrated in production. The alternative was relaxing script-src to
 * 'unsafe-inline', which gives up most of the value of having a policy on the
 * one page that renders citizen-submitted text.
 *
 * The cost is small and the benefit is kept: hashed JS, CSS and font assets
 * still cache on a CDN, and rendering this page is a SQLite read plus a React
 * pass over fixed content. HTML carrying a nonce must not be shared-cached
 * anyway, since a reused nonce is no nonce at all.
 */
export const dynamic = 'force-dynamic';

/**
 * Server Component. The header, intro, browsable advisory and footer are all
 * static HTML; only the chat transcript and composer ship JavaScript.
 */
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const s = t(lang);

  const index = getIndex();
  const faqs = index.listFaqs();

  // Opening chips are the real top-level intents. A chip that leads nowhere is
  // the failure the skill names: suggestions must be actual capabilities.
  const openingChips: Suggestion[] = FEATURED_INTENTS.flatMap((intent) => {
    const first = index.firstFaqOfIntent(intent.id);
    if (!first) return [];
    return [
      {
        faqId: first.id,
        label: lang === 'hi' ? intent.nameHi : intent.nameEn,
        intentId: intent.id,
      },
    ];
  });

  return (
    <>
      <a className="skip-link" href="#chat-log">
        {s.skipToContent}
      </a>

      {/*
        The visual design has no place for a large page heading, but a document
        still needs exactly one h1 for the outline to make sense to a screen
        reader, and the browse section below starts at h2.
      */}
      <h1 className="sr-only">
        {s.siteName} - {s.siteTagline}
      </h1>

      <div className="shell">
        <BricsRibbon />

        <header className="header">
          <Image
            className="header-logo"
            src="/brics-logo.png"
            alt="BRICS India 2026"
            width={36}
            height={36}
            priority
          />
          <div className="header-text">
            <p className="header-title" translate="no">
              {s.siteName}
            </p>
            <p className="header-sub">{s.siteTagline}</p>
          </div>
          <LangSwitch current={lang} />
        </header>

        <p className="privacy">{s.privacyNotice}</p>

        <ChatIsland lang={lang} openingChips={openingChips} />
      </div>

      <main id="main">
        <FaqAccordion faqs={faqs} lang={lang} />
      </main>

      <footer className="footer">
        <p>{s.officialLine}</p>
        <p style={{ marginTop: 6 }}>
          {s.helplineLine} · {s.emergencyLine}
        </p>
      </footer>
    </>
  );
}
