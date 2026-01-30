import { NextResponse } from 'next/server';
import { fetchEpisodesFromRSS } from '@/lib/rss/parser';
import { saveEpisode, saveTranscript } from '@/lib/db/episodes';
import { fetchTranscript } from '@/lib/transcript/fetcher';
import { clearCache } from '@/lib/cache/search-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RSS_URL = 'https://rss.listen.style/p/freeagenda/rss';

export async function GET() {
  // 開発用: GETメソッドでも実行可能
  return POST();
}

export async function POST() {
  try {
    // データ同期前にキャッシュをクリア（データが更新されるため）
    clearCache();
    
    // RSSフィードからエピソード情報を取得
    const episodes = await fetchEpisodesFromRSS(RSS_URL);
    
    let syncedCount = 0;
    let transcriptCount = 0;

    for (const episode of episodes) {
      // エピソード情報を保存
      await saveEpisode(episode);
      syncedCount++;

      // 文字起こしを取得して保存
      if (episode.transcriptUrl) {
        const transcript = await fetchTranscript(episode.listenUrl);
        if (transcript) {
          await saveTranscript(episode.episodeId, transcript);
          transcriptCount++;
        }
      }

      // レート制限を避けるために少し待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: true,
      syncedEpisodes: syncedCount,
      syncedTranscripts: transcriptCount,
    });
  } catch (error) {
    console.error('同期エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // エラーの詳細を取得
    const statusCode = (error as any).meta?.statusCode || (error as any).statusCode;
    
    // DNS解決エラーの場合
    if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      return NextResponse.json(
        { 
          error: 'RSSフィードの取得に失敗しました',
          details: 'DNS解決に失敗しました。ネットワーク接続とRSS URLを確認してください。',
          troubleshooting: {
            message: '以下の点を確認してください：',
            steps: [
              '1. インターネット接続が正常か確認',
              '2. RSS URLが正しいか確認: ' + RSS_URL,
              '3. プロキシ設定が必要な場合は、環境変数で設定',
              '4. ファイアウォールやセキュリティソフトがブロックしていないか確認',
            ],
          },
          errorDetails: process.env.NODE_ENV === 'development' ? {
            message: errorMessage,
            stack: errorStack,
            rssUrl: RSS_URL,
          } : undefined,
        },
        { status: 500 }
      );
    }
    
    // 403エラーの場合
    if (statusCode === 403 || errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { 
          error: 'OpenSearchへのアクセスが拒否されました（403 Forbidden）',
          details: '認証情報またはアクセスポリシーを確認してください。',
          troubleshooting: {
            guide: 'TROUBLESHOOTING_403.md を参照してください',
            commonIssues: [
              '認証情報（OPENSEARCH_USERNAME, OPENSEARCH_PASSWORD）が正しく設定されているか',
              'エンドポイントURLの末尾にスラッシュがないか',
              'AWSコンソールでアクセスポリシーが正しく設定されているか',
              'IP制限が設定されている場合、現在のIPアドレスが許可されているか',
            ],
          },
          errorDetails: process.env.NODE_ENV === 'development' ? {
            message: errorMessage,
            statusCode,
            stack: errorStack,
            meta: (error as any).meta,
          } : undefined,
        },
        { status: 403 }
      );
    }
    
    // 401エラーの場合
    if (statusCode === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { 
          error: '認証に失敗しました（401 Unauthorized）',
          details: 'ユーザー名とパスワードが正しいか確認してください。',
          errorDetails: process.env.NODE_ENV === 'development' ? {
            message: errorMessage,
            statusCode,
            stack: errorStack,
          } : undefined,
        },
        { status: 401 }
      );
    }
    
    // その他のエラー
    return NextResponse.json(
      { 
        error: '同期中にエラーが発生しました', 
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
        errorDetails: process.env.NODE_ENV === 'development' ? {
          statusCode,
          meta: (error as any).meta,
        } : undefined,
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    );
  }
}
