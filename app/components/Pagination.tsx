"use client";

import { memo, useMemo } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  loading,
  onPageChange,
}: PaginationProps) {
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxPages = Math.min(5, totalPages);

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxPages; i++) {
        pages.push(i);
      }
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        pages.push(i);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className="px-4 py-2 text-body-medium border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        前へ
      </button>
      <div className="flex items-center gap-1">
        {pageNumbers.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            disabled={loading}
            className={`px-3 py-2 text-body-medium border rounded-md transition-colors ${
              currentPage === pageNum
                ? "bg-freeagenda-dark text-white border-freeagenda-dark"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {pageNum}
          </button>
        ))}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
        className="px-4 py-2 text-body-medium border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        次へ
      </button>
    </div>
  );
});

export default Pagination;
