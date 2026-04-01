import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { CourseNewEditForm } from '../course-new-edit-form';

// ----------------------------------------------------------------------

export function CourseCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create course"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Course', href: paths.admin.course.list },
          { name: 'New course' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <CourseNewEditForm />
    </DashboardContent>
  );
}

