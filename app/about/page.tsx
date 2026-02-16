import Link from "next/link";
import BackLinkIcon from "@/app/components/BackLinkIcon";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "このサイトについて",
};

export default function About() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="md-text-button inline-flex items-center gap-1"
          >
            <BackLinkIcon />
            トップページに戻る
          </Link>
        </div>

        <div className="md-outlined-card">
          <h1 className="text-title-large font-bold mb-6 text-gray-900">
            このサイトについて
          </h1>

          <div className="prose prose-lg max-w-none">
            <div className="text-body-medium text-gray-700 leading-relaxed mb-6 space-y-3">
              <p>
                「フリーアジェンダのあの回」は、思い出せないエピソードを簡単に見つけられる<span className="font-bold text-freeagenda-dark">非公式</span>の検索ツールです。
              </p>
              <p>
                SpotifyやYouTubeの検索では届かない<strong>トーク内容の細部まで、文字起こしから検索が可能</strong>です。最新エピソードも、更新から24時間以内には反映されます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
