import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import HomeHeader from "./components/HomeHeader";

const HomeContent = dynamic(
  () => import("./components/HomeContent").then((m) => m.default),
  { ssr: false }
);

const LatestEpisode = dynamic(
  () => import("./components/LatestEpisode").then((m) => m.default),
  { ssr: false }
);

export const revalidate = 60;

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <HomeHeader />
        <LatestEpisode />
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
        <div className="mt-12 pt-8 border-t border-gray-200 content-below-fold">
          <div className="flex flex-row flex-wrap gap-8 md:gap-12 items-start">
            <div className="flex flex-col gap-4">
              <Link href="/tips" className="md-text-button">
                検索のコツ
              </Link>
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
            <div className="flex flex-col gap-4">
              <a
                href="https://x.com/_miozuma_"
                target="_blank"
                rel="noopener noreferrer"
                className="md-text-button"
              >
                Developed by miozuma
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
