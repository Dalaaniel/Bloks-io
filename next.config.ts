import type {NextConfig} from 'next';

module.exports = {
  async headers() {
    return [
      {
        source: '/_next/*',  // Targets Next.js build assets
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate', // Ensures no caching for these files
          },
        ],
      },
    ]
  },
}


const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
