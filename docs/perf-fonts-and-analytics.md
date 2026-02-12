## フォントと Google Analytics の読み込み戦略メモ

### 現状設定の確認

- フォント: `Noto_Sans_JP`（`next/font/google`）
  - 設定は以下の通り:
    - `display: "swap"`
    - `preload: false`
    - `adjustFontFallback: true`
  - `<head>` 内で:
    - `fonts.gstatic.com` への `preconnect`
    - `fonts.googleapis.com` への `dns-prefetch`
- Google Analytics:
  - `app/components/GoogleAnalytics.tsx` で `next/script` を使用。
  - GA スクリプトは `strategy="lazyOnload"` で読み込み。

```12:24:app/components/GoogleAnalytics.tsx
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="gtag-init" strategy="lazyOnload">
```

### 評価

- フォントは `display: "swap"` かつ `preload: false` のため、初期描画をブロックせず、LCP への悪影響は最小限。
- GA は `lazyOnload` でロードされており、LCP 前のクリティカルパスには基本的に乗らない設定になっている。

### 今後の調整方針

- LCP 改善の主戦場は画像（HERO 画像）と HTML/JS のクリティカルパス側にあるため、フォントと GA については現状設定を維持しつつ、必要になった場合のみ微調整する。
- もし今後 GA を追加・変更する場合も、`lazyOnload` 相当の戦略を守ることを推奨。

