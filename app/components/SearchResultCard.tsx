"use client";

import Link from "next/link";
import { memo, useCallback } from "react";

interface SearchResult {
  episodeId: string;
  title: string;
  description: string;
  publishedAt: string;
  listenUrl: string;
  preview: string;
  keywordPreviews?: { keyword: string; fragment: string }[];
  rank: number;
}

export interface SearchResultCardProps {
  result: SearchResult;
  index: number;
  episodeUrl: string;
  formattedDate: string;
  onEpisodeClick: (episodeId: string) => void;
}

const SearchResultCard = memo(function SearchResultCard({
  result,
  index,
  episodeUrl,
  formattedDate,
  onEpisodeClick,
}: SearchResultCardProps) {
  const handleCardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button")) {
        return;
      }
      onEpisodeClick(result.episodeId);
    },
    [result.episodeId, onEpisodeClick],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button")) {
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onEpisodeClick(result.episodeId);
      }
    },
    [result.episodeId, onEpisodeClick],
  );

  const handleLinkClick = useCallback(() => {
    onEpisodeClick(result.episodeId);
  }, [result.episodeId, onEpisodeClick]);

  const cleanTitle = result.title.replace(/<[^>]*>/g, "");

  return (
    <div
      className="md-result-card relative"
      style={{
        animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
      }}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="button"
      aria-label={`エピソードを開く: ${cleanTitle}`}
      data-episode-id={result.episodeId}
      id={`episode-${result.episodeId}`}
    >
      <h2 className="text-title-large font-bold mb-3">
        <Link
          href={episodeUrl}
          className="text-freeagenda-dark hover:text-freeagenda-dark/80 transition-colors focus:outline-none focus:ring-2 focus:ring-freeagenda-dark/20 rounded-sm pointer-events-auto"
          onClick={handleLinkClick}
          dangerouslySetInnerHTML={{ __html: result.title }}
        />
      </h2>

      <div className="text-label-medium text-gray-500 mb-4">
        {formattedDate}
      </div>

      {result.keywordPreviews && result.keywordPreviews.length > 0 ? (
        <div className="space-y-4 mb-5">
          {result.keywordPreviews.map((kp, kpIndex) => (
            <div
              key={kpIndex}
              className="border-l-2 border-freeagenda-light pl-3"
            >
              <div className="text-label-small font-semibold text-freeagenda-dark mb-1">
                「{kp.keyword}」を含む箇所
              </div>
              <p
                className="text-body-medium text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: kp.fragment }}
              />
            </div>
          ))}
        </div>
      ) : (
        result.preview && (
          <p
            className="text-body-large text-gray-700 mb-5 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: result.preview }}
          />
        )
      )}

      <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
        <Link
          href={episodeUrl}
          className="flex-1 md-outlined-button flex items-center justify-center text-center min-h-[50px]"
          onClick={(e) => {
            e.stopPropagation();
            handleLinkClick();
          }}
        >
          エピソード詳細を見る
        </Link>
        <a
          href={result.listenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 md-filled-button flex items-center justify-center text-center min-h-[50px]"
          onClick={(e) => e.stopPropagation()}
        >
          LISTENで聴く
        </a>
      </div>
    </div>
  );
});

export default SearchResultCard;
