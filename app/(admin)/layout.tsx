import type { Metadata, Viewport } from 'next';
import { Noto_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import '../globals.css';
import './admin.css';

/**
 * Root layout for the admin surface, separate from the public one.
 *
 * The route group gives this its own <html>, so the admin can be `lang="en"`
 * and noindex while the public pages stay bilingual and indexable. Devanagari
 * is still loaded here because staff type and read Hindi answers in the editor.
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

export const metadata: Metadata = {
  title: 'Admin | Delhi Traffic Police Help Desk',
  // Belt and braces with the robots.txt disallow, which is not a security
  // control. The real protection is the session check inside every handler.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${latin.variable} ${devanagari.variable}`}>
      <body
        style={{
          ['--font-sans' as string]: `var(--font-devanagari), var(--font-latin)`,
        }}
      >
        {children}
      </body>
    </html>
  );
}
