"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Episode {
  episodeId: string;
  episodeNumber: string;
  title: string;
  publishedAt: string;
  checked: boolean;
  checkedAt: string | null;
}

export default function Checklist() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        const response = await fetch("/api/transcript-checklist/all");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "エピソードの取得に失敗しました");
        }

        setEpisodes(data.episodes || []);
      } catch (error) {
        console.error("エピソード取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodes();
  }, []);

  const handleToggleCheck = async (episodeId: string, currentChecked: boolean) => {
    setUpdating(episodeId);
    try {
      const response = await fetch("/api/transcript-checklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          episodeId,
          checked: !currentChecked,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "チェック状態の更新に失敗しました");
      }

      // ローカル状態を更新
      setEpisodes((prev) =>
        prev.map((ep) =>
          ep.episodeId === episodeId
            ? {
                ...ep,
                checked: !currentChecked,
                checkedAt: !currentChecked ? new Date().toISOString() : null,
              }
            : ep
        )
      );
    } catch (error) {
      console.error("チェック状態更新エラー:", error);
      alert("チェック状態の更新に失敗しました。");
    } finally {
      setUpdating(null);
    }
  };

  // チェック済みエピソードのみをフィルタリング
  const checkedEpisodes = episodes.filter((ep) => ep.checked);

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
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-body-medium text-gray-600 mb-4">
                    チェック済み: {checkedEpisodes.length}件 / 全{episodes.length}件
                  </p>
                </div>

                {checkedEpisodes.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-body-medium text-gray-600 mb-4">
                      まだチェック済みのエピソードはありません。
                    </p>
                    <p className="text-body-small text-gray-500">
                      下のリストからエピソードを選択してチェックを入れてください。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-8">
                    <h2 className="text-title-large font-semibold text-gray-800 mb-4">
                      チェック済みエピソード
                    </h2>
                    {checkedEpisodes.map((episode) => (
                      <div
                        key={episode.episodeId}
                        className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r-md"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-title-medium font-semibold text-gray-800">
                            #{episode.episodeNumber} {episode.title}
                          </div>
                          <div className="text-label-small text-gray-500">
                            {episode.checkedAt
                              ? new Date(episode.checkedAt).toLocaleDateString(
                                  "ja-JP",
                                )
                              : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-label-small px-2 py-1 rounded-md bg-green-100 text-green-800">
                            チェック済み
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={episode.checked}
                              onChange={() =>
                                handleToggleCheck(
                                  episode.episodeId,
                                  episode.checked,
                                )
                              }
                              disabled={updating === episode.episodeId}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-label-small text-gray-600">
                              チェックを外す
                            </span>
                          </label>
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

                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h2 className="text-title-large font-semibold text-gray-800 mb-4">
                    全エピソード一覧
                  </h2>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {episodes.map((episode) => (
                      <div
                        key={episode.episodeId}
                        className={`flex items-center justify-between p-3 rounded-md border ${
                          episode.checked
                            ? "bg-green-50 border-green-200"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="text-body-medium font-medium text-gray-800">
                            #{episode.episodeNumber} {episode.title}
                          </div>
                          <div className="text-label-small text-gray-500 mt-1">
                            {episode.publishedAt
                              ? new Date(
                                  episode.publishedAt,
                                ).toLocaleDateString("ja-JP")
                              : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {episode.checked && (
                            <span className="text-label-small px-2 py-1 rounded-md bg-green-100 text-green-800">
                              チェック済み
                            </span>
                          )}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={episode.checked}
                              onChange={() =>
                                handleToggleCheck(
                                  episode.episodeId,
                                  episode.checked,
                                )
                              }
                              disabled={updating === episode.episodeId}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-label-small text-gray-700">
                              {updating === episode.episodeId
                                ? "更新中..."
                                : episode.checked
                                  ? "チェック済み"
                                  : "チェックする"}
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
