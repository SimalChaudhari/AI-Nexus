import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { CourseCertificatesView } from 'src/sections/dashboard/course/view/course-certificates-view';

const metadata = { title: `Course certificates | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CourseCertificatesView />
    </>
  );
}
