import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { CONFIG } from 'src/config-global';
import { workflowService } from 'src/services/workflow.service';
import { fetchWorkflows } from 'src/store/slices/workflowSlice';

import { WorkflowDetailsView } from 'src/sections/dashboard/workflow/view';
import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

const metadata = { title: `AI resource details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const dispatch = useDispatch();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dispatch(fetchWorkflows());
    if (params.id) {
      workflowService
        .getWorkflowById(params.id)
        .then((data) => {
          setWorkflow(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [dispatch, params.id]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <WorkflowDetailsView workflow={workflow} loading={loading} error={error} />
    </>
  );
}

