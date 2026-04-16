import { Helmet } from 'react-helmet-async';
import { useEffect, useRef, useState } from 'react';
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
import CircularProgress from '@mui/material/CircularProgress';

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
import { flowiseTemplateService } from 'src/services/flowise-template.service';

const metadata = { title: `AI Resource Details | ${CONFIG.site.name}` };

const encodeFlowDataForHash = (value) => {
  try {
    return btoa(encodeURIComponent(JSON.stringify(value)));
  } catch {
    return '';
  }
};


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
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewFrameRef = useRef(null);
  const isFlowiseTemplate = id.startsWith('flowise-');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = isFlowiseTemplate
          ? await flowiseTemplateService.getFlowiseTemplateById(id)
          : await workflowService.getWorkflowById(id);
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
  }, [id, isFlowiseTemplate]);

  useEffect(() => {
    if (!workflow?.isPreviewOnly || !workflow?.flowData) return;
    const frame = previewFrameRef.current;
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage(
        {
          type: 'AINEXUS_FLOW_PREVIEW',
          flowData: workflow.flowData,
        },
        '*'
      );
    } catch {
      // no-op
    }
  }, [workflow]);

  useEffect(() => {
    setPreviewLoading(Boolean(isFlowiseTemplate));
  }, [id, isFlowiseTemplate]);

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
  const categories = workflow?.tags?.map((tag) => tag?.title).filter(Boolean) || [];
  const normalizedDescription = normalizeHtml(workflow?.description);
  const plainDescription = normalizedDescription
    ? normalizedDescription.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
  const createdByName = String(workflow?.createdBy || '').trim();
  const shouldShowCreatedBy = Boolean(createdByName) && createdByName.toLowerCase() !== 'unknown user';
  const flowiseBase = (CONFIG.flowise.publicBaseUrl || '').trim().replace(/\/$/, '');
  const openFlowiseTemplate = () => {
    if (!flowiseBase) return;
    const flowType = String(workflow?.flowiseType || '').toUpperCase();

    if (workflow?.isPreviewOnly) {
      const encodedTemplate = workflow?.flowData ? encodeFlowDataForHash(workflow.flowData) : '';
      if (!encodedTemplate) {
        toast.error('Unable to open this template directly right now.');
        return;
      }
      const editorPath = flowType === 'CHATFLOW' ? '/canvas' : '/v2/agentcanvas';
      window.open(
        `${flowiseBase}${editorPath}#templateFlowData=${encodeURIComponent(encodedTemplate)}`,
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }

    if (!workflow?.flowiseId) return;
    const editorPath = flowType === 'CHATFLOW' ? `/canvas/${workflow.flowiseId}` : `/v2/agentcanvas/${workflow.flowiseId}`;
    window.open(`${flowiseBase}${editorPath}`, '_blank', 'noopener,noreferrer');
  };
  const previewNodes = flowNodes.map((node, index) => ({
    id: String(node?.id || `node-${index}`),
    position: {
      x: Number(node?.position?.x || 0),
      y: Number(node?.position?.y || 0),
    },
    data: {
      label: node?.data?.label || node?.label || `Step ${index + 1}`,
    },
    type: 'default',
  }));
  const previewEdges = flowEdges.map((edge, index) => ({
    id: String(edge?.id || `edge-${index}`),
    source: String(edge?.source || ''),
    target: String(edge?.target || ''),
    label: edge?.label || '',
    animated: Boolean(edge?.animated),
    style: edge?.style || undefined,
  }));
  const flowisePreviewPath =
    String(workflow?.flowiseType || '').toUpperCase() === 'CHATFLOW'
      ? `/canvas/${workflow?.flowiseId || ''}`
      : `/embed/agentflow/${workflow?.flowiseId || ''}`;
  const previewOnlyPath = '/embed/marketplace-preview';
  const previewHashPayload = workflow?.isPreviewOnly && workflow?.flowData ? encodeFlowDataForHash(workflow.flowData) : '';
  const flowisePreviewUrl = flowiseBase
    ? (!workflow?.isPreviewOnly && workflow?.flowiseId
        ? `${flowiseBase}${flowisePreviewPath}`
        : workflow?.isPreviewOnly
          ? `${flowiseBase}${previewOnlyPath}${previewHashPayload ? `#flowData=${encodeURIComponent(previewHashPayload)}` : ''}`
          : '')
    : '';

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Box
        sx={{
          minHeight: '100vh',
          py: { xs: 4, md: 6 },
          background:
            'radial-gradient(circle at top right, rgba(130, 20, 40, 0.55), transparent 45%), linear-gradient(135deg, #0b0e1f 0%, #120b27 45%, #1c0f2d 100%)',
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
                  sx={{ width: 'fit-content', color: 'common.white' }}
                >
                  Back to Templates
                </Button>

                <Typography variant="h3" sx={{ lineHeight: 1.1, color: 'common.white' }}>
                  {workflow.title || 'Workflow Template'}
                </Typography>

                <Button
                  variant="contained"
                  sx={{ width: 'fit-content', px: 3, bgcolor: '#ff5a1f', '&:hover': { bgcolor: '#e24d16' } }}
                  onClick={
                    isFlowiseTemplate
                      ? openFlowiseTemplate
                      : async () => {
                          try {
                            await navigator.clipboard.writeText(flowJson);
                            toast.success('Workflow JSON copied');
                          } catch {
                            toast.error('Failed to copy JSON');
                          }
                        }
                  }
                >
                  Use for free
                </Button>

                <Box>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                    Categories
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {(categories.length ? categories : ['Workflow']).map((category) => (
                      <Chip
                        key={category}
                        label={category}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(59, 130, 246, 0.25)',
                          color: 'white',
                          border: '1px solid rgba(96, 165, 250, 0.45)',
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
               
              </Stack>
            </Grid>

            <Grid xs={12} md={9}>
              <Stack spacing={3}>
                <Card
                  sx={{
                    p: 1.25,
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
                      sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.45)' }}
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
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'rgba(255,255,255,0.9)' }}>
                        Workflow preview
                      </Typography>
                      <Box
                        sx={{
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'rgba(255,255,255,0.2)',
                          overflow: 'hidden',
                          height: { xs: 300, md: 420 },
                          bgcolor: '#d9d9dd',
                          position: 'relative',
                        }}
                      >
                        {isFlowiseTemplate && flowisePreviewUrl ? (
                          <>
                            {previewLoading && (
                              <Stack
                                spacing={1.5}
                                alignItems="center"
                                justifyContent="center"
                                sx={{
                                  position: 'absolute',
                                  inset: 0,
                                  zIndex: 2,
                                  bgcolor: 'rgba(8, 11, 22, 0.35)',
                                  backdropFilter: 'blur(1px)',
                                }}
                              >
                                <CircularProgress size={36} thickness={4} sx={{ color: 'common.white' }} />
                                <Typography variant="caption" sx={{ color: 'common.white' }}>
                                  Loading preview...
                                </Typography>
                              </Stack>
                            )}
                            <iframe
                              ref={previewFrameRef}
                              title="Flowise template preview"
                              src={flowisePreviewUrl}
                              style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                              onLoad={() => {
                                setPreviewLoading(false);
                                if (!workflow?.isPreviewOnly || !workflow?.flowData) return;
                                try {
                                  previewFrameRef.current?.contentWindow?.postMessage(
                                    {
                                      type: 'AINEXUS_FLOW_PREVIEW',
                                      flowData: workflow.flowData,
                                    },
                                    '*'
                                  );
                                } catch {
                                  // no-op
                                }
                              }}
                            />
                          </>
                        ) : (
                          <ReactFlow
                            nodes={previewNodes}
                            edges={previewEdges}
                            fitView
                            minZoom={0.2}
                            maxZoom={1.5}
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable={false}
                            zoomOnDoubleClick={false}
                            attributionPosition="bottom-left"
                          >
                            <MiniMap zoomable pannable />
                            <Controls showInteractive={false} />
                            <Background />
                          </ReactFlow>
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: 'rgba(255,255,255,0.72)' }}>
                        Steps: {flowNodes.length} | Connections: {flowEdges.length}
                      </Typography>
                      <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: 'rgba(255,255,255,0.72)' }}>
                        Description: {plainDescription || 'Currently unavailable'}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ p: 3 }}>
                      <Typography sx={{ color: 'common.white' }}>
                        {isFlowiseTemplate ? 'Preview unavailable for this Flowise template.' : 'No flow configured by admin yet.'}
                      </Typography>
                    </Box>
                  )}
                </Card>

                <Card sx={{ p: { xs: 2, md: 3 }, bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Typography variant="h6" sx={{ mb: 1.5, color: 'common.white' }}>
                    How it works
                  </Typography>
                 
                    {/* <RichTextContent
                      html={normalizedDescription}
                      sx={{
                        color: 'rgba(255,255,255,0.92)',
                        '& p': { my: 0.75 },
                        '& ul, & ol': { pl: 2.5, my: 1 },
                      }}
                    /> */}
                  
                    <Typography sx={{ color: 'rgba(255,255,255,0.92)' }}>Currently unavailable</Typography>
                 
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </DashboardContent>
      </Box>
    </>
  );
}
