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
  // 画像最適化設定（LCP 改善）
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [120, 200, 300, 400],
    imageSizes: [120, 200, 300],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = withBundleAnalyzer(nextConfig);
