import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  /* config options here */
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {hostname: 'sgnfvsbudmenkedygcwp.supabase.co'}
    ],
  },
};

export default nextConfig;
