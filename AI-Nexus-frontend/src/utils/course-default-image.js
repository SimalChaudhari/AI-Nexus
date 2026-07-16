export const ENV_DEFAULT_COURSE_IMAGE =
  import.meta.env.VITE_DEFAULT_COURSE_IMAGE || '/assets/images/cover/cover-1.jpg';

export function getCourseDefaultImage() {
  if (typeof window === 'undefined') return ENV_DEFAULT_COURSE_IMAGE;
  return window.localStorage.getItem('course-default-image-url') || ENV_DEFAULT_COURSE_IMAGE;
}
