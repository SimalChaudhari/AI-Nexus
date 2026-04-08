import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, { Background, Controls, Handle, MiniMap, Position } from 'reactflow';
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

const nodeStyleMap = {
  trigger: { borderColor: '#1976d2', chipColor: 'primary', icon: 'solar:play-circle-bold' },
  send_email: { borderColor: '#2e7d32', chipColor: 'success', icon: 'solar:letter-bold' },
  condition: { borderColor: '#ed6c02', chipColor: 'warning', icon: 'solar:checklist-minimalistic-bold' },
  delay: { borderColor: '#7b1fa2', chipColor: 'secondary', icon: 'solar:clock-circle-bold' },
  http_request: { borderColor: '#00838f', chipColor: 'info', icon: 'solar:global-bold' },
  default: { borderColor: '#546e7a', chipColor: 'default', icon: 'solar:widget-4-bold' },
};

const resolveNodeKind = (node) => {
  const kind = String(node?.data?.nodeKind || '').toLowerCase();
  if (kind) return kind;
  const triggerType = String(node?.data?.triggerType || '').toLowerCase();
  if (triggerType) return 'trigger';
  const actionType = String(node?.data?.actionType || '').toLowerCase();
  if (actionType) return actionType;
  const label = String(node?.data?.label || '').toLowerCase();
  if (label.includes('condition')) return 'condition';
  if (label.includes('email')) return 'send_email';
  if (label.includes('delay')) return 'delay';
  if (label.includes('http')) return 'http_request';
  if (label.includes('trigger')) return 'trigger';
  return 'default';
};

function PublicWorkflowNodeCard({ data, selected }) {
  const kind = String(data?.nodeKind || 'default');
  const conf = nodeStyleMap[kind] || nodeStyleMap.default;
  const isConditionNode = kind === 'condition';

  return (
    <Box
      sx={{
        minWidth: isConditionNode ? 130 : 210,
        width: isConditionNode ? 130 : 'auto',
        maxWidth: isConditionNode ? 130 : 250,
        minHeight: isConditionNode ? 130 : 90,
        border: `2px solid ${conf.borderColor}`,
        borderRadius: isConditionNode ? '50%' : 1.5,
        bgcolor: 'background.paper',
        p: isConditionNode ? 1 : 1.2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        boxShadow: selected ? '0 0 0 4px rgba(25,118,210,0.12)' : '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.8 }}>
        <Iconify icon={conf.icon} width={15} />
        <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {data?.label || 'Node'}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.4} flexWrap="wrap" justifyContent="center">
        <Chip size="small" label={kind} color={conf.chipColor} variant="soft" sx={{ height: 18 }} />
      </Stack>
      {data?.triggerType && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'text.secondary' }}>
          Trigger: {data.triggerType}
        </Typography>
      )}
      {data?.actionType && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.2, color: 'text.secondary' }}>
          Action: {data.actionType}
        </Typography>
      )}
      <Handle type="source" position={Position.Right} />
    </Box>
  );
}

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
  const styledFlowNodes = flowNodes.map((node, idx) => {
    const nodeKind = resolveNodeKind(node);
    const nodeTypeByKind = {
      trigger: 'triggerNode',
      send_email: 'emailNode',
      condition: 'conditionNode',
      delay: 'delayNode',
      http_request: 'httpNode',
      default: 'genericNode',
    };
    return {
      ...node,
      id: String(node.id ?? idx + 1),
      type: nodeTypeByKind[nodeKind] || 'genericNode',
      data: {
        ...(node.data || {}),
        nodeKind,
      },
    };
  });
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
                      <ReactFlow
                        nodes={styledFlowNodes}
                        edges={flowEdges}
                        fitView
                        nodeTypes={{
                          triggerNode: PublicWorkflowNodeCard,
                          emailNode: PublicWorkflowNodeCard,
                          conditionNode: PublicWorkflowNodeCard,
                          delayNode: PublicWorkflowNodeCard,
                          httpNode: PublicWorkflowNodeCard,
                          genericNode: PublicWorkflowNodeCard,
                        }}
                        nodesDraggable={false}
                        nodesConnectable={false}
                      >
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
