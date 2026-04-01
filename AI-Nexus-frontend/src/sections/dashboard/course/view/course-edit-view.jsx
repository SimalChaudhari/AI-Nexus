import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { CourseNewEditForm } from '../course-new-edit-form';

// ----------------------------------------------------------------------

export function CourseEditView({ course: currentCourse }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Course', href: paths.admin.course.list },
          { name: currentCourse?.title },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <CourseNewEditForm currentCourse={currentCourse} />
    </DashboardContent>
  );
}

