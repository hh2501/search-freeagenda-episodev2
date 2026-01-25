import { NextRequest } from 'next/server';
import { fetchEpisodesFromRSS } from '@/lib/rss/parser';
import { saveEpisode, saveTranscript } from '@/lib/db/episodes';
import { fetchTranscript } from '@/lib/transcript/fetcher';

const RSS_URL = 'https://rss.listen.style/p/freeagenda/rss';

// SSE形式でメッセージを送信するヘルパー関数
function sendSSE(controller: ReadableStreamDefaultController, event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

export async function GET(request: NextRequest) {
  // SSEストリームを作成
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 開始メッセージを送信
        sendSSE(controller, 'start', {
          message: 'データ同期を開始します...',
          timestamp: new Date().toISOString(),
        });

        // RSSフィードからエピソード情報を取得
        sendSSE(controller, 'progress', {
          message: 'RSSフィードを取得中...',
          step: 'rss',
        });

        const episodes = await fetchEpisodesFromRSS(RSS_URL);
        const totalEpisodes = episodes.length;

        // エピソード数の確認メッセージ
        const expectedEpisodes = 385; // 通常回385エピソード + 番外編
        if (totalEpisodes < expectedEpisodes) {
          sendSSE(controller, 'progress', {
            message: `⚠️ 注意: ${totalEpisodes}件のエピソードを取得しました（期待値: ${expectedEpisodes}件以上）`,
            step: 'rss',
            total: totalEpisodes,
            warning: true,
          });
        } else {
          sendSSE(controller, 'progress', {
            message: `✓ ${totalEpisodes}件のエピソードを取得しました（通常回385 + 番外編を含む）`,
            step: 'rss',
            total: totalEpisodes,
          });
        }

        // 処理時間の見積もり（各エピソード約500ms + 処理時間）
        const estimatedMinutes = Math.ceil((totalEpisodes * 0.5) / 60);
        sendSSE(controller, 'progress', {
          message: `予想処理時間: 約${estimatedMinutes}分（${totalEpisodes}エピソード × 約0.5秒/エピソード）`,
          step: 'rss',
          total: totalEpisodes,
          estimatedMinutes,
        });

        let syncedCount = 0;
        let transcriptCount = 0;
        let errorCount = 0;

        // 各エピソードを処理
        for (let i = 0; i < episodes.length; i++) {
          const episode = episodes[i];
          const currentIndex = i + 1;

          // ハートビートを送信（ストリームが生きていることを確認）
          if (currentIndex % 10 === 0) {
            sendSSE(controller, 'heartbeat', {
              message: `ハートビート: ${currentIndex}/${totalEpisodes}`,
              current: currentIndex,
              total: totalEpisodes,
            });
          }

          try {
            // エピソード情報を保存
            sendSSE(controller, 'progress', {
              message: `[${currentIndex}/${totalEpisodes}] エピソードを保存中: ${episode.title.substring(0, 50)}...`,
              step: 'episode',
              current: currentIndex,
              total: totalEpisodes,
              episodeTitle: episode.title,
            });

            // タイムアウト付きで保存
            const savePromise = saveEpisode(episode);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('エピソード保存がタイムアウトしました（30秒）')), 30000)
            );
            
            await Promise.race([savePromise, timeoutPromise]);
            syncedCount++;

            // 文字起こしを取得して保存
            if (episode.transcriptUrl) {
              sendSSE(controller, 'progress', {
                message: `[${currentIndex}/${totalEpisodes}] 文字起こしを取得中...`,
                step: 'transcript',
                current: currentIndex,
                total: totalEpisodes,
              });

              try {
                // タイムアウト付きで文字起こしを取得（60秒）
                const fetchPromise = fetchTranscript(episode.listenUrl);
                const timeoutPromise = new Promise<null>((resolve) => 
                  setTimeout(() => resolve(null), 60000)
                );
                
                const transcript = await Promise.race([fetchPromise, timeoutPromise]);
                
                if (transcript) {
                  // タイムアウト付きで保存（30秒）
                  const savePromise = saveTranscript(episode.episodeId, transcript);
                  const saveTimeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('文字起こし保存がタイムアウトしました（30秒）')), 30000)
                  );
                  
                  await Promise.race([savePromise, saveTimeoutPromise]);
                  transcriptCount++;
                } else {
                  sendSSE(controller, 'progress', {
                    message: `[${currentIndex}/${totalEpisodes}] 文字起こしが見つかりませんでした（タイムアウトまたは取得失敗）`,
                    step: 'transcript',
                    current: currentIndex,
                    total: totalEpisodes,
                    warning: true,
                  });
                }
              } catch (transcriptError) {
                const errorMessage = transcriptError instanceof Error ? transcriptError.message : String(transcriptError);
                sendSSE(controller, 'progress', {
                  message: `[${currentIndex}/${totalEpisodes}] 文字起こし取得エラー: ${errorMessage}`,
                  step: 'transcript',
                  current: currentIndex,
                  total: totalEpisodes,
                  warning: true,
                });
              }
            }

            // 進捗を送信
            sendSSE(controller, 'progress', {
              message: `進捗: ${currentIndex}/${totalEpisodes} (${Math.round((currentIndex / totalEpisodes) * 100)}%)`,
              step: 'sync',
              current: currentIndex,
              total: totalEpisodes,
              syncedEpisodes: syncedCount,
              syncedTranscripts: transcriptCount,
              percentage: Math.round((currentIndex / totalEpisodes) * 100),
            });

            // レート制限を避けるために少し待機
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error) {
            errorCount++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // エラーが発生しても処理を続行
            sendSSE(controller, 'error', {
              message: `[${currentIndex}/${totalEpisodes}] エラー: ${errorMessage} - 処理を続行します`,
              episodeTitle: episode.title,
              error: errorMessage,
              continue: true,
            });
            
            // エラーが発生しても次のエピソードに進む
            console.error(`エピソード ${currentIndex} の処理でエラー:`, error);
          }
        }

        // 完了メッセージを送信
        sendSSE(controller, 'complete', {
          message: 'データ同期が完了しました',
          success: true,
          syncedEpisodes: syncedCount,
          syncedTranscripts: transcriptCount,
          totalEpisodes,
          errorCount,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        // エラーの詳細を取得
        const statusCode = (error as any).meta?.statusCode || (error as any).statusCode;

        // DNS解決エラーの場合
        if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
          sendSSE(controller, 'error', {
            message: 'RSSフィードの取得に失敗しました（DNS解決エラー）',
            error: errorMessage,
            details: 'ネットワーク接続とRSS URLを確認してください。',
            troubleshooting: {
              message: '以下の点を確認してください：',
              steps: [
                '1. インターネット接続が正常か確認',
                '2. RSS URLが正しいか確認: ' + RSS_URL,
                '3. プロキシ設定が必要な場合は、環境変数で設定',
                '4. ファイアウォールやセキュリティソフトがブロックしていないか確認',
              ],
            },
            stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
            continue: false,
          });
        } else {
          // その他のエラーメッセージを送信
          sendSSE(controller, 'error', {
            message: `同期エラー: ${errorMessage}`,
            error: errorMessage,
            statusCode,
            stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
            continue: false,
          });
        }
      } finally {
        // ストリームを閉じる
        controller.close();
      }
    },
  });

  // SSEレスポンスを返す
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
