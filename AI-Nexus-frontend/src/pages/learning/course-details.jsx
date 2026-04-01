import { Helmet } from 'react-helmet-async';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';

import { CONFIG } from 'src/config-global';

import { useGetCourse } from 'src/actions/course';
import { paths } from 'src/routes/paths';
import { LearningTopBar } from 'src/sections/learning';
import { LearningCourseDetailsView } from 'src/sections/learning/view/learning-course-details-view';

// ----------------------------------------------------------------------

const metadata = { title: `Course Details | ${CONFIG.site.name}` };

export default function LearningCourseDetailsPage() {
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
        <title>{metadata.title}</title>
      </Helmet>
 
      <LearningTopBar
        activeTab="courses"
        setActiveTab={handleLearningTabChange}
        showCart
      />
      <Box sx={{ mt: { xs: 2, md: 3 } }}>
        <LearningCourseDetailsView course={course} loading={courseLoading} error={courseError} />
      </Box>
    </>
  );
}
