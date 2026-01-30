interface SearchResult {
  episodeId: string;
  title: string;
  description: string;
  publishedAt: string;
  listenUrl: string;
  preview: string;
  keywordPreviews?: { keyword: string; fragment: string }[];
  rank: number;
}

type SortBy = "relevance" | "date-desc" | "date-asc";

export function sortSearchResults(
  results: SearchResult[],
  sortBy: SortBy,
): SearchResult[] {
  const sorted = [...results];

  switch (sortBy) {
    case "relevance":
      return sorted.sort((a, b) => b.rank - a.rank);
    case "date-desc": {
      return sorted.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateB - dateA;
      });
    }
    case "date-asc": {
      return sorted.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateA - dateB;
      });
    }
    default:
      return sorted;
  }
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function buildEpisodeUrl(
  episodeId: string,
  query: string,
  exactMatchMode: boolean,
): string {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (exactMatchMode) {
    params.set("exact", "1");
  }
  const queryString = params.toString();
  return `/episode/${episodeId}${queryString ? `?${queryString}` : ""}`;
}

export function buildSearchUrlParams(
  query: string,
  exactMatch: boolean,
  page: number,
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query);
  }
  if (exactMatch) {
    params.set("exact", "1");
  }
  params.set("page", page.toString());
  return params;
}
