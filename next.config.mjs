/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@hashgraph/sdk',
      '@hashgraphonline/standards-sdk',
      '@hashgraphonline/conversational-agent',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only packages on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
