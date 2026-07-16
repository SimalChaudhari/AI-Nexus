import { useCallback, useEffect, useRef, useState } from 'react';

import { courseService } from 'src/services/course.service';

const PAGE_SIZE = 20;

function mapCourseRow(course, categoryId) {
  return {
    id: course.id,
    title: course.title || '',
    modulesCount: Number(course.modulesCount) || 0,
    categoryId,
  };
}

/** Load first page only — used for admin summary rows (not full category dump). */
export async function fetchCoursesPageForCategory(categoryId, page = 1, search = '') {
  const result = await courseService.getAllCourses({
    page,
    limit: PAGE_SIZE,
    categoryId,
    excludeBundles: true,
    search: search?.trim() || undefined,
  });

  const rows = (result?.data || [])
    .filter(
      (course) =>
        course?.id &&
        !course?.isBundle &&
        String(course.categoryId || '') === String(categoryId)
    )
    .map((course) => mapCourseRow(course, categoryId));

  return {
    courses: rows,
    pagination: result?.pagination || {},
  };
}

export function useCategoryCourses(categoryIds = [], categoryCourseIdsMap = {}) {
  const [coursesByCategory, setCoursesByCategory] = useState({});
  const [loadingByCategory, setLoadingByCategory] = useState({});
  const loadedRef = useRef(new Set());
  const inflightRef = useRef(new Set());

  const categoryKey = (categoryIds || []).join('|');

  const loadCategory = useCallback(async (categoryId) => {
    if (!categoryId || loadedRef.current.has(categoryId) || inflightRef.current.has(categoryId)) {
      return;
    }

    inflightRef.current.add(categoryId);
    setLoadingByCategory((prev) => ({ ...prev, [categoryId]: true }));

    try {
      const { courses } = await fetchCoursesPageForCategory(categoryId, 1);
      loadedRef.current.add(categoryId);
      setCoursesByCategory((prev) => ({
        ...prev,
        [categoryId]: courses,
      }));
    } catch {
      setCoursesByCategory((prev) => ({
        ...prev,
        [categoryId]: prev[categoryId] || [],
      }));
    } finally {
      inflightRef.current.delete(categoryId);
      setLoadingByCategory((prev) => ({ ...prev, [categoryId]: false }));
    }
  }, []);

  useEffect(() => {
    const activeIds = new Set((categoryIds || []).filter(Boolean));

    loadedRef.current.forEach((id) => {
      if (!activeIds.has(id)) loadedRef.current.delete(id);
    });

    setCoursesByCategory((prev) => {
      const next = {};
      activeIds.forEach((id) => {
        if (prev[id]) next[id] = prev[id];
      });
      return next;
    });

    activeIds.forEach((categoryId) => {
      loadCategory(categoryId);
    });
  }, [categoryKey, loadCategory]);

  const reloadCategory = useCallback((categoryId) => {
    if (!categoryId) return;
    loadedRef.current.delete(categoryId);
    loadCategory(categoryId);
  }, [loadCategory]);

  return { coursesByCategory, loadingByCategory, reloadCategory };
}
