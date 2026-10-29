import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const api = (process.env.API_URL || 'http://localhost:5000').replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    return [
      { source: '/sitemap.xml', destination: `${api}/sitemap.xml` },
      { source: '/robots.txt', destination: `${api}/robots.txt` },
    ];
  },
  images: {
    // Local HTTPS tự ký dùng browser tải ảnh; production mặc định vẫn tối ưu qua Next.
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === 'true',
    // Ảnh công thức lưu trên MinIO (dev: localhost:9000).
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // avatar Google
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(process.env.NEXT_PUBLIC_MEDIA_URL ? (() => {
        const media = new URL(process.env.NEXT_PUBLIC_MEDIA_URL);
        return [{ protocol: media.protocol.replace(':', '') as 'http' | 'https', hostname: media.hostname, port: media.port, pathname: '/**' }];
      })() : []),
    ],

    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
