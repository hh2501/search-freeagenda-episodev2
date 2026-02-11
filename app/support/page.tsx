import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "コーヒーを奢る",
};

export default function Support() {
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

        <div className="md-outlined-card">
          <h1 className="text-title-large font-bold mb-6 text-gray-900">
            コーヒーを奢る
          </h1>

          <div className="prose prose-lg max-w-none">
            <div className="text-body-medium text-gray-700 leading-relaxed mb-6 space-y-3">
              <p>
                当サイトでは、検索性を高めるため、自動文字起こし特有の誤字や表記ゆれを手作業で修正しています。
              </p>
              <p>現在は週に7エピソードほどのペースで更新中です。</p>
              <p>
                もし活動を応援いただけるようでしたら、コーヒー1杯分ほどのサポートをいただけますと幸いです。
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
          </div>
        </div>
      </div>
    </main>
  );
}
