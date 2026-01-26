# プロジェクトコンテキスト引き継ぎドキュメント（最新版）

**作成日**: 2026年1月25日  
**プロジェクト**: フリーアジェンダ エピソード検索サービス  
**リポジトリ**: https://github.com/hh2501/search-freeagenda-episodev2.git  
**デプロイURL**: https://search-freeagenda-episodev2.vercel.app

---

## 📋 プロジェクト概要

フリーアジェンダというポッドキャストの特定エピソードを検索できるサービス。ユーザーが覚えている単語をサーチバーに入力すると、該当するエピソードが検索結果として返ってきます。

### 参考リソース
- 参考サイト: https://tokura.app/
- Spotify: https://open.spotify.com/show/4PhA1zRUA72OHGPtyImz3Q
- RSS: https://rss.listen.style/p/freeagenda/rss
- 文字起こしサイト例: https://listen.style/p/freeagenda/jtrwnfvl

---

## ✅ 完了した主要機能

### MVPコア機能（すべて完了）
- ✅ プロジェクト初期セットアップ（Next.js 14 + TypeScript + Tailwind CSS）
- ✅ RSSフィードからエピソード情報を取得
- ✅ 各エピソードの文字起こしテキストを取得・保存
- ✅ 全文検索API（日本語形態素解析: kuromoji対応）
- ✅ 検索バーと検索結果表示UI
- ✅ エピソード詳細ページ
- ✅ URLパラメータ（?q=...）からの自動検索機能
- ✅ 検索履歴機能（localStorage使用）
- ✅ Material Design 3に基づくUI更新
- ✅ 検索結果カードにボーダー追加（Material Design 3準拠）

### データベース移行（完了）
- ✅ AWS OpenSearch ServiceからElastic Cloud Serverlessへの移行完了
- ✅ コスト削減: 月額約5,945円 → 約1,160円（約80%削減）
- ✅ API Key認証の実装完了
- ✅ 接続テスト成功
- ✅ 全エピソードの同期完了（約386エピソード）

### データ同期機能（完了）
- ✅ 手動データ同期API（POST /api/sync - 全件同期）
- ✅ 差分同期API（POST /api/sync-incremental - 新規エピソードのみ）
- ✅ 個別エピソード同期機能（POST /api/episode/sync）
- ✅ バッチ同期機能（POST /api/episode/sync-batch）
- ✅ リアルタイム同期進捗表示（Server-Sent Events）

### 自動データ更新（完了）
- ✅ GitHub Actionsワークフローの実装（`.github/workflows/sync-episodes.yml`）
- ✅ 毎日午前2時（JST）に自動実行
- ✅ 手動実行も可能
- ✅ 初回実行テスト成功

### デプロイ（完了）
- ✅ Vercelへのデプロイ完了
- ✅ Elastic Cloud Serverless認証エラーの修正（Connectionクラスのカスタマイズ）
- ✅ 環境変数の設定完了
- ✅ 本番環境での動作確認完了

---

## 🔧 技術スタック

### フロントエンド
- **Next.js**: 14.2.5
- **React**: 18.3.1
- **TypeScript**: 5.5.3
- **Tailwind CSS**: 3.4.4
- **Material Design 3**: カスタム実装

### バックエンド
- **Next.js API Routes**: 動的ルート（`export const dynamic = 'force-dynamic'`）
- **TypeScript**: 5.5.3

### データベース
- **Elastic Cloud Serverless**: 全文検索エンジン
  - パッケージ: `@opensearch-project/opensearch@3.5.1`
  - 認証方式: API Key認証
  - インデックス名: `episodes`
  - 日本語アナライザー: kuromoji

### データ取得
- **RSS Parser**: `rss-parser@3.13.0`
- **HTML Parser**: `cheerio@1.0.0`

### 自動化
- **GitHub Actions**: データ自動更新
- **Vercel**: ホスティング・デプロイ

---

## 🔑 重要な設定情報

### 環境変数（.env.local）

```env
# Elastic Cloud Serverlessエンドポイント
OPENSEARCH_ENDPOINT=https://your-deployment.es.ap-northeast-1.aws.elastic.cloud:443

# API Key認証
OPENSEARCH_API_KEY=your-api-key-here
```

**注意**: 実際のAPI Keyは`.env.local`ファイルに設定してください。このファイルには含めないでください。

### Vercel環境変数

