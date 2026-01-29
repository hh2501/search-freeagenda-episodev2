import { Suspense } from "react";
import Link from "next/link";
import HomeHeader from "./components/HomeHeader";
import SearchTipsServer from "./components/SearchTipsServer";
import LatestEpisode from "./components/LatestEpisode";
import HomeContent from "./components/HomeContent";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 静的コンテンツ: サーバーコンポーネントでレンダリング */}
        <HomeHeader />
        <LatestEpisode />

        {/* 動的コンテンツ: クライアントコンポーネント */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg
                  className="animate-spin h-8 w-8 mx-auto mb-4 text-freeagenda-dark"
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
                <p className="text-gray-600">読み込み中...</p>
              </div>
            </div>
          }
        >
          <HomeContent />
        </Suspense>

        {/* 検索のコツ: サーバーコンポーネント（条件付き表示はクライアント側で制御） */}
        <div id="search-tips-server-container">
          <SearchTipsServer />
        </div>

        {/* ページ最下部: フッターリンク */}
        <div className="mt-12 pt-8 border-t border-gray-200">
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
