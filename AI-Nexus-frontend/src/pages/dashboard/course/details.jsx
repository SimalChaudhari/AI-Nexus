import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { useGetCourse } from 'src/actions/course';
import { CourseDetailsView } from 'src/sections/dashboard/course/view';

// ----------------------------------------------------------------------

const metadata = { title: `Course details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const { course, courseLoading, courseError } = useGetCourse(params.id);

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <CourseDetailsView course={course} loading={courseLoading} error={courseError} />
    </>
  );
}

