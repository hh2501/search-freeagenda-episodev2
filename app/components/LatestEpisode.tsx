"use client";

import { useState, useEffect } from "react";

interface LatestEpisodeProps {
  initialEpisode?: {
    episodeNumber: string | null;
    title: string;
    listenUrl: string;
  } | null;
}

export default function LatestEpisode({
  initialEpisode = null,
}: LatestEpisodeProps) {
  const [latestEpisode, setLatestEpisode] = useState(initialEpisode);

  useEffect(() => {
    if (initialEpisode) return;
    const fetchLatestEpisode = async () => {
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
    <div className="flex flex-col items-center pb-6 text-xs">
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
