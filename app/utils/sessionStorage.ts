/**
 * sessionStorageへの保存を統一管理するユーティリティ
 * 変数の使いまわしをやめる原則に従い、各用途ごとに専用の関数を用意
 */

const STORAGE_KEYS = {
  LAST_CLICKED_EPISODE_ID: "lastClickedEpisodeId",
  SCROLL_TO_EPISODE_ON_RETURN: "scrollToEpisodeOnReturn",
  SEARCH_CACHE_PREFIX: "search:",
} as const;

export const sessionStorageUtils = {
  /**
   * 最後にクリックしたエピソードIDを保存
   */
  saveLastClickedEpisodeId: (episodeId: string): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEYS.LAST_CLICKED_EPISODE_ID, episodeId);
  },

  /**
   * 最後にクリックしたエピソードIDを取得
   */
  getLastClickedEpisodeId: (): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(STORAGE_KEYS.LAST_CLICKED_EPISODE_ID);
  },

  /**
   * エピソード詳細から戻ったときのみ検索結果へスクロールするフラグを立てる
   */
  setScrollToEpisodeOnReturn: (): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEYS.SCROLL_TO_EPISODE_ON_RETURN, "1");
  },

  /**
   * 戻ったときスクロールするフラグを取得
   */
  getScrollToEpisodeOnReturn: (): boolean => {
    if (typeof window === "undefined") return false;
    return (
      sessionStorage.getItem(STORAGE_KEYS.SCROLL_TO_EPISODE_ON_RETURN) === "1"
    );
  },

  /**
   * 戻ったときスクロールするフラグをクリア
   */
  clearScrollToEpisodeOnReturn: (): void => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(STORAGE_KEYS.SCROLL_TO_EPISODE_ON_RETURN);
  },

  /**
   * 検索結果をキャッシュに保存
   */
  saveSearchCache: (key: string, data: unknown): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(key, JSON.stringify(data));
  },

  /**
   * 検索結果をキャッシュから取得
   */
  getSearchCache: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(key);
  },

  /**
   * 検索キャッシュキーを生成
   */
  buildSearchCacheKey: (
    query: string,
    exactMatch: boolean,
    page: number,
  ): string => {
    const matchType = exactMatch ? "exact" : "partial";
    return `${STORAGE_KEYS.SEARCH_CACHE_PREFIX}${query}:${matchType}:${page}`;
  },
};
