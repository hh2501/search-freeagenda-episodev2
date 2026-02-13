# 表示高速化の実施内容

[ベイジ｜サイトの表示高速化につながる18のこと](https://baigie.me/officialblog/2019/11/26/high-speed-frontend/) および [MDN｜CSS のパフォーマンス最適化](https://developer.mozilla.org/ja/docs/Learn_web_development/Extensions/Performance/CSS) を参考に実施した最適化の一覧です。

---

## 実施済み

### 1. NextTopLoader の削除

- **参考**: ベイジ #11（ライブラリの改良・自作）、#18（ローディング表示は最終手段）
- **内容**: `nextjs-toploader` を削除。トップページのクリティカルパスに乗る JS を削減。
- **効果**: ページ遷移時のローディングバー用 JS 実行を削除し、初回描画までの負荷を軽減。

### 2. 全称セレクタ（*）の削除

- **参考**: MDN「必要以上に要素にスタイルを適用しない」「セレクタを簡略化」
- **内容**: `* { font-family: ... }` を削除。`body` に指定した `font-family` は子要素へ継承されるため冗長。
- **効果**: 全要素へのマッチング処理を減らし、CSSOM 構築コストを削減。

### 3. prefers-reduced-motion の追加

- **参考**: MDN「アニメーションの処理」、アクセシビリティ対応
- **内容**: アニメーション・トランジションを短縮するメディアクエリを追加。ユーザーが「視差効果を減らす」を選択している場合に対応。
- **効果**: 低スペック端末・バッテリー節約モード時の描画負荷を軽減。

---

## 参考にした観点（未実施・継続検討）

| 項目 | 参考元 | 現状 |
|------|--------|------|
| defer/async | ベイジ #3 | GA は `lazyOnload`、Next.js がスクリプト最適化 |
| 読み込み順（CSS→JS） | ベイジ #2 | Next.js が管理 |
| 不要コード削除 | ベイジ #10 | CriticalCSS のヒーロー関連は削除済み |
| フォント display: swap | 両方 | `next/font` で `display: "swap"` 使用中 |
| 画像の遅延読み込み | ベイジ #17 | support ページの Image は below-fold |
| Minify/圧縮 | ベイジ #12 | Next.js 本番ビルドで自動実施 |
| HTTP/2 | ベイジ #6 | Vercel が対応 |

---

## 計測

変更適用後、[PageSpeed Insights](https://pagespeed.web.dev/) でモバイル・デスクトップのスコアを確認し、`docs/pagespeed-history.md` に記録すること。
