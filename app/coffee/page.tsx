import Link from "next/link";
import Image from "next/image";

export default function Coffee() {
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
          <h1 className="text-title-large font-bold mb-6 text-gray-900">
            コーヒーを奢る
          </h1>

          <div className="prose prose-lg max-w-none mb-8">
            <div className="text-body-medium text-gray-700 leading-relaxed mb-6 space-y-3">
              <p>
                このサイトでは、自動文字起こしで出てしまう誤字や表記ゆれを、検索しやすくするために手作業で直しています。
              </p>
              <p>今は、だいたい週に3エピソードくらいのペースで進めています。</p>
              <p>
                もし「ちょっと便利かも」と思ってもらえたら、コーヒー一杯分のサポートをもらえると嬉しいです。
              </p>
            </div>

            <div className="flex justify-center mb-8">
              <a
                href="https://buymeacoffee.com/miozuma"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/bmc-button.png"
                  alt="Buy Me a Coffee"
                  width={217}
                  height={60}
                />
              </a>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-title-large font-semibold text-gray-800 mb-4">
                文字起こしチェックの状況
              </h2>
              <p className="text-body-medium text-gray-600 mb-4">
                手動で修正したエピソードの状況は、以下のページで確認できます。
              </p>
              <div className="flex justify-center mb-0">
                <Link
                  href="/coffee/checklist"
                  className="md-outlined-button inline-flex items-center gap-2"
                >
                  文字起こしチェックリストを見る
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
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
