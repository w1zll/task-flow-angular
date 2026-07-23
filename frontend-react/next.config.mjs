import withSerwistInit from '@serwist/next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
const isProductionBuild = process.env.NODE_ENV === 'production';
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/serwist-sw.js',
  swUrl: '/serwist-sw.js',
  disable: !isProductionBuild,
  register: isProductionBuild,
  reloadOnOnline: false,
  cacheOnNavigation: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    proxyClientMaxBodySize: 12 * 1024 * 1024,
    proxyTimeout: 300_000,
  },

  // Proxy API requests to backend in development
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    console.log('Rewrite destination:', apiUrl);
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/serwist-sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
  allowedDevOrigins: ['127.0.0.1'],
};

export default withSerwist(withNextIntl(nextConfig));
