"use client";

import { memo } from "react";

const SearchTips = memo(function SearchTips() {
  return (
    <div className="mt-6 md-outlined-card">
      <h3 className="text-title-large font-semibold text-gray-800 mb-6">
        検索のコツ
      </h3>

      <div className="space-y-6">
        <div className="border-l-4 border-freeagenda-light pl-4 py-2">
          <h4 className="text-title-medium font-semibold text-gray-800 mb-2">
            部分検索（デフォルト）
          </h4>
          <p className="text-body-medium text-gray-600 leading-relaxed">
            検索欄にキーワードを入力すると、
            <strong>キーワードを含むエピソード</strong>が表示されます。
            <br />
            <br />
            <strong>例：</strong> <code className="md-code">社会</code> →
            「社会」「社会問題」「会社員」などを含むエピソードが表示されます。
          </p>
        </div>

        <div className="border-l-4 border-freeagenda-light pl-4 py-2">
          <h4 className="text-title-medium font-semibold text-gray-800 mb-2">
            完全一致検索
          </h4>
          <p className="text-body-medium text-gray-600 leading-relaxed">
            「完全一致検索」のトグルをオンにすると、
            <strong>キーワードと完全に一致する文字列</strong>
            を含むエピソードのみが表示されます。
            <br />
            <br />
            <strong>例：</strong> <code className="md-code">社会</code> →
            「社会」を含むエピソードのみが表示され、文字列が異なる「会社員」などは表示されません。
          </p>
        </div>

        <div className="border-l-4 border-freeagenda-light pl-4 py-2">
          <h4 className="text-title-medium font-semibold text-gray-800 mb-2">
            キーワードの組み合わせ
          </h4>
          <p className="text-body-medium text-gray-600 leading-relaxed">
            複数のキーワードを<strong>スペース</strong>
            で区切って入力すると、条件を組み合わせて検索できます。
            <br />
            <br />
            <strong>例：</strong> <code className="md-code">社会 資本</code> →
            両方のキーワードを含むエピソードが表示されます。
            <br />
            完全一致検索を有効にすると、
            <strong>すべてのキーワードに完全一致</strong>
            するエピソードのみが表示されます。
          </p>
        </div>
      </div>
    </div>
  );
});

export default SearchTips;
