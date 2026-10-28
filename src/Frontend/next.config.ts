import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const api = (process.env.API_URL || 'http://localhost:5000').replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    return [
      { source: '/sitemap.xml', destination: `${api}/sitemap.xml` },
      { source: '/robots.txt', destination: `${api}/robots.txt` },
    ];
  },
  async headers() {
    const apiOrigin = (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000').origin;
      } catch {
        return 'http://localhost:5000';
      }
    })();
    const scripts = process.env.NODE_ENV === 'development'
      ? "'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com"
      : "'self' 'unsafe-inline' https://accounts.google.com";

    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: `default-src 'self'; script-src ${scripts}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: http://localhost:9000 https://lh3.googleusercontent.com https://images.unsplash.com; connect-src 'self' ${apiOrigin} https://accounts.google.com; frame-src 'self' https://accounts.google.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
        },
        ...(process.env.ENABLE_HSTS === 'true'
          ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
          : []),
      ],
    }];
  },
  images: {
    // Ảnh công thức lưu trên MinIO (dev: localhost:9000).
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // avatar Google
      { protocol: "https", hostname: "images.unsplash.com" },
    ],

    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