以下の環境変数が設定されています：
- `OPENSEARCH_ENDPOINT`: Elastic Cloud Serverlessエンドポイント
- `OPENSEARCH_API_KEY`: Elastic Cloud Serverless API Key
- `SYNC_AUTH_TOKEN`: GitHub Actions用認証トークン（オプション）

### GitHub Secrets

以下のSecretsが設定されています：
- `VERCEL_URL`: https://search-freeagenda-episodev2.vercel.app
- `SYNC_AUTH_TOKEN`: GitHub Actions用認証トークン（オプション）

---

## 📁 重要なファイル構成

### 主要なAPIルート
- `app/api/search/route.ts` - 検索API
- `app/api/sync/route.ts` - 全件同期API
- `app/api/sync/stream/route.ts` - リアルタイム同期進捗表示（SSE）
- `app/api/sync-incremental/route.ts` - 差分同期API（GitHub Actions用）
- `app/api/episode/sync/route.ts` - 個別エピソード同期API
- `app/api/episode/sync-batch/route.ts` - バッチ同期API
- `app/api/test-connection/route.ts` - 接続テストAPI

### データベース関連
- `lib/db/index.ts` - OpenSearchクライアント初期化（API Key認証実装済み）
- `lib/db/episodes.ts` - エピソード操作関数
- `lib/db/index-elastic-fallback.ts` - フォールバック実装（参考用）

### RSS・文字起こし関連
- `lib/rss/parser.ts` - RSSパーサー、個別エピソード取得機能
- `lib/transcript/fetcher.ts` - 文字起こし取得機能

### UI関連
- `app/page.tsx` - トップページ（検索UI、検索結果表示）
- `app/episode/[id]/page.tsx` - エピソード詳細ページ
- `app/globals.css` - Material Design 3スタイル定義
- `lib/search-keywords.json` - ランダムプレースホルダー用キーワードリスト

### 自動化
- `.github/workflows/sync-episodes.yml` - GitHub Actionsワークフロー

---

## 🎨 UI/UXの特徴

### Material Design 3準拠
- カラーパレット: フリーアジェンダのブランドカラー（ダークブルー: `#304d5f`, ライトブルー: `#b6e2e3`）
- タイポグラフィスケール: Material Design 3準拠
- エレベーションシステム: カード、ボタンに適用
- 検索結果カード: 常時ボーダー表示（`border-gray-200`）、ホバー時は`border-freeagenda-dark/40`

### 検索機能
- 通常検索: 部分一致検索
- 完全一致検索: キーワードを`""`で囲むと完全一致
- 複数キーワード対応: スペース区切りでAND検索
- 検索履歴: localStorageに保存、ドロップダウン表示
- 検索のコツ: 検索クエリが空、または入力中（検索実行前）に表示

---

## 📋 残っているTODO（未実装機能）

### 🟡 優先度: 中（将来的な拡張機能）

#### 1. 最新回の更新表示
- [ ] 最新エピソードの更新情報を表示
- [ ] 更新日時の表示
- [ ] 更新通知機能（オプション）

### 🟢 優先度: 低（パフォーマンス最適化）

#### 2. 検索速度の最適化
- [ ] OpenSearch Serviceのクエリ最適化
- [ ] クエリのパフォーマンス分析
- [ ] 不要なクエリの削減

#### 3. インデックスの最適化
- [ ] OpenSearch Serviceの設定調整
- [ ] アナライザーの調整
- [ ] マッピングの最適化

### 📝 その他の改善提案

#### 4. UI/UXの改善
- [ ] 検索キーワードのハイライト表示（検索結果内）
- [ ] 検索結果の説明文プレビュー（最初の100文字程度）
- [ ] リアルタイム検索（debounce付き）
- [ ] 検索結果のソート機能（関連度、日付順など）

#### 5. エラーハンドリングの強化
- [ ] より詳細なエラーメッセージ
- [ ] エラー時のリトライ機能
- [ ] エラーログの記録と分析

---

## 🔍 最近の変更履歴

### 2026年1月25日
- ✅ 検索結果カードにボーダーを追加（Material Design 3準拠）
- ✅ 検索結果が0件のときは「検索のコツ」を非表示に修正
- ✅ 検索入力中（検索実行前）は「検索のコツ」を表示するように修正
- ✅ GitHub Actionsワークフローの実装完了
- ✅ 初回実行テスト成功
- ✅ 検索キーワードリストの更新

