import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';

export function ProgramDetailsView({ program, loading, error }) {
  if (loading) return <LoadingScreen />;

  if (error || !program) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Program not found"
          action={
            <Button component={RouterLink} href={paths.admin.program.list} startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}>
              Back
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  const linkedCourses = program.linkedCourses || [];

  return (
    <EntityDetailsLayout
      heading="Program details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'Program', href: paths.admin.program.list },
        { name: program.title },
      ]}
      editHref={paths.admin.program.edit(program.id)}
      header={{ backgroundImage: '/assets/profilebg.jpg', avatarText: 'PG', title: program.title }}
      sections={[
        {
          title: 'Program',
          icon: 'solar:layers-bold-duotone',
          rows: [
            { label: 'Title', value: program.title },
            { label: 'Description', value: program.description?.trim() || '-' },
            { label: 'Status', value: program.status },
          ],
        },
      ]}
      footer={
        <Card sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Linked courses
          </Typography>
          {linkedCourses.length ? (
            <Stack spacing={1.5}>
              {linkedCourses.map((course) => (
                <Stack key={course.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Link component={RouterLink} href={paths.admin.course.edit(course.id)} underline="hover">
                    {course.title}
                  </Link>
                  {course.categoryTitle ? (
                    <Typography variant="body2" color="text.secondary">
                      ({course.categoryTitle})
                    </Typography>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No courses linked yet. Open a course and select this program under Course → Edit.
            </Typography>
          )}
        </Card>
      }
    />
  );
}
