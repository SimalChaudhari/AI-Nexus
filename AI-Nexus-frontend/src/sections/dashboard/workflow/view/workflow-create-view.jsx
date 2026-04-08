import { paths } from 'src/routes/paths';
import { useSearchParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import Alert from '@mui/material/Alert';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { useEffect, useMemo, useState } from 'react';

import { WorkflowNewEditForm } from '../workflow-new-edit-form';

// ----------------------------------------------------------------------
const TEMPLATE_FLOW_DRAFT_KEY = 'aiNexus.workflow.templateFlowDraft';

export function WorkflowCreateView() {
  const searchParams = useSearchParams();
  const linkedFlow = searchParams.get('linkedFlow');
  const [externalFlowData, setExternalFlowData] = useState(null);

  useEffect(() => {
    // Keep new create blank by default; only hydrate when explicitly returned from builder.
    if (linkedFlow !== '1') {
      setExternalFlowData(null);
      return;
    }

    try {
      const raw = localStorage.getItem(TEMPLATE_FLOW_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.nodes) && Array.isArray(parsed?.edges)) {
        setExternalFlowData(parsed);
      }
    } catch (error) {
      console.error('Failed to read linked workflow draft:', error);
    }
  }, [linkedFlow]);

  const linkedFlowSummary = useMemo(() => {
    if (!externalFlowData) return null;
    const nodesCount = Array.isArray(externalFlowData.nodes) ? externalFlowData.nodes.length : 0;
    const edgesCount = Array.isArray(externalFlowData.edges) ? externalFlowData.edges.length : 0;
    return { nodesCount, edgesCount };
  }, [externalFlowData]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create AI resource"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Resource', href: paths.admin.workflow.list },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {linkedFlowSummary && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Linked workflow ready: {linkedFlowSummary.nodesCount} node(s), {linkedFlowSummary.edgesCount}{' '}
          connection(s). Final submit will save this flow to database.
        </Alert>
      )}

      <WorkflowNewEditForm showFlowBuilder externalFlowData={externalFlowData} />
    </DashboardContent>
  );
}

