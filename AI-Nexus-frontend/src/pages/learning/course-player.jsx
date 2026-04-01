import { Helmet } from 'react-helmet-async';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { useGetCourse } from 'src/actions/course';
import { paths } from 'src/routes/paths';
import { LearningTopBar } from 'src/sections/learning';
import { LearningCoursePlayerView } from 'src/sections/learning/view/learning-course-player-view';

// ----------------------------------------------------------------------

const metadata = { title: `Learn | ${CONFIG.site.name}` };

export default function LearningCoursePlayerPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { course, courseLoading, courseError } = useGetCourse(params.id);

  const handleLearningTabChange = useCallback(
    (tab) => {
      navigate(tab === 'courses' ? paths.learning : `${paths.learning}?tab=${tab}`);
    },
    [navigate]
  );

  return (
    <>
      <Helmet>
        <title>{course ? `${course.title} | ${metadata.title}` : metadata.title}</title>
      </Helmet>
      <LearningTopBar
        activeTab="courses"
        setActiveTab={handleLearningTabChange}
        showCart={false}
      />
      <LearningCoursePlayerView course={course} loading={courseLoading} error={courseError} />
    </>
  );
}
