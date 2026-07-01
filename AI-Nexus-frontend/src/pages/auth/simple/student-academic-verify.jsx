import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { StudentAcademicVerifyView } from 'src/sections/auth/simple/student-academic-verify-view';

const metadata = { title: `Student verification | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <StudentAcademicVerifyView />
    </>
  );
}
