# 検索キーワードのスプレッドシート同期

検索キーワード候補は Google スプレッドシートの **A列** で管理し、Google Apps Script（GAS）が GitHub API 経由でリポジトリ内の `lib/search-keywords.json` を更新します。

## 概要

- **スプレッドシート**: A列にキーワードを1行1件で記載（空行は無視、前後空白は trim、重複は自動で除去）
- **同期先**: リポジトリの `lib/search-keywords.json`（文字列配列の JSON）
- **方式**: GAS がスプレッドシートの A 列を読み取り、GitHub Contents API でファイルを PUT してコミット
- **重要**: `TARGET_SHEET_GID` には **検索キーワードだけが A 列に並んでいるシート** の gid を指定すること。URL の gid（例: 1344358640）がエピソード一覧など別用途のシートの場合は、検索キーワード専用のシートを追加し、そのシートの gid を設定すること

## セットアップ手順

### 1. GAS プロジェクトの作成

1. 対象の Google スプレッドシートを開く
2. メニュー **拡張機能** → **Apps Script**
3. 新しいプロジェクトが開いたら、既定の `Code.gs` の内容を削除し、リポジトリの **scripts/sync-search-keywords.gs** の内容をすべてコピーして貼り付け、保存

### 2. スクリプトプロパティの設定

1. GAS エディタで **プロジェクトの設定**（歯車アイコン）を開く
2. **スクリプト プロパティ** で以下を追加

| プロパティ名 | 値 | 必須 |
|-------------|-----|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token（classic、`repo` スコープ） | ○ |
| `GITHUB_OWNER` | リポジトリのオーナー（ユーザー名または組織名） | ○ |
| `GITHUB_REPO` | リポジトリ名（例: `search-freeagenda-episodev2`） | ○ |
| `BRANCH` | 更新対象ブランチ（省略時は `main`） | △ |
| `SHEET_ID` | スプレッドシート ID（URL の `/d/` と `/edit` の間） | ○ |
| `TARGET_SHEET_GID` | A列を読むシートの gid（**検索キーワードのみ**が並んでいるシートを指定。省略時は先頭シート） | △ |
| `SKIP_ROWS` | 先頭からスキップする行数（例: 1＝1行目をヘッダーとして無視） | △ |

- **GITHUB_TOKEN**: [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens) で `repo` にチェックを入れたトークンを作成して使用する

### 3. トリガーの設定

次のいずれかを設定する。

**A. 手動実行のみ**

- キーワードを追加・変更したあと、GAS エディタで `syncSearchKeywords` を選択して **実行** する

**B. スプレッドシートの編集時に自動実行**

1. GAS エディタで **トリガー**（時計アイコン）→ **トリガーを追加**
2. 関数: `syncSearchKeywordsOnEdit`
3. イベントのソース: **スプレッドシートから**
4. イベントの種類: **編集時**
5. 保存

- A列を編集したときだけ同期する（`TARGET_SHEET_GID` を設定している場合は、そのシートの A 列のみ）
- 初回は手動で `syncSearchKeywords` を一度実行し、スクリプトの権限を許可しておく

**C. 時間駆動（定期実行）**

1. トリガーで関数: `syncSearchKeywords`
2. イベントのソース: **時間主導型**
3. 時間の間隔: 1時間ごと など

### 4. 動作確認

1. スプレッドシートの A 列にキーワードを数件用意（既存の `lib/search-keywords.json` と重複していてもよい）
2. GAS で `syncSearchKeywords` を実行
3. GitHub のリポジトリで `lib/search-keywords.json` が更新され、コミットメッセージが `chore: sync search keywords from Google Sheet` になっていることを確認

## 注意事項

- **スプレッドシートを正とする**: 同期は常に「A列の内容で JSON を上書き」する。リポジトリ側で手動編集した内容は、次回同期で上書きされる
- **409 Conflict**: 同時に別のコミットが入っていると GitHub API が 409 を返す。その場合はリポジトリを pull してから再度実行するか、手動でマージ後に再実行する
- **レート制限**: トークン付きリクエストであれば十分な枠がある。onEdit で「内容に変更があるときだけ PUT」する実装のため、無駄なコミットは発生しにくい

## トラブルシューティング

| 現象 | 対処 |
|------|------|
| `Missing required script properties` | 上記の必須プロパティがすべて設定されているか確認 |
| `Sheet with gid ... not found` | `TARGET_SHEET_GID` がスプレッドシートのシート gid と一致しているか確認（URL の `#gid=`） |
| `GitHub GET failed: 404` | リポジトリ名・オーナー・ブランチ、および `lib/search-keywords.json` が存在するか確認 |
| `GitHub PUT failed: 403` | トークンのスコープに `repo` が含まれているか、リポジトリへの書き込み権限があるか確認 |
| onEdit が動かない | トリガーが「編集時」で `syncSearchKeywordsOnEdit` になっているか確認。初回は手動実行で権限を付与する |
| JSON が `"false"`,`"true"`,`"title"` や `#1 ...` のようなエピソード名になっている | エピソード一覧シートを読んでいないか確認。検索キーワード専用のシートを作成し、そのシートの gid を `TARGET_SHEET_GID` に設定する。スクリプトは `true`/`false`/`title` および `#` で始まる行は自動で除外する |
