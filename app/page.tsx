import Link from "next/link";
import HomeHeader from "./components/HomeHeader";
import SearchTipsServer from "./components/SearchTipsServer";
import LatestEpisode from "./components/LatestEpisode";
import HomeContent from "./components/HomeContent";

// トップページの再検証間隔（秒）。キャッシュで繰り返し訪問を高速化
export const revalidate = 60;

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 静的コンテンツ: サーバーコンポーネントでレンダリング */}
        <HomeHeader />
        <LatestEpisode />

        {/* 検索フォーム・結果: クライアントコンポーネント（SSR で初期 HTML に含め、表示を早くする） */}
        <HomeContent />

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
