// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // for standalone build output  [oai_citation:1‡Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/output?utm_source=chatgpt.com)

  // Example Image configuration; tweak or remove as needed
  images: {
    domains: ['example.com'], // add your domains here
  },

  // Optional: custom webpack adjustments
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },

  // Optional: add security headers globally
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