### 2026年1月24日
- ✅ Elastic Cloud Serverless認証エラーの修正（Connectionクラスのカスタマイズ）
- ✅ Vercelデプロイ成功
- ✅ 接続テスト成功

---

## 🚨 重要な注意事項

### 認証設定
- Elastic Cloud ServerlessはAPI Key認証を使用
- `lib/db/index.ts`で`Connection`クラスをカスタマイズして認証ヘッダーを追加
- Vercel環境変数に`OPENSEARCH_ENDPOINT`と`OPENSEARCH_API_KEY`が設定されている必要がある

### APIルートの動的設定
- すべてのAPIルートに`export const dynamic = 'force-dynamic';`を設定
- これにより、Next.jsの静的生成を無効化し、常に動的に実行される

### 検索のコツセクションの表示条件
- `query === ''`（検索クエリが空）: 表示
- `query !== '' && !hasSearched`（入力中、検索実行前）: 表示
- `hasSearched === true`（検索実行後）: 非表示

### GitHub Actions
- ワークフローファイル: `.github/workflows/sync-episodes.yml`
- 実行スケジュール: 毎日午前2時（JST）= UTC 17:00
- 手動実行: GitHub ActionsのUIから可能

---

## 📚 参考ドキュメント

### セットアップ・デプロイ関連
- `markdownfiles/GITHUB_REPOSITORY_SETUP.md` - GitHubリポジトリ作成・セットアップガイド
- `markdownfiles/GITHUB_ACTIONS_SETUP.md` - GitHub Actionsセットアップガイド
- `markdownfiles/VERCEL_DEPLOYMENT_GUIDE.md` - Vercelデプロイガイド
- `markdownfiles/VERCEL_ENV_VAR_SETUP.md` - Vercel環境変数設定ガイド
- `markdownfiles/VERCEL_REDEPLOY_GUIDE.md` - Vercel再デプロイガイド

### Elastic Cloud Serverless関連
- `markdownfiles/ELASTIC_SERVERLESS_MIGRATION_GUIDE.md` - Elastic Cloud Serverless移行ガイド
- `markdownfiles/ELASTIC_API_KEY_GUIDE.md` - Elastic API Key設定ガイド
- `markdownfiles/ELASTIC_AUTH_TROUBLESHOOTING.md` - 認証トラブルシューティング

### その他
- `markdownfiles/todo.md` - タスク管理（詳細なTODOリスト）
- `markdownfiles/COLOR_PALETTE.md` - カラーパレット定義
- `markdownfiles/COST_ANALYSIS_AND_TECH_STACK_RECOMMENDATION.md` - コスト分析と技術スタック推奨

---

## 🔗 重要なURL

- **本番環境**: https://search-freeagenda-episodev2.vercel.app
- **GitHubリポジトリ**: https://github.com/hh2501/search-freeagenda-episodev2.git
- **接続テストAPI**: https://search-freeagenda-episodev2.vercel.app/api/test-connection
- **検索API**: https://search-freeagenda-episodev2.vercel.app/api/search?q=キーワード

---

## 💡 開発時の注意点

### 環境変数の管理
- `.env.local`はGitにコミットしない（`.gitignore`に含まれている）
- Vercel環境変数はデプロイ時に反映されるため、変更後は再デプロイが必要

### 検索キーワードリスト
- `lib/search-keywords.json`にランダムプレースホルダー用のキーワードが格納されている
- 初回マウント時と検索入力が空になったときにランダムに選択される

### データ同期
- 全件同期: `POST /api/sync`（時間がかかる）
- 差分同期: `POST /api/sync-incremental`（新規エピソードのみ、GitHub Actionsで使用）
- 個別同期: `POST /api/episode/sync?url=エピソードURL`
- バッチ同期: `POST /api/episode/sync-batch`（JSON bodyにURLs配列）

### 認証エラーのトラブルシューティング
- 401エラーが発生した場合、`/api/test-connection`で`envCheck`を確認
- Vercel環境変数が正しく設定されているか確認
- 環境変数を変更した場合は必ず再デプロイ

---

## 🎯 次のステップ（推奨）

1. **最新回の更新表示の実装**（優先度: 中）
   - 最新エピソードの更新情報を表示
   - 更新日時の表示

2. **パフォーマンス最適化**（優先度: 低）
   - 検索クエリの最適化
   - インデックスの調整

---

このドキュメントを新しいチャットで参照することで、プロジェクトの現状を迅速に把握できます。
