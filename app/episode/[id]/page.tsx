'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatTimestamp } from '@/lib/transcript/timestamp';

interface Episode {
  episodeId: string;
  title: string;
  description: string;
  publishedAt: string;
  listenUrl: string;
  transcriptText: string;
}

interface MatchPosition {
  text: string;
  field: string;
  position: number;
  timestamp?: { startTime: number; endTime: number };
}

export default function EpisodeDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const episodeId = params.id as string;
  const searchQuery = searchParams.get('q');
  const exactMatchParam = searchParams.get('exact') === '1';

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [matchPositions, setMatchPositions] = useState<MatchPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEpisode = async () => {
      if (!episodeId) return;

      setLoading(true);
      setError(null);

      try {
        const queryParam = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
        const response = await fetch(`/api/episode/${episodeId}${queryParam}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'エピソードの取得に失敗しました');
        }

        setEpisode(data.episode);
        setMatchPositions(data.allMatchPositions || []);
        
        // デバッグログ（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] エピソードデータ:', data.episode);
          console.log('[DEBUG] マッチポジション:', data.allMatchPositions);
          data.allMatchPositions?.forEach((match: MatchPosition, index: number) => {
            if (match.timestamp) {
              console.log(`[DEBUG] タイムスタンプ [${index}]:`, match.timestamp);
            } else {
              console.warn(`[DEBUG] タイムスタンプなし [${index}]:`, match.field, match.text.substring(0, 50));
            }
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エピソードの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchEpisode();
  }, [episodeId, searchQuery]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg
                className="animate-spin h-8 w-8 mx-auto mb-4 text-freeagenda-dark"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-gray-600">読み込み中...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !episode) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/"
              className="md-text-button inline-flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              トップページに戻る
            </Link>
          </div>
          <div className="md-elevated-card">
            <div className="text-center py-10">
              <p className="text-red-600 mb-4">{error || 'エピソードが見つかりませんでした'}</p>
              <Link
                href="/"
                className="md-text-button"
              >
                検索ページに戻る
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href={(() => {
              if (!searchQuery) return '/';
              const params = new URLSearchParams();
              params.set('q', searchQuery);
              if (exactMatchParam) {
                params.set('exact', '1');
              }
              return `/?${params.toString()}`;
            })()}
            className="md-text-button inline-flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            検索結果に戻る
          </Link>
        </div>

        <div className="md-elevated-card">
          <h1
            className="text-headline-large md:text-display-small font-bold mb-4 text-gray-900"
            dangerouslySetInnerHTML={{ __html: episode.title }}
          />

          <div className="text-label-medium text-gray-500 mb-6">
            {formatDate(episode.publishedAt)}
          </div>

          <a
            href={episode.listenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="md-filled-button inline-block mb-8"
          >
            LISTENで聴く
          </a>

          {episode.description && (
            <div className="mb-8">
              <h2 className="text-title-large font-semibold text-gray-800 mb-3">説明</h2>
              <p className="text-body-large text-gray-700 leading-relaxed whitespace-pre-wrap">
                {episode.description}
              </p>
            </div>
          )}

          {searchQuery && matchPositions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-title-large font-semibold text-gray-800 mb-4">
                検索キーワード「{searchQuery}」のマッチ箇所 ({matchPositions.length}箇所)
              </h2>
              <div className="space-y-4">
                {matchPositions.map((match, index) => (
                  <div
                    key={`${match.field}-${match.position}-${index}`}
                    className="border-l-4 border-freeagenda-light pl-4 py-3 bg-gray-50 rounded-r-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-label-small font-semibold text-freeagenda-dark">
                        {match.field === 'transcript_text' ? '文字起こし' : '説明文'} - マッチ {index + 1}
                      </div>
                      {match.timestamp && (
                        <div className="text-label-small font-medium text-freeagenda-dark bg-white px-2.5 py-1 rounded-md border border-freeagenda-light">
                          {formatTimestamp(match.timestamp.startTime)} - {formatTimestamp(match.timestamp.endTime)}
                        </div>
                      )}
                    </div>
                    <p
                      className="text-body-medium text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: match.text.replace(/<em>/g, '<mark>').replace(/<\/em>/g, '</mark>') }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && matchPositions.length === 0 && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-body-medium text-yellow-800">
                検索キーワード「{searchQuery}」のマッチ箇所が見つかりませんでした。
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
