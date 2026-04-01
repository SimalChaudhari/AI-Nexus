import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { WorkflowListView } from 'src/sections/dashboard/workflow/view';

// ----------------------------------------------------------------------

const metadata = { title: `AI resources | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <WorkflowListView />
    </>
  );
}

