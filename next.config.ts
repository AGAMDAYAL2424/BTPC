import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  // Ship only the files the server actually needs, so the unit restarts fast
  // and the deployed tree is a fraction of node_modules.
  output: 'standalone',
  // better-sqlite3 is a native module; keep it external to the server bundle.
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // An authenticated surface must never be cached by a CDN.
        source: '/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, private' }],
      },
      {
        // These pages carry a per-request CSP nonce, and a shared cache would
        // hand the same nonce to different visitors, which defeats it.
        source: '/:lang(hi|en)',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
    ];
  },
};

export default nextConfig;
