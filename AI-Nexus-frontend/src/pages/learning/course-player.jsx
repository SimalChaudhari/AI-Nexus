import { Helmet } from 'react-helmet-async';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';

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
      {/* Player fills viewport below site header; left + right columns scroll inside. */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: 1,
          flex: 1,
          minHeight: 0,
          height: '100%',
          maxHeight: '100%',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            boxShadow: (theme) => `0 1px 0 ${theme.palette.divider}`,
          }}
        >
          <LearningTopBar
            activeTab="courses"
            setActiveTab={handleLearningTabChange}
            showCart={false}
            sticky={false}
          />
        </Box>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <LearningCoursePlayerView course={course} loading={courseLoading} error={courseError} />
        </Box>
      </Box>
    </>
  );
}
