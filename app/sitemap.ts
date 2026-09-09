import type { MetadataRoute } from 'next';
import { config } from '../lib/server/config';
import { getRepo } from '../lib/server/db';

/**
 * lastModified reflects the newest change in the knowledge base rather than the
 * build time. Stamping every build as "just changed" teaches search engines to
 * ignore the field.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  let lastModified = new Date('2026-09-09');
  try {
    const newest = getRepo()
      .listPublishedFaqs()
      .map((f) => f.lastUpdated)
      .sort()
      .pop();
    if (newest) lastModified = new Date(newest);
  } catch {
    // Sitemap generation must not fail because the database is not ready yet.
  }

  return ['hi', 'en'].map((lang) => ({
    url: `${config.siteUrl}/${lang}`,
    lastModified,
    alternates: {
      languages: { 'hi-IN': `${config.siteUrl}/hi`, 'en-IN': `${config.siteUrl}/en` },
    },
  }));
}
