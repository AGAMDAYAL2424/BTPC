import Link from 'next/link';
import type { Lang } from '../lib/shared/types';
import { LANGS, LANG_LABEL, t } from '../lib/shared/strings';

/**
 * Links between the two locale routes rather than toggling client state, so
 * each language keeps its own URL, its own `lang` attribute and its own
 * canonical. Each option is labelled in its OWN language and declares it with
 * `lang` and `hrefLang`, so a screen reader pronounces both correctly.
 */
export default function LangSwitch({ current }: { current: Lang }) {
  return (
    <nav className="lang-switch" aria-label={t(current).langSwitchLabel}>
      {LANGS.map((lang) => (
        <Link
          key={lang}
          href={`/${lang}`}
          lang={lang}
          hrefLang={lang}
          aria-current={lang === current ? 'page' : undefined}
        >
          {LANG_LABEL[lang]}
        </Link>
      ))}
    </nav>
  );
}
