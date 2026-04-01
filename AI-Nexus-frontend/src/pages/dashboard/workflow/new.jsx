import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { WorkflowCreateView } from 'src/sections/dashboard/workflow/view';

// ----------------------------------------------------------------------

const metadata = { title: `Create AI resource | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <WorkflowCreateView />
    </>
  );
}

