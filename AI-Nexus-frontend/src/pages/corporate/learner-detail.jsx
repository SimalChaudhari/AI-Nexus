import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CorporateLearnerDetailView } from 'src/sections/corporate';

// ----------------------------------------------------------------------

const metadata = { title: `Learner details | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateLearnerDetailView />
    </>
  );
}
