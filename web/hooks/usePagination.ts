import { useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 50;

type UsePaginationResult<T> = {
  /** The subset of items visible on the current "page" (cumulative). */
  visibleItems: T[];
  /** Whether there are more items to show. */
  hasMore: boolean;
  /** Load the next page of items. */
  showMore: () => void;
  /** Total number of items in the source list. */
  totalCount: number;
  /** Number of items currently visible. */
  visibleCount: number;
};

/**
 * Client-side pagination hook that progressively reveals items.
 *
 * Displays the first `pageSize` items and exposes a `showMore` callback
 * that appends the next page.  The visible window resets automatically
 * whenever the identity of `items` changes (e.g. after a filter update).
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = DEFAULT_PAGE_SIZE,
): UsePaginationResult<T> {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [prevItems, setPrevItems] = useState(items);

  // Reset to the first page whenever the source list changes.
  // This follows the React-recommended pattern for adjusting state
  // based on props/derived values without useEffect.
  if (items !== prevItems) {
    setPrevItems(items);
    setVisibleCount(pageSize);
  }

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  const hasMore = visibleCount < items.length;

  const showMore = () => {
    setVisibleCount((previous) => Math.min(previous + pageSize, items.length));
  };

  return {
    visibleItems,
    hasMore,
    showMore,
    totalCount: items.length,
    visibleCount: visibleItems.length,
  };
}
