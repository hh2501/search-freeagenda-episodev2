-- エピソードテーブル
CREATE TABLE IF NOT EXISTS episodes (
  id SERIAL PRIMARY KEY,
  episode_id VARCHAR(255) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  published_at TIMESTAMP,
  listen_url TEXT NOT NULL,
  transcript_url TEXT,
  spotify_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文字起こしテキストテーブル
CREATE TABLE IF NOT EXISTS transcripts (
  id SERIAL PRIMARY KEY,
  episode_id VARCHAR(255) UNIQUE NOT NULL REFERENCES episodes(episode_id) ON DELETE CASCADE,
  transcript_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 全文検索用のインデックス
-- 日本語全文検索が使えない場合は、シンプルなインデックスを使用
-- PostgreSQLの日本語全文検索を使用する場合は、pg_trgm拡張機能を有効化してください
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 基本的なインデックス
-- 注意: descriptionとtranscript_textは非常に長い可能性があるため、通常のインデックスは作成しません
-- 全文検索にはGINインデックスを使用しますが、日本語全文検索が使えない場合はインデックスなしでILIKE検索を使用
CREATE INDEX IF NOT EXISTS idx_episodes_title ON episodes(title);
-- descriptionは長すぎる可能性があるため、通常のインデックスは作成しない
-- CREATE INDEX IF NOT EXISTS idx_episodes_description ON episodes(description); -- 削除: テキストが長すぎる
-- transcript_textは全文検索用のGINインデックスのみ（後で作成）
-- CREATE INDEX IF NOT EXISTS idx_transcripts_text ON transcripts(transcript_text); -- 削除: テキストが長すぎる
CREATE INDEX IF NOT EXISTS idx_episodes_published_at ON episodes(published_at DESC);

-- 日本語全文検索が利用可能な場合は、以下のコマンドを手動で実行してください:
-- CREATE INDEX IF NOT EXISTS idx_episodes_title_fts ON episodes USING gin(to_tsvector('japanese', title));
-- CREATE INDEX IF NOT EXISTS idx_episodes_description_fts ON episodes USING gin(to_tsvector('japanese', description));
-- CREATE INDEX IF NOT EXISTS idx_transcripts_text_fts ON transcripts USING gin(to_tsvector('japanese', transcript_text));
