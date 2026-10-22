import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Bỏ qua lỗi TypeScript khi build trên Vercel CI
    ignoreBuildErrors: true,
  },
  images: {
    // Hỗ trợ tải ảnh từ các domain bên ngoài nếu có
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
