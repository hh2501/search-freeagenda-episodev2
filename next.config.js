/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  // API Routesのタイムアウトを延長（10分 = 600秒）
  // 386エピソード × 約0.5秒 = 約3分 + 余裕を持たせて10分
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // 画像最適化設定
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [120, 200, 300, 400],
    imageSizes: [120, 200, 300],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.buymeacoffee.com",
        pathname: "/buttons/**",
      },
    ],
  },
  // 旧URLから新URLへのリダイレクト
  async redirects() {
    return [
      { source: "/coffee", destination: "/transcript-status", permanent: true },
      {
        source: "/coffee/checklist",
        destination: "/transcript-status/checklist",
        permanent: true,
      },
    ];
  },
  // 圧縮設定（Brotli圧縮はVercelで自動的に有効）
  compress: true,
  // 本番環境でのソースマップを無効化（バンドルサイズ削減）
  productionBrowserSourceMaps: false,
};

module.exports = withBundleAnalyzer(nextConfig);
