"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { SearchResultCardProps } from "./SearchResultCard";
import type { PaginationProps } from "./Pagination";
import { sessionStorageUtils } from "../utils/sessionStorage";
import {
  sortSearchResults,
  formatDate,
  buildEpisodeUrl,
  buildSearchUrlParams,
} from "../utils/searchHelpers";
import { sendSearchEvent } from "../utils/analytics";

const SearchResultCard = dynamic<SearchResultCardProps>(
  () => import("./SearchResultCard"),
);

const Pagination = dynamic<PaginationProps>(() => import("./Pagination"));

const getRandomPlaceholderFromKeywords = (): Promise<string | null> =>
  import("@/lib/search-keywords.json").then((module) => {
    const keywords = module.default as string[];
    return keywords.length > 0
      ? keywords[Math.floor(Math.random() * keywords.length)]
      : null;
  });

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

interface SearchResponse {
  results: SearchResult[];
  count: number;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}

export default function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholder, setPlaceholder] =
    useState("キーワードを入力（例: エンジニア）");
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<"relevance" | "date-desc" | "date-asc">(
    "relevance",
  );
  const [exactMatchMode, setExactMatchMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasScrolledToEpisode, setHasScrolledToEpisode] = useState(false);

  const handleEpisodeClick = useCallback(
    (episodeId: string) => {
      sessionStorageUtils.saveLastClickedEpisodeId(episodeId);
      sessionStorageUtils.setScrollToEpisodeOnReturn();
      sessionStorageUtils.saveSearchResultsScrollY(window.scrollY);
      router.push(buildEpisodeUrl(episodeId, query, exactMatchMode));
    },
    [query, exactMatchMode, router],
  );

  useEffect(() => {
    getRandomPlaceholderFromKeywords().then((kw) => {
      if (kw) setPlaceholder(kw);
    });
  }, []);

  useEffect(() => {
    const urlQuery = searchParams.get("q");
    const urlExactMatch = searchParams.get("exact") === "1";
    const urlPage = parseInt(searchParams.get("page") || "1", 10);
    const queryChanged = urlQuery && urlQuery !== query;
    const pageChanged = urlPage !== currentPage;
    const exactMatchChanged = urlExactMatch !== exactMatchMode;

    if (urlQuery && (queryChanged || pageChanged || exactMatchChanged)) {
      if (queryChanged) setQuery(urlQuery);
      if (exactMatchChanged) setExactMatchMode(urlExactMatch);
      if (pageChanged) {
        setCurrentPage(urlPage);
        setLoading(true);
      }
      setIsInitialLoad(true);
      const cacheKey = sessionStorageUtils.buildSearchCacheKey(
        urlQuery,
        urlExactMatch,
        urlPage,
      );
      const cachedResults = sessionStorageUtils.getSearchCache(cacheKey);
      if (cachedResults) {
        try {
          const parsedData: SearchResponse = JSON.parse(cachedResults);
          restoreSearchResultsFromCache(parsedData, urlPage);
          return;
        } catch (e) {
          console.error("Failed to parse cached results", e);
        }
      }
      performSearch(urlQuery, urlExactMatch, urlPage, pageChanged);
    } else if (!urlQuery && query) {
      setQuery("");
      setExactMatchMode(false);
      setHasSearched(false);
      setResults([]);
      setIsInitialLoad(false);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (query === "" && !isInitialLoad) {
      getRandomPlaceholderFromKeywords().then((kw) => {
        if (kw) setPlaceholder(kw);
      });
      setHasSearched(false);
      setResults([]);
    }
  }, [query, isInitialLoad]);

  useEffect(() => {
    if (
      results.length === 0 ||
      !hasSearched ||
      loading ||
      hasScrolledToEpisode
    ) {
      return;
    }

    if (!sessionStorageUtils.getScrollToEpisodeOnReturn()) {
      return;
    }

    const savedScrollY = sessionStorageUtils.getSearchResultsScrollY();
    sessionStorageUtils.clearScrollToEpisodeOnReturn();
    sessionStorageUtils.clearSearchResultsScrollY();
    setHasScrolledToEpisode(true);

    if (savedScrollY !== null && savedScrollY >= 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollY, behavior: "auto" });
      });
    }
  }, [results, hasSearched, loading, hasScrolledToEpisode]);

  useEffect(() => {
    if (loading) {
      setHasScrolledToEpisode(false);
    }
  }, [loading]);

  useEffect(() => {
    if (searchParams.get("q")) setHasScrolledToEpisode(false);
  }, [searchParams]);

  const restoreSearchResultsFromCache = useCallback(
    (cachedData: SearchResponse, page: number) => {
      setResults(cachedData.results || []);
      setTotalResults(cachedData.total || cachedData.results?.length || 0);
      setTotalPages(cachedData.totalPages || 1);
      setCurrentPage(cachedData.page || page);
      setHasSearched(true);
      setSortBy("relevance");
      setLoading(false);
      setIsInitialLoad(false);
      setHasScrolledToEpisode(false);
    },
    [],
  );

  const fetchSearchResults = useCallback(
    async (searchQuery: string, exactMatch: boolean, page: number) => {
      const params = buildSearchUrlParams(searchQuery, exactMatch, page);
      params.set("pageSize", "25");
      const response = await fetch(`/api/search?${params.toString()}`);
      const data: SearchResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "検索に失敗しました");
      }
      const searchResults = data.results || [];
      setResults(searchResults);
      setTotalResults(data.total || searchResults.length);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || page);
      if (page <= 5) {
        const cacheKey = sessionStorageUtils.buildSearchCacheKey(
          searchQuery,
          exactMatch,
          page,
        );
        sessionStorageUtils.saveSearchCache(cacheKey, data);
      }

      sendSearchEvent(searchQuery, data.page ?? page);
      setHasScrolledToEpisode(false);
    },
    [],
  );

  const performSearch = useCallback(
    async (
      searchQuery: string,
      exactMatch: boolean = false,
      page: number = 1,
      skipLoadingState: boolean = false,
    ) => {
      if (!searchQuery.trim()) return;
      const cacheKey = sessionStorageUtils.buildSearchCacheKey(
        searchQuery,
        exactMatch,
        page,
      );
      const cachedResults = sessionStorageUtils.getSearchCache(cacheKey);
      if (cachedResults) {
        try {
          const parsedData: SearchResponse = JSON.parse(cachedResults);
          restoreSearchResultsFromCache(parsedData, page);
          return;
        } catch (e) {
          console.error("Failed to parse cached results", e);
        }
      }
      if (!skipLoadingState) {
        setLoading(true);
      }
      setError(null);
      setHasSearched(true);
      setSortBy("relevance");

      try {
        await fetchSearchResults(searchQuery, exactMatch, page);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "検索中にエラーが発生しました",
        );
        setResults([]);
      } finally {
        setLoading(false);
        setIsInitialLoad(false);
      }
    },
    [restoreSearchResultsFromCache, fetchSearchResults],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        (activeElement &&
          "isContentEditable" in activeElement &&
          activeElement.isContentEditable)
      ) {
        return;
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setCurrentPage(1);
      const params = buildSearchUrlParams(query, exactMatchMode, 1);
      const queryString = params.toString();
      router.push(queryString ? `/?${queryString}` : "/", { scroll: false });
      await performSearch(query, exactMatchMode, 1);
    },
    [query, exactMatchMode, router, performSearch],
  );

  const handlePageChange = useCallback(
    async (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      setCurrentPage(newPage);
      setLoading(true);
      const params = buildSearchUrlParams(query, exactMatchMode, newPage);
      router.push(`/?${params.toString()}`, { scroll: false });
      await performSearch(query, exactMatchMode, newPage);
      searchResultsRef.current?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    },
    [query, exactMatchMode, totalPages, router, performSearch],
  );

  const buildEpisodeUrlMemoized = useCallback(
    (episodeId: string) => buildEpisodeUrl(episodeId, query, exactMatchMode),
    [query, exactMatchMode],
  );
  const sortedResults = useMemo(
    () => sortSearchResults(results, sortBy),
    [results, sortBy],
  );

  return (
    <>
      <form onSubmit={handleSearch} className="mb-8">
        <div className="md-search-form relative">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch(e as any);
              }
            }}
            placeholder={placeholder}
            className="md-search-form-input"
            disabled={loading}
            autoComplete="off"
            autoFocus={false}
            readOnly={false}
            tabIndex={0}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setHasSearched(false);
                setCurrentPage(1);
                setTotalPages(1);
                setTotalResults(0);
                setExactMatchMode(false);
                setError(null);
                setSortBy("relevance");
                router.push("/", { scroll: false });
                searchInputRef.current?.focus();
              }}
              className="absolute right-14 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none rounded-full p-1 hover:bg-gray-100"
              aria-label="入力をクリア"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="md-search-form-button"
            aria-label="検索"
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5"
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
            ) : (
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
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            )}
          </button>
        </div>
      </form>
      <div className="mb-6 flex items-center justify-center gap-3">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <span className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-within:ring-2 focus-within:ring-freeagenda-dark focus-within:ring-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
            <input
              type="checkbox"
              checked={exactMatchMode}
              onChange={(e) => setExactMatchMode(e.target.checked)}
              disabled={loading}
              className="sr-only peer"
              aria-label="完全一致検索"
            />
            <span
              className={`block h-full w-full rounded-full transition-colors ${
                exactMatchMode
                  ? "bg-freeagenda-dark"
                  : "bg-gray-400"
              }`}
            />
            <span
              className={`pointer-events-none absolute left-1 top-1/2 inline-block h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                exactMatchMode ? "translate-x-[18px]" : "-translate-x-0.5"
              }`}
            />
          </span>
          <span className="text-body-medium text-gray-700">完全一致検索</span>
        </label>
      </div>
      {error && (
        <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 text-red-800 rounded-xl shadow-sm">
          <div className="text-title-medium font-semibold mb-2">
            エラーが発生しました
          </div>
          <div className="text-body-medium">{error}</div>
          {error.includes("データベース") && (
            <div className="mt-3 text-sm">
              <p className="font-medium mb-1">セットアップ手順:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>.env.localファイルを作成</li>
                <li>
                  DATABASE_URLを設定（例:
                  postgresql://user:password@localhost:5432/dbname）
                </li>
                <li>データベーススキーマを適用（lib/db/schema.sql）</li>
                <li>データ同期を実行（POST /api/sync）</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {results.length > 0 && hasSearched && query !== "" && (
        <div ref={searchResultsRef} className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-label-medium md:text-label-large text-gray-600 font-medium min-w-0 flex-shrink">
              {totalResults > 0
                ? `全${totalResults}件中 ${(currentPage - 1) * 25 + 1}-${Math.min(currentPage * 25, totalResults)}件を表示`
                : `${results.length}件の検索結果`}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as "relevance" | "date-desc" | "date-asc",
                  )
                }
                aria-label="並び替え"
                className="px-3 md:px-4 py-2 text-body-small md:text-body-medium border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-freeagenda-dark/20 focus:border-freeagenda-dark transition-all"
              >
                <option value="relevance">関連度順</option>
                <option value="date-desc">日付順（新着）</option>
                <option value="date-asc">日付順（古い）</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {hasSearched && query !== "" && (
        <div className="space-y-4">
          {sortedResults.map((result, index) => {
            const episodeUrl = buildEpisodeUrlMemoized(result.episodeId);
            const formattedDateString = formatDate(result.publishedAt);
            return (
              <SearchResultCard
                key={result.episodeId}
                result={result}
                index={index}
                episodeUrl={episodeUrl}
                formattedDate={formattedDateString}
                onEpisodeClick={handleEpisodeClick}
              />
            );
          })}
        </div>
      )}

      {results.length > 0 && hasSearched && query !== "" && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          loading={loading}
          onPageChange={handlePageChange}
        />
      )}

      {results.length === 0 &&
        !loading &&
        !error &&
        hasSearched &&
        query &&
        query !== "" && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <p className="text-title-medium text-gray-500 font-medium">
              検索結果が見つかりませんでした
            </p>
            <p className="text-body-medium text-gray-400 mt-2">
              別のキーワードで検索してみてください
            </p>
          </div>
        )}
    </>
  );
}
