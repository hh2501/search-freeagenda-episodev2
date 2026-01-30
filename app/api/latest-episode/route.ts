import { NextResponse } from 'next/server';
import client, { INDEX_NAME } from '@/lib/db/index';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * タイトルからエピソード番号を抽出
 * 例: "#498_タイトル" -> "498"
 */
function extractEpisodeNumber(title: string): string | null {
  const match = title.match(/^#(\d+)/);
  return match ? match[1] : null;
}

export async function GET() {
  try {
    if (!client) {
      return NextResponse.json(
        { error: 'OpenSearchクライアントが設定されていません。' },
        { status: 500 }
      );
    }

    // 最新エピソードを取得（公開日時で降順ソート、1件のみ）
    const response = await client.search({
      index: INDEX_NAME,
      body: {
        query: { match_all: {} },
        sort: [{ published_at: { order: 'desc' } }],
        size: 1,
      },
    });

    // OpenSearch 3.xでは、レスポンスが直接返される
    const hits = (response as any).hits?.hits || (response as any).body?.hits?.hits || [];

    if (hits.length === 0) {
      return NextResponse.json(
        { error: 'エピソードが見つかりませんでした。' },
        { status: 404 }
      );
    }

    const latestEpisode = hits[0]._source;
    const episodeNumber = extractEpisodeNumber(latestEpisode.title);

    return NextResponse.json({
      episodeNumber: episodeNumber || null,
      title: latestEpisode.title,
      publishedAt: latestEpisode.published_at,
      listenUrl: latestEpisode.listen_url,
      episodeId: latestEpisode.episode_id,
    });
  } catch (error) {
    console.error('最新エピソード取得エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: '最新エピソードの取得に失敗しました', details: errorMessage },
      { status: 500 }
    );
  }
}
