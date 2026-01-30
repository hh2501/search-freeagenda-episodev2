import { NextRequest, NextResponse } from 'next/server';
import client, { INDEX_NAME } from '@/lib/db/index';
import { updateEpisodePublishedAt, findEpisodeByTitle } from '@/lib/db/episodes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UpdateRequest {
  episodes: Array<{
    titlePattern: string;
    publishedAt: string; // ISO 8601形式の日付文字列
  }>;
}

export async function POST(request: NextRequest) {
  try {
    if (!client) {
      return NextResponse.json(
        { error: 'OpenSearchクライアントが設定されていません。' },
        { status: 500 }
      );
    }

    const body: UpdateRequest = await request.json();

    if (!body.episodes || !Array.isArray(body.episodes)) {
      return NextResponse.json(
        { error: 'episodes配列が必要です。' },
        { status: 400 }
      );
    }

    const results: Array<{
      titlePattern: string;
      episodeId: string | null;
      success: boolean;
      error?: string;
    }> = [];

    for (const episode of body.episodes) {
      try {
        // タイトルパターンでエピソードを検索
        const episodeId = await findEpisodeByTitle(episode.titlePattern);

        if (!episodeId) {
          results.push({
            titlePattern: episode.titlePattern,
            episodeId: null,
            success: false,
            error: 'エピソードが見つかりませんでした',
          });
          continue;
        }

        // published_atを更新
        const publishedAt = new Date(episode.publishedAt);
        if (isNaN(publishedAt.getTime())) {
          results.push({
            titlePattern: episode.titlePattern,
            episodeId,
            success: false,
            error: '無効な日付形式です',
          });
          continue;
        }

        await updateEpisodePublishedAt(episodeId, publishedAt);

        results.push({
          titlePattern: episode.titlePattern,
          episodeId,
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          titlePattern: episode.titlePattern,
          episodeId: null,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        success: successCount,
        failure: failureCount,
      },
      results,
    });
  } catch (error) {
    console.error('エピソード更新エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'エピソードの更新に失敗しました', details: errorMessage },
      { status: 500 }
    );
  }
}
