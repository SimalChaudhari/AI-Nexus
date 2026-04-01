import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { useGetCourse } from 'src/actions/course';
import { LearningCoursePlayerView } from 'src/sections/learning/view/learning-course-player-view';

// ----------------------------------------------------------------------

const metadata = { title: `Learn | ${CONFIG.site.name}` };

export default function LearningCoursePlayerPage() {
  const params = useParams();
  const { course, courseLoading, courseError } = useGetCourse(params.id);

  return (
    <>
      <Helmet>
        <title>{course ? `${course.title} | ${metadata.title}` : metadata.title}</title>
      </Helmet>
      <LearningCoursePlayerView course={course} loading={courseLoading} error={courseError} />
    </>
  );
}
