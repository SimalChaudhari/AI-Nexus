import { useEffect, useState } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { paths } from 'src/routes/paths';
import { courseService } from 'src/services/course.service';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { CourseQuestionAttemptsPanel } from '../course-question-attempts-panel';

export function CourseAttemptsView() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const loadCourses = async () => {
    if (coursesLoaded || coursesLoading) return;
    setCoursesLoading(true);
    try {
      // Course filter options should be complete and non-paginated in the UI.
      const res = await courseService.getAllCourses();
      const list = Array.isArray(res) ? res : res?.data || [];
      setCourses(list);
      setCoursesLoaded(true);
    } catch {
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Quiz attempts"
        links={[
          { name: 'Dashboard', href: paths.admin.root },
          { name: 'Course', href: paths.admin.course.list },
          { name: 'Quiz attempts' },
        ]}
        sx={{ mb: { xs: 3, md: 4 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">Course filter</Typography>
          <FormControl size="small" sx={{ maxWidth: 420 }}>
            <InputLabel>Course</InputLabel>
            <Select
              label="Course"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              onOpen={loadCourses}
            >
              <MenuItem value="">All courses</MenuItem>
              {coursesLoading && (
                <MenuItem disabled value="__loading__">
                  Loading courses...
                </MenuItem>
              )}
              {courses.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Card>

      <CourseQuestionAttemptsPanel courseId={selectedCourseId || undefined} />
    </DashboardContent>
  );
}

