import { NextRequest, NextResponse } from 'next/server';
import client, { INDEX_NAME } from '@/lib/db/index';

/**
 * GET: チェック済みエピソードの一覧を取得
 */
export async function GET() {
  if (!client) {
    return NextResponse.json(
      { error: 'OpenSearchが設定されていません。' },
      { status: 503 }
    );
  }

  try {
    // すべてのエピソードを取得（transcript_checkedフィールドを含む）
    const response = await client.search({
      index: INDEX_NAME,
      body: {
        query: { match_all: {} },
        sort: [{ published_at: { order: 'desc' } }],
        size: 1000,
        _source: ['episode_id', 'title', 'published_at', 'transcript_checked', 'transcript_checked_at'],
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
        checked: source.transcript_checked === true,
        checkedAt: source.transcript_checked_at || null,
      };
    });

    // チェック済みのエピソードのみを返す
    const checkedEpisodes = episodes.filter((ep: any) => ep.checked);

    return NextResponse.json({ episodes: checkedEpisodes });
  } catch (error: any) {
    console.error('チェックリスト取得エラー:', error);
    return NextResponse.json(
      { error: 'チェックリストの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

/**
 * POST: エピソードのチェック状態を更新
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
    const { episodeId, checked } = body;

    if (!episodeId || typeof checked !== 'boolean') {
      return NextResponse.json(
        { error: 'episodeIdとcheckedが必要です。' },
        { status: 400 }
      );
    }

    // エピソードのチェック状態を更新
    await client.update({
      index: INDEX_NAME,
      id: episodeId,
      body: {
        doc: {
          transcript_checked: checked,
          transcript_checked_at: checked ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
      },
      refresh: true,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('チェック状態更新エラー:', error);
    
    // エピソードが存在しない場合
    if (error.meta?.statusCode === 404) {
      return NextResponse.json(
        { error: 'エピソードが見つかりません。' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'チェック状態の更新に失敗しました。' },
      { status: 500 }
    );
  }
}
