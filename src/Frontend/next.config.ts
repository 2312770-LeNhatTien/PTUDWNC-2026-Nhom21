import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const api = (process.env.API_URL || 'http://localhost:5000').replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    return [
      { source: '/sitemap.xml', destination: `${api}/sitemap.xml` },
      { source: '/robots.txt', destination: `${api}/robots.txt` },
    ];
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
