"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Episode {
  episodeId: string;
  episodeNumber: string;
  title: string;
  publishedAt: string;
}

interface CheckedEpisode {
  episodeId: string;
  episodeNumber: string;
  title: string;
  checkedAt: string;
}

export default function Checklist() {
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [checkedEpisodeIds, setCheckedEpisodeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // チェックリストファイルと全エピソードを読み込む
  useEffect(() => {
    const fetchData = async () => {
      try {
        // チェックリストファイルを取得
        const checklistUrl = process.env.NEXT_PUBLIC_CHECKLIST_URL || 
          "https://raw.githubusercontent.com/hh2501/search-freeagenda-episodev2/main/public/transcript-checklist.json";
        
        const checklistResponse = await fetch(checklistUrl, {
          cache: "no-store",
        });

        if (checklistResponse.ok) {
          const checklistData = await checklistResponse.json();
          const checkedIds = new Set(
            (checklistData.episodes || []).map((ep: CheckedEpisode) => ep.episodeId)
          );
          setCheckedEpisodeIds(checkedIds);
          setLastUpdated(checklistData.lastUpdated || null);
        }

        // 全エピソードを取得
        const episodesResponse = await fetch("/api/transcript-checklist/episodes");
        const episodesData = await episodesResponse.json();

        if (!episodesResponse.ok) {
          throw new Error(episodesData.error || "エピソードの取得に失敗しました");
        }

        setAllEpisodes(episodesData.episodes || []);
      } catch (err) {
        console.error("データ取得エラー:", err);
        setError("データの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleToggleCheck = async (episodeId: string, checked: boolean) => {
    const newCheckedIds = new Set(checkedEpisodeIds);
    
    if (checked) {
      newCheckedIds.add(episodeId);
    } else {
      newCheckedIds.delete(episodeId);
    }

    setCheckedEpisodeIds(newCheckedIds);

    // JSONファイルを更新
    setSaving(true);
    try {
      const checkedEpisodes: CheckedEpisode[] = Array.from(newCheckedIds)
        .map((id) => {
          const episode = allEpisodes.find((ep) => ep.episodeId === id);
          if (!episode) return null;
          
          // 既存のチェック済みエピソードからcheckedAtを取得、なければ現在の日時を使用
          const existingChecked = checkedEpisodeIds.has(id);
          return {
            episodeId: episode.episodeId,
            episodeNumber: episode.episodeNumber,
            title: episode.title,
            checkedAt: existingChecked 
              ? new Date().toISOString() 
              : new Date().toISOString(),
          };
        })
        .filter((ep): ep is CheckedEpisode => ep !== null)
        .sort((a, b) => {
          // エピソード番号でソート
          const numA = parseInt(a.episodeNumber) || 0;
          const numB = parseInt(b.episodeNumber) || 0;
          return numA - numB;
        });

      const response = await fetch("/api/transcript-checklist/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          episodes: checkedEpisodes,
          lastUpdated: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "チェックリストの更新に失敗しました");
      }

      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error("チェックリスト更新エラー:", err);
      alert("チェックリストの更新に失敗しました。");
      // 元に戻す
      setCheckedEpisodeIds(checkedEpisodeIds);
    } finally {
      setSaving(false);
    }
  };

  const checkedEpisodes = allEpisodes.filter((ep) => checkedEpisodeIds.has(ep.episodeId));

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
              チェックボックスにチェックを入れると、チェックリストに追加されます。
            </p>

            {lastUpdated && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-body-small text-blue-800">
                  最終更新: {new Date(lastUpdated).toLocaleString("ja-JP")}
                  {saving && <span className="ml-2">（保存中...）</span>}
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
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-body-medium text-gray-600 mb-4">
                    チェック済み: {checkedEpisodes.length}件 / 全{allEpisodes.length}件
                  </p>
                </div>

                {checkedEpisodes.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-title-large font-semibold text-gray-800 mb-4">
                      チェック済みエピソード
                    </h2>
                    <div className="space-y-3">
                      {checkedEpisodes.map((episode) => (
                        <div
                          key={episode.episodeId}
                          className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r-md"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-title-medium font-semibold text-gray-800">
                                #{episode.episodeNumber} {episode.title}
                              </div>
                              <div className="text-label-small text-gray-500 mt-1">
                                {episode.publishedAt
                                  ? new Date(episode.publishedAt).toLocaleDateString("ja-JP")
                                  : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-label-small px-2 py-1 rounded-md bg-green-100 text-green-800">
                                チェック済み
                              </span>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={true}
                                  onChange={() => handleToggleCheck(episode.episodeId, false)}
                                  disabled={saving}
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
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h2 className="text-title-large font-semibold text-gray-800 mb-4">
                    全エピソード一覧（日付の若い順）
                  </h2>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {allEpisodes.map((episode) => {
                      const isChecked = checkedEpisodeIds.has(episode.episodeId);
                      return (
                        <div
                          key={episode.episodeId}
                          className={`flex items-center justify-between p-3 rounded-md border ${
                            isChecked
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
                                ? new Date(episode.publishedAt).toLocaleDateString("ja-JP")
                                : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {isChecked && (
                              <span className="text-label-small px-2 py-1 rounded-md bg-green-100 text-green-800">
                                チェック済み
                              </span>
                            )}
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCheck(episode.episodeId, !isChecked)}
                                disabled={saving}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                              <span className="text-label-small text-gray-700">
                                {isChecked ? "チェック済み" : "チェックする"}
                              </span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
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
