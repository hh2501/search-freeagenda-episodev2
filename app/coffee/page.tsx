import Link from "next/link";

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
          <h1 className="text-headline-large md:text-display-small font-bold mb-6 text-gray-900">
            コーヒーを奢る
          </h1>

          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-body-large text-gray-700 leading-relaxed mb-6">
              このサイトでは、エピソードの文字起こしの誤字脱字や表記の揺れを手動でチェックしていきます。
            </p>
            <p className="text-body-large text-gray-700 leading-relaxed mb-8">
              より正確な検索結果を提供するため、継続的に改善を続けています。もしこのサイトが役に立ったら、コーヒーを奢っていただけると嬉しいです。
            </p>

            <div className="flex justify-center mb-8">
              <a
                href="https://buymeacoffee.com/miozuma"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block hover:opacity-80 transition-opacity"
              >
                <img
                  src="/bmc-brand-logo.svg"
                  alt="Buy Me a Coffee"
                  className="h-10 w-auto"
                />
              </a>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-title-large font-semibold text-gray-800 mb-4">
                文字起こしチェックの状況
              </h2>
              <p className="text-body-medium text-gray-600 mb-4">
                手動でチェックしたエピソードの状況は、以下のページで確認できます。
              </p>
              <Link
                href="/coffee/checklist"
                className="md-outlined-button inline-flex items-center gap-2"
              >
                チェックリストを見る
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
    </main>
  );
}
