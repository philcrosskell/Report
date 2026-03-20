/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ['@anthropic-ai/sdk', 'openai'],
  typescript: {
    ignoreBuildErrors: true,
  },
}

// Redeploy: 1773923502051
module.exports = nextConfig
