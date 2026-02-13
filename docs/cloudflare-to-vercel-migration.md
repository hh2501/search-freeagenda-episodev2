# Cloudflare 削除・Vercel 直結 実装手順

このドキュメントは、`search-freeagenda.fun` を Cloudflare 経由から Vercel 直結に切り替えるための具体的な操作手順です。

## 前提

- **現在の構成**: ムームードメイン(NS) → Cloudflare(DNS) → Vercel(ホスティング)
- **目標の構成**: ムームードメイン(NS) → Vercel(DNS + ホスティング)

---

## 実装チェックリスト

### Step 1: Vercel 側の準備

**サイト**: [Vercel Dashboard](https://vercel.com/dashboard)

- [ ] 対象プロジェクトで `search-freeagenda.fun` がドメインとして追加済みか確認
- [ ] プロジェクト → Settings → Domains で `search-freeagenda.fun` を確認
- [ ] 「DNS Records」で必要なレコードが自動設定されることを確認
- [ ] 以下をメモ（Step 2 で使用）:
  - `ns1.vercel-dns.com`
  - `ns2.vercel-dns.com`

---

### Step 2: ムームードメインでネームサーバーを変更（メイン作業）

**サイト**: [ムームードメイン コントロールパネル](https://muumuu-domain.com/)

1. [ ] ムームードメインにログイン
2. [ ] `search-freeagenda.fun` を選択
3. [ ] **ネームサーバー設定**（NSの設定）を開く
   - 「DNS設定」「ネームサーバー」「権威DNS」などのメニューから NS 変更画面を探す
   - ※「カスタム設定のセットアップ情報変更」（Aレコード編集）ではない
4. [ ] 現在のネームサーバー（Cloudflare）を以下に変更:

   | 項目 | 変更前（Cloudflare） | 変更後（Vercel） |
   |------|----------------------|------------------|
   | NS1  | `elias.ns.cloudflare.com` | `ns1.vercel-dns.com` |
   | NS2  | `samara.ns.cloudflare.com` | `ns2.vercel-dns.com` |

5. [ ] 変更を保存

**注意**: NS を Vercel に変更すると、ムームードメイン側のカスタム設定（Aレコード 216.198.79.1）は参照されなくなります。編集の必要はありません。

---

### Step 3: 伝播（propagation）の待機

- [ ] 変更反映まで待機（多くは数時間以内、最大 48〜72 時間）
- [ ] 状態確認: [dnschecker.org](https://dnschecker.org) で `search-freeagenda.fun` を検索し、Vercel の IP に解決されているか確認

---

### Step 4: Cloudflare 側の後片付け（任意）

**サイト**: [Cloudflare Dashboard](https://dash.cloudflare.com/)

- [ ] NS を Vercel に変更した後、Cloudflare の DNS は使われなくなる
- [ ] `search-freeagenda.fun` ゾーンを Cloudflare から削除して構わない（任意）
- [ ] 削除しない場合も動作には影響しない

---

### Step 5: 動作確認

- [ ] `https://search-freeagenda.fun` にアクセス
- [ ] サイトが正常に表示されることを確認
- [ ] SSL が有効か確認（反映まで数分〜数時間かかることがある）
- [ ] Vercel ダッシュボードでドメインの「有効」状態を確認

---

## サイト別操作一覧

| サイト | 操作 | 画面 |
|--------|------|------|
| **ムームードメイン** | NS の変更 | ネームサーバー設定画面 |
| **Vercel** | 事前確認のみ | Domains / DNS Records |
| **Cloudflare** | 後片付け（任意） | ゾーン削除 |

---

## トラブルシューティング

- **ドメインが解決されない**: propagation の待機時間を確認。dnschecker.org でグローバルな反映状況を確認
- **SSL が有効にならない**: Vercel は Let's Encrypt で自動発行。数分〜数時間待つ
- **Vercel でドメインが「Invalid Configuration」**: NS の伝播が完了していない可能性。時間をおいて再確認
