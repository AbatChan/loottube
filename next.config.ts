/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: '**.ggpht.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https: data: blob:",
              "media-src 'self' https: blob:",
              "connect-src 'self' https://www.googleapis.com https://googleads.g.doubleclick.net https://www.google-analytics.com",
              "font-src 'self'",
              "frame-src 'self' https://www.youtube.com https://youtube.com",
              "child-src 'self' https://www.youtube.com https://youtube.com",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'compute-pressure=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
