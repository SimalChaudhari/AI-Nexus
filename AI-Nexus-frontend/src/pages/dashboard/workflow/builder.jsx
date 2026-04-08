import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { WorkflowBuilderView } from 'src/sections/dashboard/workflow/view';

// ----------------------------------------------------------------------

const metadata = { title: `Advanced workflow builder | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <WorkflowBuilderView />
    </>
  );
}

