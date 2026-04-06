import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CourseAttemptsView } from 'src/sections/dashboard/course/view';

const metadata = { title: `Course quiz attempts | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <CourseAttemptsView />
    </>
  );
}

