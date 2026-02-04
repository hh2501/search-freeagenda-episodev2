# トップページの表示速度改善 — 現状と改善点

トップページ（`app/page.tsx`）の表示速度を向上させるための、現在の工夫点と今後の改善点を整理したドキュメントです。

---

## 現在の工夫点（実装済み）

### 1. ISR（Incremental Static Regeneration）

- **実装**: `export const revalidate = 60`（`app/page.tsx`）
- **効果**: Vercel Edge Network で HTML を最大 60 秒キャッシュ。stale-while-revalidate でバックグラウンド更新。
- **影響**: TTFB（Time To First Byte）の短縮、サーバー負荷の削減。

### 2. LCP（Largest Contentful Paint）画像の最適化

- **実装**: `app/components/HomeHeader.tsx` の `<Image>` コンポーネント
  - `priority` プロップで優先読み込み
  - `loading="eager"` で即座に読み込み開始
  - `fetchPriority="high"` でブラウザに優先度を指示
  - `sizes` 属性でレスポンシブ画像サイズを最適化
  - `quality={85}` でファイルサイズと画質のバランス
- **実装**: `app/layout.tsx` の `<link rel="preload" href="/Thumbnail_image.jpg" as="image">`
  - HTML の `<head>` で画像を事前読み込み
- **効果**: LCP の短縮（目標: 1.0s 以下、競合水準: 0.5s 以下）。

### 3. クリティカル CSS のインライン化

- **実装**: `app/components/CriticalCSS.tsx` でファーストビュー用 CSS をインライン化
- **効果**: FCP（First Contentful Paint）の短縮、レンダリングブロックの削減。

### 4. フォント読み込みの最適化

- **実装**: `app/layout.tsx` の `Noto_Sans_JP` 設定
  - `display: "swap"` でフォント読み込み中のフォールバック表示
  - `preload: true` でフォントの早期読み込み
  - `adjustFontFallback: true` でレイアウトシフトの最小化
- **実装**: `preconnect` と `dns-prefetch` で Google Fonts への早期接続
  - `<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />`
  - `<link rel="dns-prefetch" href="https://fonts.googleapis.com" />`
- **効果**: フォント読み込み遅延の削減、CLS（Cumulative Layout Shift）の改善。

### 5. JavaScript の遅延読み込み

- **実装**: `app/page.tsx` で `HomeContent` を `dynamic(..., { ssr: false })` で遅延読み込み
  - 初期 JavaScript バンドルサイズの削減
  - TBT（Total Blocking Time）の削減
- **実装**: `app/components/HomeContent.tsx` で `SearchResultCard` と `Pagination` を dynamic import
- **実装**: `app/layout.tsx` で `SpeedInsights` を dynamic import（`ssr: false`）
- **効果**: 初期 JS バンドルサイズの削減、インタラクティブまでの時間短縮。

### 6. Edge Runtime の活用

- **実装**: `app/layout.tsx` で `export const runtime = "edge"`
- **効果**: Vercel Edge Network でレンダリング、レイテンシの短縮。

### 7. 画像最適化設定（Next.js）

- **実装**: `next.config.js` の `images` 設定
  - `formats: ["image/avif", "image/webp"]` でモダン形式を優先
  - `deviceSizes` / `imageSizes` でレスポンシブサイズを最適化
  - `minimumCacheTTL: 60` で画像キャッシュ
- **効果**: 画像ファイルサイズの削減、読み込み速度の向上。

### 8. 最新エピソードの遅延読み込み

- **実装**: `app/components/LatestEpisode.tsx` で `requestIdleCallback` を使用
  - ブラウザのアイドル時間に API を呼び出し
  - 初期レンダリングをブロックしない
- **効果**: 初期表示の高速化、TBT の削減。

---

## 改善点（未実装・検討中）

### 🔴 優先度: 高

#### 1. フォントの subset 最適化

- **現状**: `Noto_Sans_JP` を `subsets: ["latin"]` のみで読み込み（日本語グリフが含まれない可能性）
- **改善案**: `subsets: ["latin", "latin-ext"]` または日本語グリフを含む subset を指定
- **期待効果**: フォントファイルサイズの削減（50%〜70%）、FCP/LCP の 0.1〜0.2s 短縮
- **実装難易度**: 低（`app/layout.tsx` の `Noto_Sans_JP` 設定を変更）

