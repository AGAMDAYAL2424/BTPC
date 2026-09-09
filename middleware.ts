import { NextResponse, type NextRequest } from 'next/server';

/**
 * Two jobs: send the bare root to a language route, and set the content
 * security policy with a per-request nonce.
 *
 * Runs on the edge runtime by definition, so it does no database work and makes
 * no authorisation decision. The admin routes check their own session inside
 * each page and each action; a middleware guard could not reach SQLite anyway,
 * and a redirect here would not be an authorisation check for the actions
 * beneath it.
 */

function buildCsp(nonce: string, isDev: boolean): string {
  return [
    `default-src 'self'`,
    // A nonce plus strict-dynamic rather than 'unsafe-inline'. Next injects its
    // own bootstrap scripts inline, and relaxing script-src to allow that
    // wholesale would give up most of the value of having a policy. Dev mode
    // additionally needs eval for hot reloading; production does not get it.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ''}`.trim(),
    // Inline styles are unavoidable: Next and next/font both emit them.
    `style-src 'self' 'unsafe-inline'`,
    // Fonts are self-hosted through next/font, so no external origin is needed.
    `font-src 'self'`,
    `img-src 'self' data:`,
    // The browser only ever talks to this origin. Gemini is called server-side,
    // so if a third-party host ever needs to appear here, the API key has
    // leaked to the client.
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    ...(isDev ? [] : [`upgrade-insecure-requests`]),
  ].join('; ');
}

export function middleware(request: NextRequest): NextResponse {
  const isDev = process.env.NODE_ENV !== 'production';
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = buildCsp(nonce, isDev);

  // Root goes to a language route, so every page has a real lang attribute and
  // a canonical of its own. Preference comes from Accept-Language, never IP.
  if (request.nextUrl.pathname === '/') {
    const header = request.headers.get('accept-language') ?? '';
    const prefersHindi = /\bhi\b/i.test(header.split(',')[0] ?? '');
    const url = request.nextUrl.clone();
    url.pathname = prefersHindi ? '/hi' : '/en';
    const redirect = NextResponse.redirect(url);
    redirect.headers.set('Content-Security-Policy', csp);
    return redirect;
  }

  // Next reads the nonce out of the request-side CSP header and applies it to
  // its own inline scripts, which is what makes strict-dynamic work.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the favicon. Hashed build output is
     * immutable and needs no policy header, and skipping it keeps the
     * middleware off the hot path for every chunk request.
     */
    '/((?!_next/static|_next/image|favicon.ico|brics-logo.png).*)',
  ],
};
