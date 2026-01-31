/**
 * Vercel Edge Network 用 Cache-Control ヘッダー
 * - public: 共有キャッシュ（CDN）に保存可能
 * - max-age=0: ブラウザ（private cache）では再利用前に再検証
 * - s-maxage: 共有キャッシュでの新鮮さ（秒）。private cache では無視される
 * - stale-while-revalidate: 古いレスポンスを返しつつバックグラウンドで再検証
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
 * @see https://vercel.com/docs/concepts/edge-network/caching
 * @see https://zenn.dev/msy/articles/a2ef868fe113bc
 */

/** 検索API: 60秒エッジキャッシュ、120秒 stale-while-revalidate */
export const CACHE_CONTROL_SEARCH =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=120";

/** 最新エピソードAPI: 60秒エッジ、120秒 revalidate */
export const CACHE_CONTROL_LATEST_EPISODE =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=120";

/** エピソード詳細API: 5分エッジ、10分 revalidate（更新頻度低） */
export const CACHE_CONTROL_EPISODE =
  "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

/** エピソード件数API: 60秒エッジ、120秒 revalidate */
export const CACHE_CONTROL_COUNT =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=120";

export function cacheHeaders(
  cacheControl: string,
): { "Cache-Control": string } {
  return { "Cache-Control": cacheControl };
}
