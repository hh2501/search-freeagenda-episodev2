import { NextRequest, NextResponse } from 'next/server';
import client, { INDEX_NAME } from '@/lib/db/index';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST: エピソード番号とタイトルのリストからエピソードIDを取得
 */
export async function POST(request: NextRequest) {
  if (!client) {
    return NextResponse.json(
      { error: 'OpenSearchが設定されていません。' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { episodes } = body;

    if (!Array.isArray(episodes)) {
      return NextResponse.json(
        { error: 'episodesは配列である必要があります。' },
        { status: 400 }
      );
    }

    // 全エピソードを取得
    const response = await client.search({
      index: INDEX_NAME,
      body: {
        query: { match_all: {} },
        size: 1000,
        _source: ['episode_id', 'title'],
      },
    });

    const hits = (response as any).hits?.hits || (response as any).body?.hits?.hits || [];
    
    // タイトルをキーとしたマップを作成
    const titleMap = new Map<string, string>();
    hits.forEach((hit: any) => {
      const title = hit._source.title;
      const episodeId = hit._source.episode_id;
      titleMap.set(title, episodeId);
    });

    // エピソード番号をキーとしたマップも作成
    const numberMap = new Map<string, string>();
    hits.forEach((hit: any) => {
      const title = hit._source.title;
      const episodeNumberMatch = title.match(/#(\d+)/);
      if (episodeNumberMatch) {
        const episodeNumber = episodeNumberMatch[1];
        numberMap.set(episodeNumber, hit._source.episode_id);
      }
    });

    // リクエストされたエピソードのIDをマッチング
    const matchedEpisodes = episodes.map((ep: any) => {
      // タイトルでマッチングを試みる
      let episodeId = titleMap.get(ep.title);
      
      // タイトルでマッチしない場合は、エピソード番号でマッチング
      if (!episodeId && ep.episodeNumber) {
        episodeId = numberMap.get(ep.episodeNumber) || '';
      }

      return {
        ...ep,
        episodeId: episodeId || ep.episodeId || '',
      };
    });

    return NextResponse.json({ episodes: matchedEpisodes });
  } catch (error: any) {
    console.error('エピソードID取得エラー:', error);
    return NextResponse.json(
      { error: 'エピソードIDの取得に失敗しました。' },
      { status: 500 }
    );
  }
}
