// 検索結果のキャッシュ管理

interface CachedResult {
  data: any;
  timestamp: number;
  expiresAt: number;
}

// メモリキャッシュ（Mapを使用）
const cache = new Map<string, CachedResult>();

// デフォルトのキャッシュ有効期限（1時間）
const DEFAULT_TTL = 60 * 60 * 1000; // 1時間（ミリ秒）

// 開発環境では短い有効期限（5分）
const DEV_TTL = 5 * 60 * 1000; // 5分（ミリ秒）

/**
 * キャッシュキーを生成
 */
function generateCacheKey(query: string): string {
  return `search:${query.trim().toLowerCase()}`;
}

/**
 * キャッシュから検索結果を取得
 */
export function getCachedResult(query: string): any | null {
  const key = generateCacheKey(query);
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  // 有効期限をチェック
  const now = Date.now();
  if (now > cached.expiresAt) {
    // 有効期限切れの場合は削除
    cache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * 検索結果をキャッシュに保存
 */
export function setCachedResult(query: string, data: any, ttl?: number): void {
  const key = generateCacheKey(query);
  const now = Date.now();
  const effectiveTTL = ttl || (process.env.NODE_ENV === 'development' ? DEV_TTL : DEFAULT_TTL);
  const expiresAt = now + effectiveTTL;

  cache.set(key, {
    data,
    timestamp: now,
    expiresAt,
  });
}

/**
 * キャッシュをクリア
 */
export function clearCache(query?: string): void {
  if (query) {
    const key = generateCacheKey(query);
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * 有効期限切れのキャッシュを削除
 */
export function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, cached] of cache.entries()) {
    if (now > cached.expiresAt) {
      cache.delete(key);
    }
  }
}

/**
 * キャッシュの統計情報を取得
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
} {
  // 有効期限切れのキャッシュをクリーンアップ
  cleanExpiredCache();

  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

// 定期的に有効期限切れのキャッシュをクリーンアップ（30分ごと）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanExpiredCache();
  }, 30 * 60 * 1000); // 30分
}
