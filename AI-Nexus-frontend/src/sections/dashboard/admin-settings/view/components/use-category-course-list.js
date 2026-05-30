import { useCallback, useEffect, useRef, useState } from 'react';

import { courseService } from 'src/services/course.service';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;
const SCROLL_LOAD_THRESHOLD_PX = 48;

function mapCourseRow(course, categoryId) {
  return {
    id: course.id,
    title: course.title || '',
    modulesCount: Number(course.modulesCount) || 0,
    categoryId,
  };
}

function filterCategoryCourses(rows, categoryId) {
  return (rows || []).filter(
    (course) =>
      course?.id &&
      !course?.isBundle &&
      String(course.categoryId || '') === String(categoryId)
  );
}

export function useCategoryCourseList({ categoryId = '', enabled = true } = {}) {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const requestIdRef = useRef(0);
  const debounceRef = useRef(null);
  const prevCategoryIdRef = useRef('');
  const skipSearchFetchRef = useRef(false);

  const fetchCourses = useCallback(
    async ({ page: pageNum, searchTerm, append, catId }) => {
      if (!enabled || !catId) return;

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
          categoryId: catId,
          excludeBundles: true,
          search: searchTerm?.trim() || undefined,
        });

        if (requestId !== requestIdRef.current) return;

        const rows = filterCategoryCourses(result?.data, catId).map((course) =>
          mapCourseRow(course, catId)
        );
        const pagination = result?.pagination || {};

        setCourses((prev) => {
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
        if (!append) setCourses([]);
        setHasNextPage(false);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [enabled]
  );

  const resetAndFetch = useCallback(
    (searchTerm, catId) => {
      setPage(1);
      setHasNextPage(false);
      fetchCourses({ page: 1, searchTerm, append: false, catId });
    },
    [fetchCourses]
  );

  useEffect(() => {
    if (!enabled || !categoryId) {
      prevCategoryIdRef.current = '';
      skipSearchFetchRef.current = false;
      setCourses([]);
      setSearch('');
      setLoading(false);
      setLoadingMore(false);
      setHasNextPage(false);
      return () => {
        requestIdRef.current += 1;
      };
    }

    const categoryChanged = prevCategoryIdRef.current !== categoryId;
    prevCategoryIdRef.current = categoryId;

    if (categoryChanged) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      skipSearchFetchRef.current = true;
      setSearch('');
      resetAndFetch('', categoryId);
      return () => {
        requestIdRef.current += 1;
      };
    }

    if (skipSearchFetchRef.current) {
      skipSearchFetchRef.current = false;
      return undefined;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      resetAndFetch(search, categoryId);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [categoryId, enabled, search, resetAndFetch]);

  const loadMore = useCallback(() => {
    if (!enabled || !categoryId || loading || loadingMore || !hasNextPage) return;
    fetchCourses({
      page: page + 1,
      searchTerm: search,
      append: true,
      catId: categoryId,
    });
  }, [enabled, categoryId, loading, loadingMore, hasNextPage, page, search, fetchCourses]);

  const handleListScroll = useCallback(
    (event) => {
      const node = event.currentTarget;
      const nearBottom =
        node.scrollTop + node.clientHeight >= node.scrollHeight - SCROLL_LOAD_THRESHOLD_PX;
      if (nearBottom) loadMore();
    },
    [loadMore]
  );

  const setSearchTerm = useCallback((value) => {
    setSearch(value);
  }, []);

  return {
    courses,
    search,
    setSearchTerm,
    loading,
    loadingMore,
    hasNextPage,
    handleListScroll,
    loadMore,
  };
}
