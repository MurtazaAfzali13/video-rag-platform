"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
}

/** Renders nothing when there's only one page — matches the requirement
 * that pagination only shows up once there are enough videos to need it. */
export function Pagination({
  page,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPrevious,
  onNext,
  onGoToPage,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = getVisiblePageNumbers(page, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1.5 pt-2" aria-label="Video pages">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasPreviousPage}
        aria-label="Previous page"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageNumbers.map((entry, idx) =>
        entry === "ellipsis" ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-sm text-white/30">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onGoToPage(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition-colors ${
              entry === page
                ? "bg-gradient-to-br from-purple-500 to-blue-500 font-medium text-white"
                : "text-white/60 ring-1 ring-white/[0.06] hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {entry}
          </button>
        )
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!hasNextPage}
        aria-label="Next page"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

function getVisiblePageNumbers(page: number, totalPages: number): Array<number | "ellipsis"> {
  const windowSize = 1;
  const pages = new Set<number>([1, totalPages]);

  for (let offset = -windowSize; offset <= windowSize; offset += 1) {
    const candidate = page + offset;
    if (candidate > 0 && candidate <= totalPages) pages.add(candidate);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const withEllipses: Array<number | "ellipsis"> = [];

  sorted.forEach((value, idx) => {
    if (idx > 0 && value - sorted[idx - 1] > 1) {
      withEllipses.push("ellipsis");
    }
    withEllipses.push(value);
  });

  return withEllipses;
}
