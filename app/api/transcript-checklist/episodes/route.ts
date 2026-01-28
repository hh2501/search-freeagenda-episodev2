import { NextResponse } from 'next/server';
import client, { INDEX_NAME } from '@/lib/db/index';

/**
 * GET: すべてのエピソードを取得（エピソード番号順）
 */
export async function GET() {
  if (!client) {
    return NextResponse.json(
      { error: 'OpenSearchが設定されていません。' },
      { status: 503 }
    );
  }

  try {
    // すべてのエピソードを取得
    const response = await client.search({
      index: INDEX_NAME,
      body: {
        query: { match_all: {} },
        sort: [{ published_at: { order: 'asc' } }], // 日付の若い順
        size: 1000,
        _source: ['episode_id', 'title', 'published_at'],
      },
    });

    const hits = (response as any).hits?.hits || (response as any).body?.hits?.hits || [];

    const episodes = hits.map((hit: any) => {
      const source = hit._source;
      // エピソード番号をタイトルから抽出（例: "#385 タイトル" → "385"）
      const episodeNumberMatch = source.title?.match(/#(\d+)/);
      const episodeNumber = episodeNumberMatch ? episodeNumberMatch[1] : '';

      return {
        episodeId: source.episode_id,
        episodeNumber,
        title: source.title,
        publishedAt: source.published_at,
      };
    });

    return NextResponse.json({ episodes });
  } catch (error: any) {
    console.error('エピソード一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'エピソード一覧の取得に失敗しました。' },
      { status: 500 }
    );
  }
}