#### 2. `font-display: optional` の検討

- **現状**: `display: "swap"` を使用（フォント読み込み中もフォールバック表示）
- **改善案**: `display: "optional"` に変更（フォントが読み込めない場合はフォールバックのまま）
- **期待効果**: レイアウトシフトの削減、CLS の改善
- **注意点**: フォントが表示されない可能性があるため、デザイン要件との調整が必要

#### 3. リソースヒントの最適化

- **現状**: `preconnect` / `dns-prefetch` は Google Fonts のみ
- **改善案**: 
  - 検索 API のエンドポイントへの `preconnect`（Vercel のドメイン）
  - 外部リンク（listen.style など）への `dns-prefetch`
- **期待効果**: API 呼び出しのレイテンシ削減（0.05〜0.1s）

### 🟡 優先度: 中

#### 4. 画像の WebP/AVIF フォーマットの強制

- **現状**: Next.js Image が自動で最適化（AVIF/WebP を生成）
- **改善案**: ソース画像自体を WebP に変換して `public/` に配置
- **期待効果**: ビルド時の変換処理が不要になり、初回リクエストが速くなる可能性
- **注意点**: 既存の JPEG との互換性確認が必要

#### 5. Critical CSS の範囲拡大

- **現状**: ファーストビューのみ（検索フォーム、ヘッダー）
- **改善案**: フッターリンクや最新エピソード表示の CSS も含める
- **期待効果**: レンダリングブロックのさらなる削減
- **注意点**: CSS サイズが増えるため、バランスが必要

#### 6. Suspense の fallback 最適化

- **現状**: `app/page.tsx` で `HomeContent` の Suspense fallback を実装済み
- **改善案**: fallback の HTML を最小限に（現在は検索フォームのプレースホルダーを表示）
- **期待効果**: 初期 HTML サイズの削減（数 KB）

### 🟢 優先度: 低

#### 7. 静的アセットの CDN キャッシュ確認

- **現状**: Vercel が自動でエッジキャッシュ（最大 31 日）
- **改善案**: `Cache-Control` ヘッダーを明示的に設定（`next.config.js` の `headers()`）
- **期待効果**: キャッシュヒット率の向上（既に最適化されている可能性が高い）

#### 8. バンドルサイズの分析と最適化

- **現状**: `@next/bundle-analyzer` を導入済み（`npm run analyze`）
- **改善案**: 定期的にバンドル分析を実施し、不要な依存関係を削除
- **期待効果**: 初期 JS バンドルサイズの削減（10%〜20%）

---

## メトリクス目標（参考）

| メトリクス | 現在 | 目標 | 競合水準 |
|-----------|------|------|----------|
| **FCP** | 1.1s | 1.0s | - |
| **LCP** | 1.8s | 1.0s / 0.5s 以下 | 0.12s（競合サイト） |
| **TBT** | 0ms | 200ms 以下 | - |
| **CLS** | 0.019 | 0.1 以下 | - |
| **Speed Index** | 1.1s | 1.0s | - |

---

## 実装の優先順位

1. ✅ **フォントの subset 最適化**（実装が簡単、効果が大きい）
2. ✅ **`font-display: optional` の検討**（CLS 改善）
3. ✅ **リソースヒントの追加**（API エンドポイントへの preconnect）
4. ⚠️ **画像フォーマットの最適化**（要検証）
5. ⚠️ **Critical CSS の拡大**（バランスが必要）

---

## 参考資料

- [Next.js Image Optimization](https://nextjs.org/docs/pages/api-reference/components/image)
- [Web Vitals](https://web.dev/vitals/)
- [Font Loading Best Practices](https://web.dev/font-best-practices/)
- `docs/PERFORMANCE_OPTIMIZATION_TASKS.md` - パフォーマンス最適化タスク一覧
- `docs/CDN_CACHE_OVERVIEW.md` - キャッシュ戦略の詳細

---

*このドキュメントは、トップページの表示速度改善の現状と今後の改善案をまとめたものです。実装前に、各改善案の効果とコストを検証することを推奨します。*
