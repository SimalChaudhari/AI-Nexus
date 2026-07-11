import { useState, useEffect } from 'react';
import { courseService } from 'src/services/course.service';

export function useGetCourse(courseId) {
  const [course, setCourse] = useState(null);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState(null);

  useEffect(() => {
    if (!courseId) {
      setCourse(null);
      setCourseError(null);
      setCourseLoading(false);
      return undefined;
    }

    let cancelled = false;

    const fetchCourse = async () => {
      try {
        setCourseLoading(true);
        setCourseError(null);
        const data = await courseService.getCourseById(courseId);
        if (!cancelled) setCourse(data);
      } catch (error) {
        if (!cancelled) {
          setCourseError(error?.message || 'Failed to fetch course');
          setCourse(null);
        }
      } finally {
        if (!cancelled) setCourseLoading(false);
      }
    };

    fetchCourse();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return { course, courseLoading, courseError };
}

