import { NextResponse } from 'next/server';
import { fetchEpisodesFromRSS } from '@/lib/rss/parser';
import { saveEpisode, saveTranscript, getAllEpisodes } from '@/lib/db/episodes';
import { fetchTranscript } from '@/lib/transcript/fetcher';
import { clearCache } from '@/lib/cache/search-cache';
import client, { INDEX_NAME } from '@/lib/db/index';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RSS_URL = 'https://rss.listen.style/p/freeagenda/rss';

/**
 * 差分同期API（新規エピソードのみ取得）
 * GitHub Actionsから呼び出されることを想定
 */
export async function POST(request: Request) {
  try {
    // 認証チェック（オプション: セキュリティトークンで保護）
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.SYNC_AUTH_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    if (!client) {
      return NextResponse.json(
        { error: 'Elasticsearchクライアントが設定されていません' },
        { status: 500 }
      );
    }

    // 既存のエピソードIDを取得
    const existingEpisodes = await getAllEpisodes();
    const existingEpisodeIds = new Set(existingEpisodes.map(ep => ep.episodeId));

    // RSSフィードからエピソード情報を取得
    const rssEpisodes = await fetchEpisodesFromRSS(RSS_URL);

    // 新規エピソードのみをフィルタリング
    const newEpisodes = rssEpisodes.filter(ep => !existingEpisodeIds.has(ep.episodeId));

    if (newEpisodes.length === 0) {
      return NextResponse.json({
        success: true,
        message: '新規エピソードはありません',
        totalEpisodes: rssEpisodes.length,
        existingEpisodes: existingEpisodes.length,
        newEpisodes: 0,
        syncedEpisodes: 0,
        syncedTranscripts: 0,
      });
    }

    // データ同期前にキャッシュをクリア（データが更新されるため）
    clearCache();

    let syncedCount = 0;
    let transcriptCount = 0;
    const errors: Array<{ episodeId: string; error: string }> = [];

    // 新規エピソードを処理
    for (const episode of newEpisodes) {
      try {
        // エピソード情報を保存
        await saveEpisode(episode);
        syncedCount++;

        // 文字起こしを取得して保存
        if (episode.transcriptUrl) {
          try {
            const transcript = await fetchTranscript(episode.listenUrl);
            if (transcript) {
              await saveTranscript(episode.episodeId, transcript);
              transcriptCount++;
            }
          } catch (transcriptError) {
            // 文字起こし取得エラーは記録するが、処理は続行
            console.warn(`文字起こし取得エラー (${episode.episodeId}):`, transcriptError);
            errors.push({
              episodeId: episode.episodeId,
              error: `文字起こし取得エラー: ${transcriptError instanceof Error ? transcriptError.message : String(transcriptError)}`,
            });
          }
        }

        // レート制限を避けるために少し待機
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        // エピソード保存エラーは記録するが、処理は続行
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`エピソード保存エラー (${episode.episodeId}):`, error);
        errors.push({
          episodeId: episode.episodeId,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${newEpisodes.length}件の新規エピソードを処理しました`,
      totalEpisodes: rssEpisodes.length,
      existingEpisodes: existingEpisodes.length,
      newEpisodes: newEpisodes.length,
      syncedEpisodes: syncedCount,
      syncedTranscripts: transcriptCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('差分同期エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // DNS解決エラーの場合
    if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      return NextResponse.json(
        {
          success: false,
          error: 'RSSフィードの取得に失敗しました（DNS解決エラー）',
          details: 'ネットワーク接続とRSS URLを確認してください。',
          rssUrl: RSS_URL,
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
        success: false,
        error: '差分同期中にエラーが発生しました',
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
export async function GET() {
  return POST(new Request('http://localhost', { method: 'POST' }));
}
