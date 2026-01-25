import { NextResponse } from 'next/server';
import client, { INDEX_NAME } from '@/lib/db/index';

// APIルートを動的として明示的に設定（静的生成を無効化）
export const dynamic = 'force-dynamic';

/**
 * インデックスを再作成するAPI
 * 注意: このAPIは既存のインデックスを削除して再作成します
 * すべてのデータが削除されるため、実行前にデータ同期が必要です
 */
export async function POST() {
  try {
    if (!client) {
      return NextResponse.json(
        { error: 'OpenSearchクライアントが設定されていません。' },
        { status: 503 }
      );
    }

    // 既存のインデックスを削除
    const existsResponse = await client.indices.exists({ index: INDEX_NAME });
    // OpenSearchクライアントのexistsメソッドはbooleanを返すが、型定義が異なる場合があるため型アサーションを使用
    const exists = typeof existsResponse === 'boolean' 
      ? existsResponse 
      : (existsResponse as any).body === true || (existsResponse as any).statusCode === 200;

    if (exists) {
      await client.indices.delete({ index: INDEX_NAME });
    }

    // インデックスを再作成（日本語全文検索用のマッピング設定）
    await client.indices.create({
      index: INDEX_NAME,
      body: {
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
      },
    });

    return NextResponse.json({
      success: true,
      message: 'インデックスを再作成しました。データ同期を実行してください: http://localhost:3000/api/sync',
    });
  } catch (error) {
    console.error('インデックス再作成エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: 'インデックス再作成中にエラーが発生しました', 
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
