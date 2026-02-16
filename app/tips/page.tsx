import Link from "next/link";
import BackLinkIcon from "@/app/components/BackLinkIcon";
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
            <BackLinkIcon />
            トップページに戻る
          </Link>
          <SearchTipsClient />
        </div>
      </div>
    </main>
  );
}
