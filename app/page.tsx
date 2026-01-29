import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import HomeHeader from "./components/HomeHeader";
import LatestEpisode from "./components/LatestEpisode";
import HomeContent from "./components/HomeContent";

const SearchTipsClient = dynamic(
  () => import("./components/SearchTipsClient"),
  {
    ssr: false,
    loading: () => (
      <div
        className="mt-6 min-h-[200px] md-outlined-card animate-pulse rounded-lg bg-gray-100"
        aria-hidden="true"
      />
    ),
  },
);

// トップページの再検証間隔（秒）。キャッシュで繰り返し訪問を高速化
export const revalidate = 60;

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 静的コンテンツ: サーバーコンポーネントでレンダリング */}
        <HomeHeader />
        <LatestEpisode />

        {/* useSearchParams() 使用のため Suspense 必須。静的フォームで即時表示（しずかなインターネット方式） */}
        <Suspense
          fallback={
            <div className="mb-8" aria-hidden="true">
              <div className="md-search-form relative">
                <input
                  type="text"
                  readOnly
                  placeholder="キーワードを入力（例: エンジニア）"
                  className="md-search-form-input"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="md-search-form-button"
                  tabIndex={-1}
                  aria-hidden="true"
                >
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
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </button>
              </div>
              <div className="mb-6 flex items-center justify-center gap-3">
                <span className="text-body-medium text-gray-500">
                  完全一致検索
                </span>
              </div>
            </div>
          }
        >
          <HomeContent />
        </Suspense>

        {/* 検索のコツ: dynamic import で遅延読み込み（TBT 削減） */}
        <div id="search-tips-server-container" className="content-below-fold">
          <SearchTipsClient />
        </div>

        {/* ページ最下部: モバイルでは content-visibility で描画遅延 */}
        <div className="mt-12 pt-8 border-t border-gray-200 content-below-fold">
          <div className="flex gap-4 justify-center items-center flex-wrap">
            <a href="/about" className="md-text-button">
              このサイトについて
            </a>
            {process.env.NODE_ENV !== "production" && (
              <a href="/sync" className="md-text-button">
                データ同期ページ
              </a>
            )}
            <Link href="/coffee" className="md-text-button">
              コーヒーを奢る
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
