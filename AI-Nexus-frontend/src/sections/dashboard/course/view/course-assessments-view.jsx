import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';

import { CourseAssignmentSubmissionsPanel } from '../course-assignment-submissions-panel';

// ----------------------------------------------------------------------

export function CourseAssessmentsView({ courseId, course, loading, error }) {
  if (loading && !course) {
    return <LoadingScreen />;
  }

  if (error || !courseId) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Course not found"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.course.list}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to courses
            </Button>
          }
          sx={{ py: 10 }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Assessment submissions"
        links={[
          { name: 'Dashboard', href: paths.admin.root },
          { name: 'Course', href: paths.admin.course.list },
          { name: course?.title || 'Course', href: paths.admin.course.details(courseId) },
          { name: 'Assessments' },
        ]}
        action={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ width: { xs: 1, sm: 'auto' } }}
          >
            <Button
              component={RouterLink}
              href={paths.admin.course.details(courseId)}
              variant="outlined"
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              fullWidth
              sx={{ width: { sm: 'auto' } }}
            >
              Back to course
            </Button>
            <Button
              component={RouterLink}
              href={paths.admin.course.edit(courseId)}
              variant="contained"
              startIcon={<Iconify icon="solar:pen-bold" />}
              fullWidth
              sx={{ width: { sm: 'auto' } }}
            >
              Edit course
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 4 } }}
      />

      <CourseAssignmentSubmissionsPanel courseId={courseId} />
    </DashboardContent>
  );
}
