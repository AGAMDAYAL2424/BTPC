import type { MetadataRoute } from 'next';
import { config } from '../lib/server/config';

/**
 * Note that disallowing /admin/ is not a security control: it publishes the
 * path. The actual protection is the session check inside every admin handler
 * plus noindex metadata on those routes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /_next/ is deliberately NOT disallowed: crawlers need the
        // render-critical CSS and JS to see the page at all.
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
