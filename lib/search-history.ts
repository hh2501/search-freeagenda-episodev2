// 検索履歴の管理ユーティリティ

const STORAGE_KEY = 'freeagenda_search_history';
const MAX_HISTORY_ITEMS = 10; // 最大保存件数

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

/**
 * 検索履歴を取得
 */
export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const history = JSON.parse(stored) as SearchHistoryItem[];
    // タイムスタンプでソート（新しい順）
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to get search history:', error);
    return [];
  }
}

/**
 * 検索履歴に追加
 */
export function addSearchHistory(query: string): void {
  if (typeof window === 'undefined' || !query.trim()) {
    return;
  }

  try {
    const history = getSearchHistory();
    const trimmedQuery = query.trim();

    // 既存の同じクエリを削除（重複を避ける）
    const filteredHistory = history.filter(item => item.query !== trimmedQuery);

    // 新しいクエリを先頭に追加
    const newHistory: SearchHistoryItem[] = [
      { query: trimmedQuery, timestamp: Date.now() },
      ...filteredHistory,
    ];

    // 最大件数を超える場合は古いものを削除
    const limitedHistory = newHistory.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Failed to add search history:', error);
  }
}

/**
 * 検索履歴から特定の項目を削除
 */
export function removeSearchHistoryItem(query: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const history = getSearchHistory();
    const filteredHistory = history.filter(item => item.query !== query);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
  } catch (error) {
    console.error('Failed to remove search history item:', error);
  }
}

/**
 * 検索履歴を全て削除
 */
export function clearSearchHistory(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear search history:', error);
  }
}
