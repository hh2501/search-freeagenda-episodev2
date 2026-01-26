import Link from 'next/link';

export default function About() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="md-text-button inline-flex items-center gap-1"
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
              <path d="M15 18l-6-6 6-6" />
            </svg>
            トップページに戻る
          </Link>
        </div>

        <div className="md-elevated-card">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
            このサイトについて
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed mb-5 text-base">
              「フリーアジェンダのあの回」は、思い出せないエピソードを簡単に見つけられる<span className="font-bold text-freeagenda-dark">非公式</span>の検索ツールです。
            </p>

            <p className="text-gray-700 leading-relaxed mb-5 text-base">
              SpotifyやYouTubeの検索では届かない<strong>トーク内容の細部まで、文字起こしから検索が可能</strong>です。最新エピソードも、更新から24時間以内には反映されます。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
