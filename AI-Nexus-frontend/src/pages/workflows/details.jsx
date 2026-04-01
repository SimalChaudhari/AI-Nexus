import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';
import { LoadingScreen } from 'src/components/loading-screen';
import { EmptyContent } from 'src/components/empty-content';
import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { toast } from 'src/components/snackbar';
import { workflowService } from 'src/services/workflow.service';

const metadata = { title: `AI Resource Details | ${CONFIG.site.name}` };

const normalizeHtml = (value) => {
  if (!value) return '';
  const raw = String(value);
  if (typeof window === 'undefined') return raw;

  // Some records can contain encoded HTML like &lt;p&gt;...&lt;/p&gt;
  // Decode once so rich text renders properly instead of showing tags.
  const textarea = document.createElement('textarea');
  textarea.innerHTML = raw;
  return textarea.value;
};

export default function WorkflowDetailsPublicPage() {
  const { id = '' } = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await workflowService.getWorkflowById(id);
        if (mounted) setWorkflow(data);
      } catch (error) {
        if (mounted) setWorkflow(null);
        toast.error(error?.message || 'Failed to load workflow');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <LoadingScreen />;

  if (!workflow) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Workflow not found"
          action={
            <Button
              component={RouterLink}
              href={paths.workflows}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to AI resources
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  const flowNodes = workflow?.flowData?.nodes || [];
  const flowEdges = workflow?.flowData?.edges || [];
  const flowJson = JSON.stringify({ nodes: flowNodes, edges: flowEdges }, null, 2);
  const createdDate = workflow?.createdAt ? new Date(workflow.createdAt).toLocaleDateString() : '-';
  const categories = workflow?.tags?.map((tag) => tag?.title).filter(Boolean) || [];
  const normalizedDescription = normalizeHtml(workflow?.description);

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Box
        sx={{
          minHeight: '100vh',
          py: { xs: 4, md: 6 },
          bgcolor: 'background.default',
        }}
      >
        <DashboardContent>
          <Grid container spacing={{ xs: 3, md: 4 }}>
            <Grid xs={12} md={3}>
              <Stack spacing={3}>
                <Button
                  component={RouterLink}
                  href={paths.workflows}
                  color="inherit"
                  startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
                  sx={{ width: 'fit-content' }}
                >
                  Back to Templates
                </Button>

                <Typography variant="h3" sx={{ lineHeight: 1.1 }}>
                  {workflow.title || 'Workflow Template'}
                </Typography>

                <Button
                  variant="contained"
                  sx={{ width: 'fit-content', px: 3, bgcolor: '#ff5a1f', '&:hover': { bgcolor: '#e24d16' } }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(flowJson);
                      toast.success('Workflow JSON copied');
                    } catch {
                      toast.error('Failed to copy JSON');
                    }
                  }}
                >
                  Use for free
                </Button>

                <Box>
                  <Typography variant="overline" sx={{ color: 'grey.400' }}>
                    Categories
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {(categories.length ? categories : ['Workflow']).map((category) => (
                      <Chip key={category} label={category} size="small" />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Grid>

            <Grid xs={12} md={9}>
              <Stack spacing={3}>
                <Card
                  sx={{
                    p: 1,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 3,
                  }}
                >
                  <Stack direction="row" justifyContent="flex-end" sx={{ p: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Iconify icon="solar:copy-bold" />}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(flowJson);
                          toast.success('Workflow JSON copied');
                        } catch {
                          toast.error('Failed to copy JSON');
                        }
                      }}
                    >
                      Copy JSON
                    </Button>
                  </Stack>
                  {flowNodes.length ? (
                    <Box sx={{ height: { xs: 280, md: 390 }, borderRadius: 2, overflow: 'hidden', bgcolor: '#f2f2f2' }}>
                      <ReactFlow nodes={flowNodes} edges={flowEdges} fitView nodesDraggable={false} nodesConnectable={false}>
                        <MiniMap />
                        <Controls />
                        <Background gap={14} />
                      </ReactFlow>
                    </Box>
                  ) : (
                    <Box sx={{ p: 3 }}>
                      <Typography>No flow configured by admin yet.</Typography>
                    </Box>
                  )}
                </Card>

                <Card sx={{ p: { xs: 2, md: 3 }, bgcolor: 'background.paper' }}>
                  <Typography variant="h6" sx={{ mb: 1.5, color: 'text.primary' }}>
                    How it works
                  </Typography>
                  {workflow.description ? (
                    <RichTextContent
                      html={normalizedDescription}
                      sx={{
                        color: 'text.primary',
                        '& p': { my: 0.75 },
                        '& ul, & ol': { pl: 2.5, my: 1 },
                      }}
                    />
                  ) : (
                    <Typography sx={{ color: 'text.primary' }}>No description provided by template author.</Typography>
                  )}
                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 2, display: 'block' }}>
                    Created on {createdDate}
                  </Typography>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </DashboardContent>
      </Box>
    </>
  );
}
