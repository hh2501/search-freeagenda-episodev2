// Elastic Serverless用のフォールバック設定（kuromojiが利用できない場合）
// このファイルは参考用です。必要に応じて lib/db/index.ts に適用してください。

export const ELASTIC_FALLBACK_INDEX_SETTINGS = {
  settings: {
    analysis: {
      analyzer: {
        japanese: {
          type: 'custom',
          // kuromojiが利用できない場合の代替設定
          tokenizer: 'standard', // または 'icu_tokenizer'（icu_analysisプラグインが必要）
          char_filter: ['icu_normalizer'],
          filter: [
            'lowercase',
            'cjk_width', // CJK文字の全角/半角を統一
          ],
        },
      },
    },
  },
  mappings: {
    properties: {
      episode_id: { type: 'keyword' },
      title: {
        type: 'text',
        analyzer: 'japanese',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      description: {
        type: 'text',
        analyzer: 'japanese',
      },
      published_at: { type: 'date' },
      listen_url: { type: 'keyword' },
      transcript_url: { type: 'keyword' },
      spotify_url: { type: 'keyword' },
      transcript_text: {
        type: 'text',
        analyzer: 'japanese',
      },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
};

// kuromojiが利用可能な場合の設定（現在の設定）
export const OPENSEARCH_KUROMOJI_INDEX_SETTINGS = {
  settings: {
    analysis: {
      analyzer: {
        japanese: {
          type: 'custom',
          tokenizer: 'kuromoji_tokenizer',
          char_filter: ['icu_normalizer'],
          filter: [
            'kuromoji_baseform',
            'kuromoji_part_of_speech',
            'kuromoji_stemmer',
            'ja_stop',
            'kuromoji_number',
            'lowercase',
          ],
        },
      },
    },
  },
  mappings: {
    properties: {
      episode_id: { type: 'keyword' },
      title: {
        type: 'text',
        analyzer: 'japanese',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      description: {
        type: 'text',
        analyzer: 'japanese',
      },
      published_at: { type: 'date' },
      listen_url: { type: 'keyword' },
      transcript_url: { type: 'keyword' },
      spotify_url: { type: 'keyword' },
      transcript_text: {
        type: 'text',
        analyzer: 'japanese',
      },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
};
