import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { CONFIG } from 'src/config-global';
import { workflowService } from 'src/services/workflow.service';

import { WorkflowEditView } from 'src/sections/dashboard/workflow/view';
import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

const metadata = { title: `Edit AI resource | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const { workflows, loading } = useSelector((state) => state.workflows);
  const currentWorkflow = workflows.find((workflow) => workflow.id === params.id);

  useEffect(() => {
    if (!currentWorkflow && params.id) {
      workflowService.getWorkflowById(params.id).then(() => {
        // This will be handled by Redux if needed
      });
    }
  }, [currentWorkflow, params.id]);

  if (loading || !currentWorkflow) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <WorkflowEditView workflow={currentWorkflow} />
    </>
  );
}

