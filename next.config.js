/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@anthropic-ai/sdk', 'openai'],
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
