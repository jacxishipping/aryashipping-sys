import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  serverExternalPackages: ['@napi-rs/canvas'],
  typescript: {
    // Mid-migration: design-system / MUI shim pages still carry ~270
    // legacy type errors (implicit any, Box/Link shims, FormField props).
    // Don't block production builds on these; `npx tsc --noEmit` remains
    // the source of truth for incremental cleanup.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    webpackBuildWorker: false,
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'public.blob.vercel-storage.com',
      },
    ],
    unoptimized: false,
  },
};

export default nextConfig;
