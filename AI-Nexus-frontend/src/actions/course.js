import { useState, useEffect } from 'react';
import { courseService } from 'src/services/course.service';

export function useGetCourse(courseId) {
  const [course, setCourse] = useState(null);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState(null);

  useEffect(() => {
    if (!courseId) {
      setCourseLoading(false);
      return;
    }

    const fetchCourse = async () => {
      try {
        setCourseLoading(true);
        setCourseError(null);
        const data = await courseService.getCourseById(courseId);
        setCourse(data);
      } catch (error) {
        setCourseError(error?.message || 'Failed to fetch course');
        setCourse(null);
      } finally {
        setCourseLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  return { course, courseLoading, courseError };
}

