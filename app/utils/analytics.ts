/**
 * GA4 に検索実行イベントを送信する。
 * 検索が成功したタイミングで呼び、GA の「イベント」レポートで過去24時間の件数などを確認できる。
 * 
 * Google Tag Managerが遅延読み込みされるため、gtagがまだ読み込まれていない場合は
 * dataLayerにイベントをキューイングして、後で処理されるようにする。
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function sendSearchEvent(searchTerm: string, page: number): void {
  if (typeof window === "undefined") return;

  const eventData = {
    event: "search",
    search_term: searchTerm,
    page,
  };

  // gtagが読み込まれている場合は直接呼び出す
  if (window.gtag) {
    window.gtag("event", "search", {
      search_term: searchTerm,
      page,
    });
  } else {
    // gtagがまだ読み込まれていない場合は、dataLayerにキューイング
    // これにより、Google Tag Managerが読み込まれた後にイベントが処理される
    if (!window.dataLayer) {
      window.dataLayer = [];
    }
    window.dataLayer.push(eventData);
  }
}
