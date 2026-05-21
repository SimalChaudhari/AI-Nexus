import { useCallback, useEffect, useRef, useState } from 'react';

import { courseService } from 'src/services/course.service';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;
const SCROLL_LOAD_THRESHOLD_PX = 48;

function filterSelectableCourses(rows, excludeIds) {
  const exclude = new Set(excludeIds || []);
  return (rows || []).filter((course) => course?.id && !course?.isBundle && !exclude.has(course.id));
}

export function useCurriculumCourseSearch({ excludeIds = [], enabled = true } = {}) {
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);

  const excludeKey = (excludeIds || []).join('|');
  const requestIdRef = useRef(0);
  const debounceRef = useRef(null);
  const wasOpenRef = useRef(false);

  const fetchCourses = useCallback(
    async ({ page: pageNum, searchTerm, append }) => {
      if (!enabled) return;

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await courseService.getAllCourses({
          page: pageNum,
          limit: PAGE_SIZE,
          search: searchTerm?.trim() || undefined,
        });

        if (requestId !== requestIdRef.current) return;

        const rows = filterSelectableCourses(result?.data, excludeIds);
        const pagination = result?.pagination || {};

        setOptions((prev) => {
          const merged = append ? [...prev, ...rows] : rows;
          const seen = new Set();
          return merged.filter((course) => {
            if (!course?.id || seen.has(course.id)) return false;
            seen.add(course.id);
            return true;
          });
        });
        setPage(pagination.page || pageNum);
        setHasNextPage(Boolean(pagination.hasNextPage));
      } catch {
        if (requestId !== requestIdRef.current) return;
        if (!append) setOptions([]);
        setHasNextPage(false);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [enabled, excludeKey]
  );

  const resetAndFetch = useCallback(
    (searchTerm) => {
      setPage(1);
      setHasNextPage(false);
      fetchCourses({ page: 1, searchTerm, append: false });
    },
    [fetchCourses]
  );

  useEffect(() => {
    if (!enabled || !open) {
      wasOpenRef.current = false;
      return undefined;
    }

    const isOpenTransition = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (isOpenTransition) {
      resetAndFetch(search);
      return undefined;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      resetAndFetch(search);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, enabled, excludeKey, resetAndFetch]);

  const loadMore = useCallback(() => {
    if (!enabled || loading || loadingMore || !hasNextPage) return;
    fetchCourses({ page: page + 1, searchTerm: search, append: true });
  }, [enabled, loading, loadingMore, hasNextPage, page, search, fetchCourses]);

  const handleInputChange = useCallback((_, value, reason) => {
    if (reason === 'reset') return;
    setInputValue(value);
    setSearch(value);
  }, []);

  const handleListboxScroll = useCallback(
    (event) => {
      const node = event.currentTarget;
      const nearBottom =
        node.scrollTop + node.clientHeight >= node.scrollHeight - SCROLL_LOAD_THRESHOLD_PX;
      if (nearBottom) loadMore();
    },
    [loadMore]
  );

  const clearInput = useCallback(() => {
    setInputValue('');
    setSearch('');
  }, []);

  return {
    options,
    inputValue,
    loading,
    loadingMore,
    hasNextPage,
    open,
    setOpen,
    handleInputChange,
    handleListboxScroll,
    clearInput,
    resetAndFetch,
  };
}
