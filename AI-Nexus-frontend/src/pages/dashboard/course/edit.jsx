import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { LoadingScreen } from 'src/components/loading-screen';

import { useGetCourse } from 'src/actions/course';
import { CourseEditView } from 'src/sections/dashboard/course/view';

// ----------------------------------------------------------------------

const metadata = { title: `Course edit | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const { course, courseLoading } = useGetCourse(params.id);

  if (courseLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <CourseEditView course={course} />
    </>
  );
}

