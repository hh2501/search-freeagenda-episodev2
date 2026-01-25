'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ProgressEvent {
  message: string;
  step?: string;
  current?: number;
  total?: number;
  syncedEpisodes?: number;
  syncedTranscripts?: number;
  percentage?: number;
  episodeTitle?: string;
  warning?: boolean;
  error?: string;
  success?: boolean;
  errorCount?: number;
  timestamp?: string;
}

export default function SyncPage() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [logs, setLogs] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<{
    success: boolean;
    syncedEpisodes: number;
    syncedTranscripts: number;
    totalEpisodes: number;
    errorCount: number;
  } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 本番環境ではアクセスを拒否
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.push('/');
    }
  }, [router]);

  const handleStartSync = () => {
    setIsRunning(true);
    setProgress(null);
    setLogs([]);
    setResult(null);

    // EventSourceを作成してSSEストリームに接続
    const eventSource = new EventSource('/api/sync/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE接続が開きました');
    };

    eventSource.addEventListener('start', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setProgress(data);
      setLogs((prev) => [...prev, data]);
    });

    eventSource.addEventListener('progress', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setProgress(data);
      setLogs((prev) => [...prev, data]);
    });

    eventSource.addEventListener('complete', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setProgress(data);
      setLogs((prev) => [...prev, data]);
      setResult({
        success: data.success,
        syncedEpisodes: data.syncedEpisodes,
        syncedTranscripts: data.syncedTranscripts,
        totalEpisodes: data.totalEpisodes,
        errorCount: data.errorCount || 0,
      });
      setIsRunning(false);
      eventSource.close();
    });

    eventSource.addEventListener('error', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setProgress(data);
      setLogs((prev) => [...prev, data]);
      // エラーが発生しても続行フラグがあれば処理を続ける
      if (!data.continue) {
        setIsRunning(false);
        eventSource.close();
      }
    });

    eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      // ハートビートを受信したことをログに記録（オプション）
      setLogs((prev) => [...prev, { ...data, message: `💓 ${data.message}` }]);
    });

    eventSource.onerror = (error) => {
      console.error('SSE接続エラー:', error);
      // 接続エラーの場合、自動再接続を試みる
      if (eventSource.readyState === EventSource.CLOSED) {
        setLogs((prev) => [...prev, {
          message: '⚠️ 接続が切断されました。再接続を試みます...',
          warning: true,
          timestamp: new Date().toISOString(),
        }]);
        // 3秒後に再接続を試みる
        setTimeout(() => {
          if (isRunning) {
            handleStartSync();
          }
        }, 3000);
      }
    };
  };

  const handleStopSync = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsRunning(false);
  };

  useEffect(() => {
    // コンポーネントのアンマウント時にEventSourceを閉じる
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            データ同期
          </h1>
          <p className="text-gray-600 text-base">
            RSSフィードからエピソード情報と文字起こしデータを取得して、Elasticsearchに同期します。
          </p>
        </div>

        <div className="md-elevated-card p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleStartSync}
              disabled={isRunning}
              className="md-filled-button"
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  同期中...
                </span>
              ) : (
                '同期を開始'
              )}
            </button>
            {isRunning && (
              <button
                onClick={handleStopSync}
                className="md-outlined-button border-red-500 text-red-600 hover:bg-red-50"
              >
                停止
              </button>
            )}
          </div>

          {/* 進捗表示 */}
          {progress && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-sm font-medium ${
                    progress.warning ? 'text-yellow-700' : 
                    progress.error ? 'text-red-700' : 
                    'text-gray-900'
                  }`}>
                    {progress.message}
                  </span>
                  {progress.percentage !== undefined && (
                    <span className="text-sm font-semibold text-gray-900">
                      {progress.percentage}%
                    </span>
                  )}
                </div>
                {progress.percentage !== undefined && (
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-freeagenda-dark h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {progress.current !== undefined && progress.total !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">処理中</span>
                    <span className="text-gray-900 font-semibold">
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                )}

                {progress.syncedEpisodes !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">同期済みエピソード</span>
                    <span className="text-gray-900 font-semibold">
                      {progress.syncedEpisodes}件
                    </span>
                  </div>
                )}

                {progress.syncedTranscripts !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">同期済み文字起こし</span>
                    <span className="text-gray-900 font-semibold">
                      {progress.syncedTranscripts}件
                    </span>
                  </div>
                )}
              </div>

              {progress.episodeTitle && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">現在処理中:</span>
                  <p className="text-sm text-gray-900 font-medium mt-1 line-clamp-2">
                    {progress.episodeTitle}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 結果表示 */}
          {result && (
            <div
              className={`p-6 rounded-lg mb-6 border-2 ${
                result.success
                  ? 'bg-green-50 border-green-300 text-green-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                {result.success ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <h3 className="text-lg font-semibold">
                  {result.success ? '同期完了' : '同期エラー'}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-600 text-xs mb-1">同期済みエピソード</span>
                  <span className="text-gray-900 font-semibold text-base">
                    {result.syncedEpisodes}件
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-600 text-xs mb-1">同期済み文字起こし</span>
                  <span className="text-gray-900 font-semibold text-base">
                    {result.syncedTranscripts}件
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-600 text-xs mb-1">総エピソード数</span>
                  <span className="text-gray-900 font-semibold text-base">
                    {result.totalEpisodes}件
                  </span>
                </div>
                {result.errorCount > 0 && (
                  <div className="flex flex-col">
                    <span className="text-red-600 text-xs mb-1">エラー数</span>
                    <span className="text-red-700 font-semibold text-base">
                      {result.errorCount}件
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ログ表示 */}
          {logs.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">ログ</h2>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  ログをクリア
                </button>
              </div>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto shadow-inner">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`mb-1 break-words ${
                      log.error
                        ? 'text-red-400'
                        : log.warning
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }`}
                  >
                    <span className="text-gray-500">
                      [{new Date(log.timestamp || Date.now()).toLocaleTimeString()}]
                    </span>{' '}
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="md-outlined-card p-6 bg-blue-50/50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            注意事項
          </h3>
          <ul className="text-sm text-blue-800 space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>全エピソード（通常回385 + 番外編）を一度に同期します</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>データ同期には時間がかかります（約390エピソード × 約0.5秒 = 約3-4分）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>レート制限を避けるため、各エピソード処理後に500ms待機します</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>同期中はこのページを開いたままにしてください</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>エラーが発生した場合、ログを確認してください</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>RSSフィードにすべてのエピソードが含まれているか確認されます</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
