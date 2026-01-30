const STORAGE_KEYS = {
  LAST_CLICKED_EPISODE_ID: "lastClickedEpisodeId",
  SCROLL_TO_EPISODE_ON_RETURN: "scrollToEpisodeOnReturn",
  SEARCH_RESULTS_SCROLL_Y: "searchResultsScrollY",
  SEARCH_CACHE_PREFIX: "search:",
} as const;

export const sessionStorageUtils = {
  saveLastClickedEpisodeId: (episodeId: string): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEYS.LAST_CLICKED_EPISODE_ID, episodeId);
  },
  getLastClickedEpisodeId: (): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(STORAGE_KEYS.LAST_CLICKED_EPISODE_ID);
  },
  setScrollToEpisodeOnReturn: (): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEYS.SCROLL_TO_EPISODE_ON_RETURN, "1");
  },
  getScrollToEpisodeOnReturn: (): boolean => {
    if (typeof window === "undefined") return false;
    return (
      sessionStorage.getItem(STORAGE_KEYS.SCROLL_TO_EPISODE_ON_RETURN) === "1"
    );
  },
  clearScrollToEpisodeOnReturn: (): void => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(STORAGE_KEYS.SCROLL_TO_EPISODE_ON_RETURN);
  },
  saveSearchResultsScrollY: (scrollY: number): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      STORAGE_KEYS.SEARCH_RESULTS_SCROLL_Y,
      String(scrollY),
    );
  },
  getSearchResultsScrollY: (): number | null => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(STORAGE_KEYS.SEARCH_RESULTS_SCROLL_Y);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  },
  clearSearchResultsScrollY: (): void => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(STORAGE_KEYS.SEARCH_RESULTS_SCROLL_Y);
  },
  saveSearchCache: (key: string, data: unknown): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(key, JSON.stringify(data));
  },
  getSearchCache: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(key);
  },
  buildSearchCacheKey: (
    query: string,
    exactMatch: boolean,
    page: number,
  ): string => {
    const matchType = exactMatch ? "exact" : "partial";
    return `${STORAGE_KEYS.SEARCH_CACHE_PREFIX}${query}:${matchType}:${page}`;
  },
};
