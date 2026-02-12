## tokura.app DevTools 計測チェックリスト

ブラウザの DevTools を使って、`https://tokura.app/` の JS / 画像構成を計測し、FREE AGENDA との構造的な差を数値で比較するためのチェックリストです。

### 1. Network タブ

- フィルター:
  - `JS` のみ表示して **初回ロード時の JS 本数と合計サイズ** を確認。
  - `Img` のみ表示して **画像の本数と合計サイズ** を確認。
- 各リソースのヘッダー:
  - `cache-control`（`max-age`, `immutable` など）がどの程度強めに設定されているか。
  - `content-type`（`image/webp` など）から、モダンフォーマットを使っているかどうか。

### 2. Coverage タブ

- `Start instrumenting coverage and reload page` を押してからページをリロード。
- `JS` の **Used Bytes / Unused Bytes** を確認し、未使用コードの割合をメモ。
  - FREE AGENDA 側の Coverage と比較して、tokura.app がどの程度ミニマルかを見る。

### 3. Elements / Sources タブ

- HTML 構造:
  - 初期 HTML の段階で、どこまでコンテンツがレンダリングされているか（SSR/SSG の度合い）。
  - LCP 要素（ロゴ画像など）がどの位置にあり、どれくらいシンプルな構造か。
- Sources:
  - バンドルファイル名やコメントから、使用しているフレームワーク（Next.js, SvelteKit, それ以外）を推測。

### 4. 比較のためにメモしておくと良い指標

- 初回ロード JS 合計サイズ（KiB）
- 初回ロード画像合計サイズ（KiB）
- 未使用 JS の割合（Coverage）
- 画像フォーマット（PNG/JPEG/WebP/AVIF 等）
- 主な LCP 要素（例: `logo-large.png`）と、その転送サイズ

> 実測値はブラウザごとに異なりますが、このチェックリストに沿って両サイトを同じ環境で測ることで、構造的な差を数値で把握できます。

