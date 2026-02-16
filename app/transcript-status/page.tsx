"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BackLinkIcon from "@/app/components/BackLinkIcon";

interface ChecklistEpisode {
  episodeId: string;
  episodeNumber: string;
  title: string;
  publishedAt: string;
  checked: boolean;
  checkedAt: string | null;
}

interface TranscriptModal {
  episodeId: string;
  title: string;
  transcriptText: string;
}

export default function TranscriptStatus() {
  const [allEpisodes, setAllEpisodes] = useState<ChecklistEpisode[]>([]);
  const [checkedEpisodes, setCheckedEpisodes] = useState<ChecklistEpisode[]>(
    [],
  );
  const [totalEpisodes, setTotalEpisodes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [transcriptModal, setTranscriptModal] =
    useState<TranscriptModal | null>(null);
  const [loadingTranscriptEpisodeId, setLoadingTranscriptEpisodeId] =
    useState<string | null>(null);

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        // 全エピソード数を取得
        try {
          const countResponse = await fetch("/api/episodes/count", {
            cache: "no-store",
          });
          if (countResponse.ok) {
            const countData = await countResponse.json();
            setTotalEpisodes(countData.count || 0);
          }
        } catch (err) {
          console.error("エピソード数取得エラー:", err);
          // エラーが発生しても続行
        }

        // 同一オリジンの public/transcript-checklist.json を取得（ローカル・本番とも反映）
        const checklistUrl =
          process.env.NEXT_PUBLIC_CHECKLIST_URL || "/transcript-checklist.json";

        const response = await fetch(checklistUrl, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("チェックリストの取得に失敗しました");
        }

        const data = await response.json();

        // エピソードIDが空の場合は、APIから取得を試みる
        const episodesWithoutId = data.episodes.filter(
          (ep: ChecklistEpisode) => !ep.episodeId,
        );

        if (episodesWithoutId.length > 0) {
          try {
            const idsResponse = await fetch(
              "/api/transcript-checklist/episode-ids",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ episodes: episodesWithoutId }),
              },
            );

            if (idsResponse.ok) {
              const idsData = await idsResponse.json();
              const idMap = new Map<string, string>();
              idsData.episodes.forEach((ep: ChecklistEpisode) => {
                if (ep.episodeId) {
                  idMap.set(ep.episodeNumber, ep.episodeId);
                }
              });

              // エピソードIDを更新
              data.episodes = data.episodes.map((ep: ChecklistEpisode) => {
                if (!ep.episodeId && idMap.has(ep.episodeNumber)) {
                  return {
                    ...ep,
                    episodeId: idMap.get(ep.episodeNumber) || "",
                  };
                }
                return ep;
              });
            }
          } catch (err) {
            console.error("エピソードID取得エラー:", err);
            // エラーが発生しても続行
          }
        }

        // エピソード番号でソート（日付の若い順）
        const sortedEpisodes = data.episodes.sort(
          (a: ChecklistEpisode, b: ChecklistEpisode) => {
            const numA = parseInt(a.episodeNumber) || 0;
            const numB = parseInt(b.episodeNumber) || 0;
            return numA - numB;
          },
        );

        setAllEpisodes(sortedEpisodes);

        // チェック済みのエピソードのみを抽出
        const checked = sortedEpisodes.filter(
          (ep: ChecklistEpisode) => ep.checked === true,
        );
        setCheckedEpisodes(checked);
        setLastUpdated(data.lastUpdated || null);
      } catch (err) {
        console.error("チェックリスト取得エラー:", err);
        setError("チェックリストの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchChecklist();
  }, []);

  const handleShowTranscript = async (episodeId: string, title: string) => {
    setLoadingTranscriptEpisodeId(episodeId);
    try {
      const response = await fetch(`/api/episode/${episodeId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("文字起こしの取得に失敗しました");
      }
      const data = await response.json();
      setTranscriptModal({
        episodeId,
        title,
        transcriptText: data.episode.transcriptText || "",
      });
    } catch (err) {
      console.error("文字起こし取得エラー:", err);
      setError("文字起こしの取得に失敗しました。");
    } finally {
      setLoadingTranscriptEpisodeId(null);
    }
  };

  const handleCloseTranscript = () => {
    setTranscriptModal(null);
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="md-text-button inline-flex items-center gap-1"
          >
            <BackLinkIcon />
            トップページに戻る
          </Link>
        </div>

        <div className="md-outlined-card">
          <h1 className="text-title-large font-bold mb-6 text-gray-900">
            文字起こし修正状況
          </h1>

          <div className="prose prose-lg max-w-none">
            {lastUpdated && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-body-small text-blue-800">
                  最終更新: {new Date(lastUpdated).toLocaleString("ja-JP")}
                </p>
              </div>
            )}

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
              ) : error ? (
                <div className="text-center py-10">
                  <p className="text-body-medium text-red-600 mb-4">{error}</p>
                  <p className="text-body-small text-gray-500">
                    チェックリストファイルが見つかりませんでした。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-4">
                    <p className="text-body-medium text-gray-600">
                      修正済み: {checkedEpisodes.length}件 / 全
                      {totalEpisodes > 0 ? totalEpisodes : allEpisodes.length}件
                    </p>
                  </div>

                  {checkedEpisodes.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-body-medium text-gray-600 mb-4">
                        まだ修正済みのエピソードはありません。
                      </p>
                      <p className="text-body-small text-gray-500">
                        JSONファイルの<code className="md-code">checked</code>
                        フィールドを<code className="md-code">true</code>
                        に設定してください。
                      </p>
                    </div>
                  ) : (
                    <>
                      {checkedEpisodes.map((episode) => (
                        <div
                          key={`${episode.episodeNumber}-${episode.episodeId}`}
                          className="border-l-4 border-freeagenda-dark pl-3 py-1.5 pr-2 bg-freeagenda-light/20 rounded-r flex items-center justify-between gap-2"
                        >
                          <span className="text-body-small text-gray-800 min-w-0 truncate">
                            {episode.title}
                          </span>
                          {episode.episodeId && (
                            <button
                              onClick={() =>
                                handleShowTranscript(
                                  episode.episodeId,
                                  episode.title,
                                )
                              }
                              disabled={
                                loadingTranscriptEpisodeId ===
                                episode.episodeId
                              }
                              className="p-2 bg-freeagenda-dark text-white rounded-md shadow-sm hover:bg-freeagenda-dark/90 hover:shadow-md active:bg-freeagenda-dark/80 transition-all duration-200 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="文字起こしを見る"
                            >
                              {loadingTranscriptEpisodeId ===
                              episode.episodeId ? (
                                <svg
                                  className="animate-spin h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  aria-hidden
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
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  height="18"
                                  viewBox="0 -960 960 960"
                                  width="18"
                                  fill="currentColor"
                                  aria-hidden
                                >
                                  <path d="M200-280h560v-80H200v80Zm0-160h560v-80H200v80Zm0-160h400v-80H200v80Zm-40 440q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* 文字起こしモーダル */}
      {transcriptModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseTranscript}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-title-large font-semibold text-gray-900">
                {transcriptModal.title}
              </h2>
              <button
                onClick={handleCloseTranscript}
                className="text-gray-500 hover:text-gray-700"
                aria-label="閉じる"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap text-body-medium text-gray-700 leading-relaxed">
                  {transcriptModal.transcriptText || "文字起こしがありません。"}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseTranscript}
                className="md-filled-button"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
