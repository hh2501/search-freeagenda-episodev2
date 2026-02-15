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
  // コード分割とバンドル最適化
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // クライアントサイドのコード分割を最適化
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            // フレームワーク（React, Next.js）を別チャンクに
            framework: {
              name: "framework",
              chunks: "all",
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // その他のnode_modulesを別チャンクに（CSSファイルを除外）
            lib: {
              test: /[\\/]node_modules[\\/]/,
              type: "javascript/auto",
              name(module) {
                // CSSファイルは除外
                if (module.type && module.type.startsWith("css")) {
                  return null;
                }
                const packageName = module.context?.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/,
                )?.[1];
                return packageName
                  ? `npm.${packageName.replace("@", "")}`
                  : null;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // 共通コードを別チャンクに
            commons: {
              name: "commons",
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
            },
            // 残りを別チャンクに
            shared: {
              name: "shared",
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
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
