"use client";

import { useState, useEffect } from "react";

interface LatestEpisodeProps {
  initialEpisode?: {
    episodeNumber: string | null;
    title: string;
    listenUrl: string;
  } | null;
}

/**
 * 最新エピソード表示コンポーネント（クライアントコンポーネント）
 * 遅延読み込みで優先度を下げる
 */
export default function LatestEpisode({
  initialEpisode = null,
}: LatestEpisodeProps) {
  const [latestEpisode, setLatestEpisode] = useState(initialEpisode);

  useEffect(() => {
    // 既に初期値がある場合はスキップ
    if (initialEpisode) return;

    // 最新エピソード情報を取得（遅延読み込みで優先度を下げる）
    const fetchLatestEpisode = async () => {
      // ブラウザがアイドル状態になったら実行
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        requestIdleCallback(
          async () => {
            try {
              const response = await fetch("/api/latest-episode");
              if (response.ok) {
                const data = await response.json();
                if (data.episodeNumber && data.title && data.listenUrl) {
                  setLatestEpisode({
                    episodeNumber: data.episodeNumber,
                    title: data.title,
                    listenUrl: data.listenUrl,
                  });
                }
              }
            } catch (error) {
              console.error("最新エピソード取得エラー:", error);
            }
          },
          { timeout: 2000 },
        );
      } else {
        // requestIdleCallbackがサポートされていない場合は、短い遅延後に実行
        setTimeout(async () => {
          try {
            const response = await fetch("/api/latest-episode");
            if (response.ok) {
              const data = await response.json();
              if (data.episodeNumber && data.title && data.listenUrl) {
                setLatestEpisode({
                  episodeNumber: data.episodeNumber,
                  title: data.title,
                  listenUrl: data.listenUrl,
                });
              }
            }
          } catch (error) {
            console.error("最新エピソード取得エラー:", error);
          }
        }, 100);
      }
    };

    fetchLatestEpisode();
  }, [initialEpisode]);

  if (!latestEpisode) {
    return null;
  }

  return (
    <div className="flex flex-col items-center pb-3 text-xs">
      <div className="min-h-6 text-gray-600">
        最新反映回:{" "}
        <a
          href={latestEpisode.listenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
        >
          #{latestEpisode.episodeNumber}{" "}
          {latestEpisode.title.replace(/^#\d+_/, "")}
        </a>
      </div>
    </div>
  );
}
