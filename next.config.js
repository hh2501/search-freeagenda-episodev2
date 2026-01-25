/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API Routesのタイムアウトを延長（10分 = 600秒）
  // 386エピソード × 約0.5秒 = 約3分 + 余裕を持たせて10分
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
