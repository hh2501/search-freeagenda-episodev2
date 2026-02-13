import Link from "next/link";
import SearchTipsClient from "../components/SearchTipsClient";

export const metadata = {
  title: "検索のコツ",
  description:
    "フリーアジェンダのエピソード検索の使い方をご紹介します。部分検索、完全一致検索、キーワードの組み合わせなど、効率的な検索方法を説明します。",
};

export default function TipsPage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-body-medium text-freeagenda-dark hover:text-freeagenda-light transition-colors mb-6"
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
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            トップページに戻る
          </Link>
          <SearchTipsClient />
        </div>
      </div>
    </main>
  );
}
