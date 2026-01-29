/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

const nextConfig = {
  reactStrictMode: true,
  // API Routesのタイムアウトを延長（10分 = 600秒）
  // 386エピソード × 約0.5秒 = 約3分 + 余裕を持たせて10分
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

module.exports = withBundleAnalyzer(nextConfig);
