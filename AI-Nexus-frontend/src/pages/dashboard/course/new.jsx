import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { CourseCreateView } from 'src/sections/dashboard/course/view';

// ----------------------------------------------------------------------

const metadata = { title: `Course create | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <CourseCreateView />
    </>
  );
}

