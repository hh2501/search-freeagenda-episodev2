import { NextRequest, NextResponse } from 'next/server';
import { fetchEpisodeFromUrl } from '@/lib/rss/parser';
import { saveEpisode, saveTranscript } from '@/lib/db/episodes';
import { fetchTranscript } from '@/lib/transcript/fetcher';
import { clearCache } from '@/lib/cache/search-cache';

/**
 * 複数のエピソードを一度に取得・保存するAPI
 * POST /api/episode/sync-batch
 * Body: { 
 *   "urls": [
 *     "https://listen.style/p/freeagenda/ks04j2tl",
 *     "https://listen.style/p/freeagenda/ecarparv",
 *     ...
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const urls: string[] = body.urls || [];

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'エピソードURLの配列が必要です。body.urls で指定してください。' },
        { status: 400 }
      );
    }

    // キャッシュをクリア（データが更新されるため）
    clearCache();

    const results: Array<{
      url: string;
      success: boolean;
      episodeId?: string;
      title?: string;
      error?: string;
      transcriptSaved?: boolean;
    }> = [];

    // 各エピソードを処理
    for (const episodeUrl of urls) {
      try {
        // URLの形式を確認
        if (!episodeUrl.match(/^https?:\/\/listen\.style\/p\/freeagenda\/[^\/]+/)) {
          results.push({
            url: episodeUrl,
            success: false,
            error: '無効なURL形式です',
          });
          continue;
        }

        // エピソード情報を取得
        const episode = await fetchEpisodeFromUrl(episodeUrl);

        // エピソード情報を保存
        await saveEpisode(episode);

        // 文字起こしを取得して保存
        let transcriptSaved = false;
        try {
          const transcript = await fetchTranscript(episode.listenUrl);
          if (transcript) {
            await saveTranscript(episode.episodeId, transcript);
            transcriptSaved = true;
          }
        } catch (transcriptError) {
          console.warn(`文字起こし取得エラー (${episode.episodeId}):`, transcriptError);
        }

        results.push({
          url: episodeUrl,
          success: true,
          episodeId: episode.episodeId,
          title: episode.title,
          transcriptSaved,
        });

        // レート制限を避けるために少し待機
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`エピソード同期エラー (${episodeUrl}):`, error);
        
        results.push({
          url: episodeUrl,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      total: urls.length,
      successCount,
      failureCount,
      results,
      message: `${successCount}件のエピソードの同期が完了しました。${failureCount > 0 ? `（${failureCount}件失敗）` : ''}`,
    });
  } catch (error) {
    console.error('バッチ同期エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      {
        error: 'バッチ同期に失敗しました',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GETメソッドでも実行可能（開発用）
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
