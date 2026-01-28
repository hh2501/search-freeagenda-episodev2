'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CheckedEpisode {
  episodeId: string;
  episodeNumber: string;
  title: string;
  checkedAt: string;
  status: 'checked' | 'in-progress';
}

export default function Checklist() {
  const [checkedEpisodes, setCheckedEpisodes] = useState<CheckedEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 実際のAPIからチェック済みエピソードのリストを取得
    // 現在は空の配列を返す（今後実装予定）
    setLoading(false);
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/coffee"
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
            コーヒーを奢るページに戻る
          </Link>
        </div>

        <div className="md-elevated-card">
          <h1 className="text-headline-large md:text-display-small font-bold mb-6 text-gray-900">
            文字起こしチェックリスト
          </h1>

          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-body-large text-gray-700 leading-relaxed mb-6">
              エピソードの文字起こしの誤字脱字や表記の揺れを手動でチェックしたエピソードの一覧です。
            </p>

            {loading ? (
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
            ) : checkedEpisodes.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-body-medium text-gray-600 mb-4">
                  まだチェック済みのエピソードはありません。
                </p>
                <p className="text-body-small text-gray-500">
                  チェック作業は継続的に進めています。
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {checkedEpisodes.map((episode) => (
                  <div
                    key={episode.episodeId}
                    className="border-l-4 border-freeagenda-light pl-4 py-3 bg-gray-50 rounded-r-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-title-medium font-semibold text-gray-800">
                        #{episode.episodeNumber} {episode.title}
                      </div>
                      <div className="text-label-small text-gray-500">
                        {new Date(episode.checkedAt).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-label-small px-2 py-1 rounded-md ${
                        episode.status === 'checked'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {episode.status === 'checked' ? 'チェック済み' : 'チェック中'}
                      </span>
                      <Link
                        href={`/episode/${episode.episodeId}`}
                        className="text-label-small text-freeagenda-dark hover:underline"
                      >
                        エピソードを見る
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
