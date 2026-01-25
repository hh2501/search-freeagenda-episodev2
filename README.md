# フリーアジェンダ エピソード検索サービス

フリーアジェンダというポッドキャストの特定エピソードを検索できるサービスです。ユーザーが覚えている単語をサーチバーに入力すると、該当するエピソードが検索結果として返ってきます。

## 機能

- RSSフィードからエピソード情報を自動取得
- 各エピソードの文字起こしテキストを取得・保存
- **高精度な全文検索によるキーワード検索**
  - フレーズマッチ（完全一致）を優先
  - 単語マッチ（部分一致）も対応
  - 日本語形態素解析（kuromoji）による正確な検索
  - **完全一致検索機能**: キーワードを「"」で囲むと完全一致検索（例: "フリーアジェンダ"）
- 検索結果のハイライト表示
- エピソード詳細ページへのリンク
- **自動データ更新**: GitHub Actionsで毎日自動同期

## 技術スタック

- **フロントエンド**: Next.js 14, React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: Elastic Cloud Serverless（全文検索対応、日本語対応）
- **自動更新**: GitHub Actions（完全無料）
- **その他**: RSS Parser, Cheerio（HTMLパース）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
# Elastic Cloud Serverlessエンドポイント
OPENSEARCH_ENDPOINT=https://your-deployment.es.ap-northeast-1.aws.elastic.cloud:443

# API Key認証
OPENSEARCH_API_KEY=your-api-key-here
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### 4. データの同期

エピソード情報と文字起こしデータを取得するには、以下のAPIエンドポイントを呼び出してください：

```bash
curl -X POST http://localhost:3000/api/sync
```

または、ブラウザで直接アクセス：
- http://localhost:3000/api/sync

## GitHub Actionsによる自動更新

このプロジェクトは、GitHub Actionsを使用して毎日自動的に新規エピソードを取得します。

### セットアップ手順

詳細なセットアップ手順は `markdownfiles/GITHUB_REPOSITORY_SETUP.md` を参照してください。

**簡単な手順:**
1. GitHubリポジトリを作成
2. コードをプッシュ
3. GitHub Secretsを設定（`VERCEL_URL`, `SYNC_AUTH_TOKEN`）
4. Vercel環境変数を設定（`SYNC_AUTH_TOKEN`）

### 実行スケジュール

- **自動実行**: 毎日午前2時（JST）
- **手動実行**: GitHub ActionsのUIからいつでも実行可能

## デプロイ

### Vercelへのデプロイ

1. [Vercel](https://vercel.com/)にアカウントを作成
2. GitHubリポジトリを接続
3. 環境変数を設定
4. デプロイ

詳細は `markdownfiles/GITHUB_ACTIONS_SETUP.md` を参照してください。

## 参考ドキュメント

- `markdownfiles/GITHUB_REPOSITORY_SETUP.md` - GitHubリポジトリ作成・セットアップガイド
- `markdownfiles/GITHUB_ACTIONS_SETUP.md` - GitHub Actionsセットアップガイド
- `markdownfiles/ELASTIC_SERVERLESS_MIGRATION_GUIDE.md` - Elastic Cloud Serverless移行ガイド
- `markdownfiles/todo.md` - タスク管理

## ライセンス

このプロジェクトは個人利用を目的としています。
