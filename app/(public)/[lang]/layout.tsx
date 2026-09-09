import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Noto_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import '../../globals.css';
import { isLang, t } from '../../../lib/shared/strings';
import { config } from '../../../lib/server/config';

/**
 * Fonts are self-hosted through next/font, so no external font origin is
 * needed and the content security policy can keep font-src at 'self'.
 *
 * Noto Sans and Noto Sans Devanagari are one superfamily by the same foundry,
 * so their vertical metrics and stroke weights match. That matters here more
 * than usual: the advisory is Hinglish, so both scripts appear inside a single
 * sentence and a mismatched pair looks visibly broken.
 *
 * The skill's own accessibility-first pairings (Atkinson Hyperlegible, Lexend,
 * Source Sans 3, Inter) all have zero Devanagari coverage and are unusable here.
 */
const latin = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-latin',
  display: 'swap',
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-devanagari',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom stays available. Blocking it on a civic information page used by the
  // general public is an accessibility failure, not a polish decision.
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#f0f9ff',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const s = t(lang);
  return {
    metadataBase: new URL(config.siteUrl),
    title: s.metaTitle,
    description: s.metaDescription,
    alternates: {
      canonical: `/${lang}`,
      languages: { 'hi-IN': '/hi', 'en-IN': '/en', 'x-default': '/en' },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: s.metaTitle,
      description: s.metaDescription,
      locale: lang === 'hi' ? 'hi_IN' : 'en_IN',
      type: 'website',
      url: `/${lang}`,
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <html lang={lang} className={`${latin.variable} ${devanagari.variable}`}>
      <body
        style={{
          // Devanagari first in the stack so its glyphs never fall through to
          // the Latin face, which would render them as boxes.
          ['--font-sans' as string]: `var(--font-devanagari), var(--font-latin)`,
        }}
      >
        {children}
      </body>
    </html>
  );
}
