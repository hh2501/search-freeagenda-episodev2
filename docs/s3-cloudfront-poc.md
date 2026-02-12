## S3 / CloudFront 経由で画像を配信する PoC 構成案

HERO 画像やアイコン画像を S3 / CloudFront 経由で配信しつつ、Next.js の `next/image` 最適化も併用するための PoC 手順です。

### 1. インフラ構成（概要）

- **S3 バケット**
  - 例: `freeagenda-assets-prod`
  - パス例: `images/Compressed_Thumbnail_image.webp`
- **CloudFront ディストリビューション**
  - オリジン: 上記 S3 バケット
  - キャッシュポリシー:
    - `Cache-Control: public, max-age=31536000, immutable`（ファイル名にハッシュを含める前提）
  - HTTPS 有効（ACM 証明書）

### 2. Next.js 設定（`next.config.js` のイメージ）

```js
// next.config.js の images 設定に CloudFront ドメインを追加するイメージ
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
      hostname: "dxxxxxxxxx.cloudfront.net",
      pathname: "/images/**",
    },
  ],
},
```

### 3. コンポーネント側の変更イメージ

#### `HomeHeader.tsx` の HERO 画像

```tsx
// app/components/HomeHeader.tsx の src を CloudFront に切り替える案
<Image
  src="https://dxxxxxxxxx.cloudfront.net/images/Compressed_Thumbnail_image.webp"
  alt="FREE AGENDA by Hikaru & Yamotty"
  width={400}
  height={400}
  className="max-w-[200px] md:max-w-[300px] lg:max-w-[400px] h-auto rounded-xl shadow-md transition-all duration-200 ease-out hover:shadow-xl"
  priority
  loading="eager"
  fetchPriority="high"
  decoding="async"
  sizes="(max-width: 480px) 100px, (max-width: 768px) 200px, (max-width: 1024px) 300px, 360px"
  quality={80}
/>
```

#### `layout.tsx` の `metadata.icons`

```ts
// app/layout.tsx の icons を CloudFront 上の小さいアイコン画像に切り替える案
export const metadata: Metadata = {
  // ...
  icons: {
    icon: "https://dxxxxxxxxx.cloudfront.net/icons/favicon-32.png",
    shortcut: "https://dxxxxxxxxx.cloudfront.net/icons/favicon-32.png",
    apple: "https://dxxxxxxxxx.cloudfront.net/icons/apple-touch-icon-180.png",
  },
};
```

### 4. PoC の進め方

1. S3 / CloudFront 上に **HERO 用 WebP 画像 + アイコン画像** をアップロード。
2. ローカル or ステージング環境で `next.config.js` に `remotePatterns` を追加し、`HomeHeader` / `layout` を一時的に CloudFront URL に切り替え。
3. ステージング URL で PageSpeed Insights（モバイル）を実行し、現状構成との LCP やクリティカルパスの差分を確認。
4. 効果と運用コスト（S3/CloudFront 運用）のバランスを見て、本番適用するか判断。

