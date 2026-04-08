import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { WorkflowBuilderView } from 'src/sections/dashboard/workflow/view';

// ----------------------------------------------------------------------

const metadata = { title: `Workflow Builder | ${CONFIG.site.name}` };

export default function WorkflowsBuilderPage() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <WorkflowBuilderView />
    </>
  );
}

