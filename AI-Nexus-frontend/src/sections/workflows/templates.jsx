import { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { resolveFlowisePublicBaseUrl } from 'src/utils/flowise-public-url';
import { WorkflowFlowiseCardIframe } from 'src/components/workflow-flowise-card-iframe/workflow-flowise-card-iframe';
import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import {
  shouldRenderWorkflowMiniPreview,
  WorkflowFlowMiniPreview,
} from 'src/components/workflow-flow-mini-preview/workflow-flow-mini-preview';
import { GradientButton } from 'src/components/custom-button';
import { STORAGE_KEY } from 'src/auth/context/jwt/constant';
import { getCookie } from 'src/utils/cookie';
import { fetchWorkflows } from 'src/store/slices/workflowSlice';
import { flowiseTemplateService } from 'src/services/flowise-template.service';

// ----------------------------------------------------------------------

const toPlainDescription = (value) => {
  if (!value) return '';
  const raw = String(value);
  const decoded = raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');

  return decoded
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ----------------------------------------------------------------------

export function Templates() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { workflows } = useSelector((state) => state.workflows);
  const [flowiseTemplates, setFlowiseTemplates] = useState([]);
  const [flowiseTemplatesLoading, setFlowiseTemplatesLoading] = useState(true);
  const flowiseUrl = resolveFlowisePublicBaseUrl() || 'http://localhost:3000';
  const flowiseEntryUrl = `${flowiseUrl.replace(/\/$/, '')}/api/v1/auth/external-login`;
  const fallbackTemplate = {
    id: 'default-fallback-template',
    title: 'No Templates Found',
    description: 'Template data was not found. Create a new workflow to get started.',
    source: 'fallback',
    label: { title: 'Not Found' },
    tags: ['Getting Started'],
    isFallback: true,
  };

  useEffect(() => {
    dispatch(fetchWorkflows());
  }, [dispatch]);

  useEffect(() => {
    let mounted = true;
    setFlowiseTemplatesLoading(true);
    (async () => {
      try {
        const items = await flowiseTemplateService.getFlowiseTemplates();
        if (mounted) {
          // Show Flowise-origin templates: community + my templates + workspace flows.
          // Keep agent-style categories so UI stays aligned with original Flowise agent section.
          setFlowiseTemplates(
            items.filter((item) => ['AGENTFLOW', 'MULTIAGENT', 'AGENTFLOWV2'].includes(String(item?.flowiseType || '').toUpperCase()))
          );
        }
      } catch (error) {
        if (mounted) {
          setFlowiseTemplates([]);
        }
      } finally {
        if (mounted) {
          setFlowiseTemplatesLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenTemplate = useCallback(
    (template) => {
      if (template?.id) {
        router.push(paths.workflowsDetails(template.id));
      }
    },
    [router]
  );

  const handleCreateWorkflow = useCallback(
    (event) => {
      event?.preventDefault?.();
      const accessToken = sessionStorage.getItem(STORAGE_KEY) || getCookie('access-token');
      if (!accessToken) {
        window.open(flowiseUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      const redirectUrl = `${flowiseEntryUrl}?token=${encodeURIComponent(accessToken)}`;
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
    },
    [flowiseEntryUrl, flowiseUrl]
  );

  const templates = [...(workflows || []), ...(flowiseTemplates || [])].sort((a, b) => {
    const aPreviewRank = a?.isPreviewOnly ? 1 : 0;
    const bPreviewRank = b?.isPreviewOnly ? 1 : 0;
    return aPreviewRank - bPreviewRank;
  });
  const hasWorkflowTemplates = (workflows || []).length > 0;
  const showFlowiseServerWait = flowiseTemplatesLoading && !hasWorkflowTemplates;
  const templatesToRender =
    templates.length > 0 ? templates : showFlowiseServerWait ? [] : [fallbackTemplate];

  return (
    <Box>
      {/* Why use AI resources */}
      <Card
        sx={{
          background: 'linear-gradient(to right, #eff6ff, #faf5ff)',
          borderRadius: { xs: 2, md: 3 },
          p: { xs: 4, md: 6 },
          mb: { xs: 4, md: 6 },
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            fontWeight: 'bold',
            mb: { xs: 3, md: 4 },
            textAlign: 'center',
            color: 'text.primary',
          }}
        >
          Why use AI resources?
        </Typography>
        <Grid container spacing={{ xs: 3, md: 4 }}>
          <Grid xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: { xs: 48, md: 64 },
                  height: { xs: 48, md: 64 },
                  bgcolor: '#dbeafe',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: { xs: 2, md: 3 },
                }}
              >
                <Iconify
                  icon="solar:clock-circle-bold-duotone"
                  width={{ xs: 20, md: 24 }}
                  sx={{ color: '#2563eb' }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  fontWeight: 600,
                  mb: 1.5,
                  color: 'text.primary',
                }}
              >
                Save 80% Time
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  color: 'text.secondary',
                }}
              >
                Automate repetitive tasks and focus on what matters most - building meaningful
                connections.
              </Typography>
            </Box>
          </Grid>
          <Grid xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: { xs: 48, md: 64 },
                  height: { xs: 48, md: 64 },
                  bgcolor: '#dcfce7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: { xs: 2, md: 3 },
                }}
              >
                <Iconify
                  icon="solar:users-group-rounded-bold-duotone"
                  width={{ xs: 20, md: 24 }}
                  sx={{ color: '#16a34a' }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  fontWeight: 600,
                  mb: 1.5,
                  color: 'text.primary',
                }}
              >
                Better Engagement
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  color: 'text.secondary',
                }}
              >
                Deliver personalized experiences that keep members active and engaged in your
                community.
              </Typography>
            </Box>
          </Grid>
          <Grid xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: { xs: 48, md: 64 },
                  height: { xs: 48, md: 64 },
                  bgcolor: '#f3e8ff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: { xs: 2, md: 3 },
                }}
              >
                <Iconify
                  icon="solar:chart-2-bold-duotone"
                  width={{ xs: 20, md: 24 }}
                  sx={{ color: '#9333ea' }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  fontWeight: 600,
                  mb: 1.5,
                  color: 'text.primary',
                }}
              >
                Scale Effortlessly
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  color: 'text.secondary',
                }}
              >
                Handle thousands of members with the same personal touch as your first ten members.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* AI resource templates grid */}
      <Box sx={{ mb: { xs: 6, md: 8 } }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          sx={{ mb: { xs: 3, md: 4 }, gap: 2, flexWrap: 'wrap' }}
        >
          <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 'bold',
              }}
            >
              AI resource templates
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.75, maxWidth: 720 }}>
              Flowise templates load a live mini-canvas (iframe) when the card scrolls into view; others use images or a
              sketch. Open a template for the full editor.
            </Typography>
          </Box>
          <Button
            variant="contained"
            component="a"
            href={flowiseUrl}
            startIcon={<Iconify icon="solar:add-circle-bold-duotone" />}
            onClick={handleCreateWorkflow}
            size="large"
            sx={{
              whiteSpace: 'nowrap',
              width: 'auto',
              minWidth: { sm: 180 },
              flex: '0 0 auto',
              ml: 'auto',
              alignSelf: { xs: 'stretch', sm: 'center' },
              borderRadius: 2,
              px: { xs: 2, sm: 2.5 },
              py: 1.1,
              textTransform: 'none',
              fontWeight: 700,
              boxShadow: (theme) => theme.customShadows?.z8 || theme.shadows[8],
            }}
          >
            Create Workflow
          </Button>
        </Stack>
        {showFlowiseServerWait ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              py: { xs: 8, md: 10 },
              px: 2,
              minHeight: 240,
              borderRadius: 2,
              bgcolor: 'background.neutral',
            }}
          >
            <CircularProgress size={36} thickness={4} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Loading templates from Flowise…
            </Typography>
          </Box>
        ) : (
        <Grid container spacing={{ xs: 3, md: 4 }}>
          {templatesToRender.map((template) => {
            const flowiseBase = resolveFlowisePublicBaseUrl();
            const useFlowiseIframe =
              Boolean(flowiseBase) &&
              template.source === 'flowise' &&
              (template.flowData?.nodes?.length || 0) > 0;
            const showMiniDiagram =
              !useFlowiseIframe && shouldRenderWorkflowMiniPreview(template.image, template.flowData);
            const flowNodes = template.flowData?.nodes;
            const flowEdges = template.flowData?.edges;

            return (
            <Grid key={template.id} xs={12} sm={6} lg={4}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  overflow: 'hidden',
                  transition: 'all 0.3s',
                  '&:hover': {
                    boxShadow: (theme) => theme.customShadows.z16,
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: { xs: '16 / 10', sm: '16 / 9' },
                    minHeight: { xs: 180, sm: 200 },
                    maxHeight: { xs: 230, md: 260 },
                  }}
                >
                  {useFlowiseIframe ? (
                    <WorkflowFlowiseCardIframe flowData={template.flowData} title={template.title} />
                  ) : showMiniDiagram ? (
                    <WorkflowFlowMiniPreview nodes={flowNodes} edges={flowEdges} />
                  ) : template.image ? (
                    <Image
                      alt={template.title}
                      src={template.image}
                      visibleByDefault
                      disabledEffect
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        bgcolor: /\.svg(\?|#|$)/i.test(template.image) ? 'grey.100' : 'transparent',
                        '& img': {
                          width: '100%',
                          height: '100%',
                          objectFit: /\.svg(\?|#|$)/i.test(template.image) ? 'contain' : 'cover',
                          objectPosition: 'center',
                          display: 'block',
                          padding: /\.svg(\?|#|$)/i.test(template.image) ? 2 : 0,
                        },
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'grey.200',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify
                        icon="solar:workflow-bold-duotone"
                        width={{ xs: 52, md: 64 }}
                        sx={{ color: 'grey.400' }}
                      />
                    </Box>
                  )}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 1,
                      background:
                        template.image || showMiniDiagram || useFlowiseIframe
                          ? 'linear-gradient(to top, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.03) 45%, rgba(0,0,0,0) 70%)'
                          : 'linear-gradient(to top, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.04) 45%, rgba(0,0,0,0) 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
                    <Chip
                      label={template.source === 'flowise' ? template.label?.title || 'Flowise Template' : template.label?.title || template.label?.name || 'Uncategorized'}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.62)',
                        color: 'common.white',
                        backdropFilter: 'blur(2px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    />
                  </Box>
                </Box>
                <Box
                  sx={{
                    p: { xs: 2, md: 3 },
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 1.5,
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {template.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flexGrow: 1,
                    }}
                  >
                    {toPlainDescription(template.description) || 'No description available'}
                  </Typography>
                  {template.createdBy && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1 }}>
                      Created by: {template.createdBy}
                    </Typography>
                  )}
                  {template.tags && template.tags.length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                      {template.tags.slice(0, 3).map((tag, index) => (
                        <Chip
                          key={index}
                          label={typeof tag === 'string' ? tag : tag.title}
                          size="small"
                          sx={{
                            bgcolor: 'grey.100',
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                          }}
                        />
                      ))}
                    </Stack>
                  )}
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ mb: 2, fontSize: '0.875rem', color: 'text.secondary' }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Iconify icon="solar:play-bold-duotone" width={16} />
                      <Typography variant="caption">{template.tags?.length || 0} tags</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Iconify icon="solar:settings-bold-duotone" width={16} />
                      <Typography variant="caption">Configured</Typography>
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <GradientButton
                      size="small"
                      onClick={template.isFallback ? handleCreateWorkflow : () => handleOpenTemplate(template)}
                      sx={{ flex: 1 }}
                    >
                      {template.isFallback
                        ? 'Create Workflow'
                        : template.source === 'flowise' && template.isPreviewOnly
                          ? 'Preview Template'
                          : template.source === 'flowise'
                            ? 'Open in Flowise'
                            : 'View Template'}
                    </GradientButton>
                  </Stack>
                </Box>
              </Card>
            </Grid>
            );
          })}
        </Grid>
        )}
      </Box>
    </Box>
  );
}
