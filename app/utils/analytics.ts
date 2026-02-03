/**
 * GA4 に検索実行イベントを送信する。
 * 検索が成功したタイミングで呼び、GA の「イベント」レポートで過去24時間の件数などを確認できる。
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function sendSearchEvent(searchTerm: string, page: number): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "search", {
    search_term: searchTerm,
    page,
  });
}
