# 文字起こし保存時のチェックリスト GitHub 同期

エピソードの文字起こしを編集画面で保存すると、該当エピソードを `public/transcript-checklist.json` 上で `checked: true` に更新し、GitHub に 1 コミットする仕組みです。文字起こし修正状況ページはこの JSON を参照するため、次のデプロイ後に反映されます。

## 概要

- **トリガー**: エピソード詳細ページ（`/episode/[id]`）で「保存」ボタンを押し、文字起こしの PUT が成功したとき
- **処理**: サーバー（API Route）が GitHub Contents API で `public/transcript-checklist.json` を GET → 該当エピソードを `episodeId` または `title` で特定 → `checked: true`, `checkedAt: 現在時刻` をセット → UTF-8 で Base64 エンコードして PUT（1 コミット）
- **反映**: コミット後に Vercel のデプロイが走り、デプロイ完了後に文字起こし修正状況ページで「チェック済み」として表示される（数分かかることがあります）

## 環境変数

Vercel の Environment Variables（およびローカル開発時の `.env.local`）に以下を設定する。

| 変数名 | 説明 |
|--------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token（classic、`repo` スコープ） |
| `GITHUB_OWNER` | リポジトリのオーナー（ユーザー名または組織名） |
| `GITHUB_REPO` | リポジトリ名 |

省略可能:

- `GITHUB_BRANCH` … 更新対象ブランチ。未設定時は `VERCEL_GIT_COMMIT_REF` または `main` を使用

検索キーワード同期（GAS）で同じリポジトリを触っている場合は、同じトークン・オーナー・リポジトリを流用してよい。

## 動作

1. ユーザーが文字起こしを編集して「保存」をクリック
2. `PUT /api/episode/[id]/transcript` に `transcriptText` と `title` を送信
3. API が OpenSearch に文字起こしを保存
4. 保存成功後、`lib/transcript-checklist/github-sync` の `updateChecklistChecked(episodeId, title)` を実行
5. 環境変数が未設定の場合は何もせず `checklistUpdated: false` を返す
6. GitHub 上で該当エピソード（`episodeId` または `title` 一致）を `checked: true` に更新してコミット
7. レスポンスに `checklistUpdated: true/false` を含めて返す。チェックリスト更新に失敗しても文字起こし保存は成功のまま

## 注意事項

- チェックリストに該当するエピソード（`episodeId` または `title` が一致する行）がない場合は、GitHub への PUT は行わず `checklistUpdated: false` となる
- 同じエピソードで何度保存しても、チェックリスト上は「そのエピソードを checked にする」だけなので冪等
