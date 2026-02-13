const STORAGE_KEYS = {
  LAST_CLICKED_EPISODE_ID: "lastClickedEpisodeId",
  SCROLL_TO_EPISODE_ON_RETURN: "scrollToEpisodeOnReturn",
  SEARCH_RESULTS_SCROLL_Y: "searchResultsScrollY",
  SEARCH_CACHE_PREFIX: "search:",
  TRANSCRIPT_EDIT_AUTH: "transcript_edit_auth",
} as const;

/** 認証有効期限（2時間）ミリ秒 */
const TRANSCRIPT_AUTH_TTL_MS = 2 * 60 * 60 * 1000;

export interface TranscriptAuthData {
  password: string;
  authenticatedAt: number;
}

/** 文字起こし編集の認証情報を保存（2時間有効） */
export const saveTranscriptAuth = (password: string): void => {
  if (typeof window === "undefined") return;
  const data: TranscriptAuthData = {
    password,
    authenticatedAt: Date.now(),
  };
  sessionStorage.setItem(
    STORAGE_KEYS.TRANSCRIPT_EDIT_AUTH,
    JSON.stringify(data),
  );
};

/** 有効期限内の認証情報を取得。期限切れならnull */
export const getValidTranscriptAuth = (): TranscriptAuthData | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEYS.TRANSCRIPT_EDIT_AUTH);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as TranscriptAuthData;
    const elapsed = Date.now() - data.authenticatedAt;
    if (elapsed >= TRANSCRIPT_AUTH_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEYS.TRANSCRIPT_EDIT_AUTH);
      return null;
    }
    return data;
  } catch {
    sessionStorage.removeItem(STORAGE_KEYS.TRANSCRIPT_EDIT_AUTH);
    return null;
  }
};

/** 文字起こし編集の認証情報を削除 */
export const clearTranscriptAuth = (): void => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEYS.TRANSCRIPT_EDIT_AUTH);
};

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
