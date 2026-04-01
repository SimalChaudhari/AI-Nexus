import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';

import { WorkflowAutomation, WorkflowMainSection } from 'src/sections/workflows';

// ----------------------------------------------------------------------

const metadata = { title: `AI Resources | ${CONFIG.site.name}` };

export default function WorkflowsPage() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <DashboardContent>
      <WorkflowAutomation />
      <WorkflowMainSection />
      </DashboardContent>
    </>
  );
}

