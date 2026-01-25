import { NextRequest, NextResponse } from 'next/server';
import { fetchEpisodeFromUrl } from '@/lib/rss/parser';
import { saveEpisode, saveTranscript } from '@/lib/db/episodes';
import { fetchTranscript } from '@/lib/transcript/fetcher';
import { clearCache } from '@/lib/cache/search-cache';

// APIルートを動的として明示的に設定（静的生成を無効化）
export const dynamic = 'force-dynamic';

/**
 * 個別のエピソードを取得・保存するAPI
 * POST /api/episode/sync?url=https://listen.style/p/freeagenda/ks04j2tl
 * または
 * POST /api/episode/sync
 * Body: { "url": "https://listen.style/p/freeagenda/ks04j2tl" }
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const urlFromQuery = searchParams.get('url');
    
    let episodeUrl: string;
    
    if (urlFromQuery) {
      episodeUrl = urlFromQuery;
    } else {
      // リクエストボディから取得
      const body = await request.json().catch(() => ({}));
      episodeUrl = body.url;
    }

    if (!episodeUrl) {
      return NextResponse.json(
        { error: 'エピソードURLが必要です。?url=... または body.url で指定してください。' },
        { status: 400 }
      );
    }

    // URLの形式を確認
    if (!episodeUrl.match(/^https?:\/\/listen\.style\/p\/freeagenda\/[^\/]+/)) {
      return NextResponse.json(
        { error: '無効なURL形式です。listen.styleのエピソードURLを指定してください。' },
        { status: 400 }
      );
    }

    // キャッシュをクリア（データが更新されるため）
    clearCache();

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

    return NextResponse.json({
      success: true,
      episode: {
        episodeId: episode.episodeId,
        title: episode.title,
        description: episode.description,
        publishedAt: episode.publishedAt,
        listenUrl: episode.listenUrl,
      },
      transcriptSaved,
      message: 'エピソードの同期が完了しました。',
    });
  } catch (error) {
    console.error('エピソード同期エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // DNS解決エラーの場合
    if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      return NextResponse.json(
        {
          error: 'エピソードの取得に失敗しました（DNS解決エラー）',
          details: 'ネットワーク接続とURLを確認してください。',
          troubleshooting: {
            message: '以下の点を確認してください：',
            steps: [
              '1. インターネット接続が正常か確認',
              '2. エピソードURLが正しいか確認',
              '3. プロキシ設定が必要な場合は、環境変数で設定',
              '4. ファイアウォールやセキュリティソフトがブロックしていないか確認',
            ],
          },
          errorDetails: process.env.NODE_ENV === 'development' ? {
            message: errorMessage,
            stack: errorStack,
          } : undefined,
        },
        { status: 500 }
      );
    }

    // HTTPエラーの場合
    if (errorMessage.includes('HTTP')) {
      return NextResponse.json(
        {
          error: 'エピソードの取得に失敗しました',
          details: errorMessage,
          errorDetails: process.env.NODE_ENV === 'development' ? {
            message: errorMessage,
            stack: errorStack,
          } : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'エピソードの同期に失敗しました',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
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
