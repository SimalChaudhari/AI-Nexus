import { useEffect, useCallback, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';

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
import axios from 'src/utils/axios';
import { fetchWorkflows } from 'src/store/slices/workflowSlice';
import { flowiseTemplateService } from 'src/services/flowise-template.service';
import { appSettingsService } from 'src/services/app-settings.service';

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

const isTemplateCreatedByUser = (createdBy) => {
  const name = String(createdBy ?? '').trim();
  return Boolean(name) && name.toLowerCase() !== 'unknown user';
};

/** Keeps long words / emails from overflowing on narrow phones */
const mobileWordWrap = {
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
};

const DEFAULT_PITCH_INTRO = {
  heading: 'Why use AI resources?',
  features: [
    {
      iconUrl: '',
      title: 'Save 80% Time',
      description:
        'Automate repetitive tasks and focus on what matters most - building meaningful connections.',
    },
    {
      iconUrl: '',
      title: 'Better Engagement',
      description:
        'Deliver personalized experiences that keep members active and engaged in your community.',
    },
    {
      iconUrl: '',
      title: 'Scale Effortlessly',
      description:
        'Handle thousands of members with the same personal touch as your first ten members.',
    },
  ],
};

const PITCH_FALLBACK_ICONS = [
  'solar:clock-circle-bold-duotone',
  'solar:users-group-rounded-bold-duotone',
  'solar:chart-2-bold-duotone',
];

// ----------------------------------------------------------------------

export function Templates() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { workflows } = useSelector((state) => state.workflows);
  const [flowiseTemplates, setFlowiseTemplates] = useState([]);
  const [flowiseTemplatesLoading, setFlowiseTemplatesLoading] = useState(true);
  const [pitchIntro, setPitchIntro] = useState(null);
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const settings = await appSettingsService.getPublic();
        if (mounted) {
          setPitchIntro(settings?.workflowTemplatesPitchContent ?? null);
        }
      } catch {
        if (mounted) setPitchIntro(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const effectivePitchIntro = useMemo(() => {
    const def = DEFAULT_PITCH_INTRO;
    const remote = pitchIntro && typeof pitchIntro === 'object' ? pitchIntro : null;
    if (!remote) return def;
    const rows = Array.isArray(remote.features) ? remote.features : [];
    return {
      heading: String(remote.heading || '').trim() || def.heading,
      features: [0, 1, 2].map((i) => {
        const row = rows[i] && typeof rows[i] === 'object' ? rows[i] : {};
        return {
          iconUrl: String(row.iconUrl || '').trim(),
          title: String(row.title || '').trim() || def.features[i].title,
          description: String(row.description || '').trim() || def.features[i].description,
        };
      }),
    };
  }, [pitchIntro]);

  const handleOpenTemplate = useCallback(
    (template) => {
      if (template?.id) {
        router.push(paths.workflowsDetails(template.id));
      }
    },
    [router]
  );

  const handleCreateWorkflow = useCallback(
    async (event) => {
      event?.preventDefault?.();
      try {
        const res = await axios.get('/auth/flowise-token', { skipApiLoading: true });
        const accessToken = res.data?.accessToken;
        if (!accessToken) {
          window.open(flowiseUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        const redirectUrl = `${flowiseEntryUrl}?token=${encodeURIComponent(accessToken)}`;
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      } catch {
        window.open(flowiseUrl, '_blank', 'noopener,noreferrer');
      }
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
          borderRadius: { xs: 2, md: 3 },
          p: { xs: 4, md: 6 },
          mb: { xs: 4, md: 6 },
          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.12)}`,
          background: (theme) =>
            `linear-gradient(125deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.1)} 0%, ${alpha(
              theme.palette.secondary.main,
              theme.palette.mode === 'dark' ? 0.18 : 0.06
            )} 48%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.04)} 100%)`,
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? `0 8px 32px ${alpha(theme.palette.common.black, 0.35)}`
              : `0 8px 32px ${alpha(theme.palette.secondary.main, 0.08)}`,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontSize: { xs: 'clamp(1.05rem, 4vw + 0.35rem, 1.25rem)', md: '1.5rem' },
            fontWeight: 'bold',
            mb: { xs: 3, md: 4 },
            textAlign: 'center',
            color: (theme) => theme.palette.secondary.main,
            lineHeight: { xs: 1.35, md: 1.3 },
            px: { xs: 0.5, sm: 0 },
            ...mobileWordWrap,
          }}
        >
          {effectivePitchIntro.heading}
        </Typography>
        <Grid container spacing={{ xs: 3, md: 4 }}>
          {effectivePitchIntro.features.map((feature, index) => {
            const circleSx =
              index === 0
                ? {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.14),
                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
                  }
                : index === 1
                  ? {
                      bgcolor: (theme) =>
                        alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.28 : 0.12),
                      border: (theme) => `1px solid ${alpha(theme.palette.secondary.main, 0.35)}`,
                    }
                  : {
                      background: (theme) =>
                        `linear-gradient(135deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.1)} 0%, ${alpha(
                          theme.palette.secondary.main,
                          theme.palette.mode === 'dark' ? 0.2 : 0.1
                        )} 100%)`,
                      border: (theme) => `1px solid ${alpha(theme.palette.secondary.main, 0.32)}`,
                    };

            return (
              <Grid key={index} xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: { xs: 48, md: 64 },
                      height: { xs: 48, md: 64 },
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: { xs: 2, md: 3 },
                      ...circleSx,
                    }}
                  >
                    {feature.iconUrl ? (
                      <Box
                        component="img"
                        src={feature.iconUrl}
                        alt=""
                        sx={{
                          width: { xs: 22, md: 28 },
                          height: { xs: 22, md: 28 },
                          objectFit: 'contain',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <Iconify
                        icon={PITCH_FALLBACK_ICONS[index]}
                        width={{ xs: 20, md: 24 }}
                        sx={{ color: index === 1 ? 'secondary.main' : 'primary.main' }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: 'clamp(0.9375rem, 2.5vw + 0.55rem, 1rem)', md: '1.125rem' },
                      fontWeight: 600,
                      mb: 1.5,
                      lineHeight: 1.35,
                      color: 'text.primary',
                      px: { xs: 0.5, sm: 0 },
                      ...mobileWordWrap,
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: { xs: 'clamp(0.8125rem, 2.8vw + 0.45rem, 0.9375rem)', md: '1rem' },
                      lineHeight: 1.55,
                      color: 'text.secondary',
                      px: { xs: 0.5, sm: 0 },
                      ...mobileWordWrap,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Card>

      {/* AI resource templates grid */}
      <Box sx={{ mb: { xs: 6, md: 8 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          justifyContent="space-between"
          sx={{ mb: { xs: 3, md: 4 }, gap: { xs: 2, sm: 2 } }}
        >
          <Box sx={{ flex: '1 1 auto', minWidth: 0, maxWidth: '100%' }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                letterSpacing: '-0.02em',
                fontSize: { xs: 'clamp(1.125rem, 5vw + 0.25rem, 1.5rem)', sm: '1.5rem' },
                lineHeight: { xs: 1.25, sm: 1.2 },
                ...mobileWordWrap,
              }}
            >
              AI resource templates
            </Typography>
            <Box
              sx={{
                mt: 1,
                mb: 0.25,
                width: 48,
                height: 3,
                borderRadius: 1,
                background: (theme) =>
                  `linear-gradient(90deg, ${theme.palette.primary.main}, ${alpha(theme.palette.secondary.main, 0.85)})`,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: 'text.secondary',
                mt: 0.75,
                maxWidth: 720,
                fontSize: { xs: 'clamp(0.6875rem, 2.4vw + 0.42rem, 0.8125rem)', sm: '0.75rem' },
                lineHeight: { xs: 1.55, sm: 1.5 },
                ...mobileWordWrap,
              }}
            >
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
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
              width: 'auto',
              minWidth: { sm: 180 },
              flex: { xs: '1 1 100%', sm: '0 0 auto' },
              ml: { xs: 0, sm: 'auto' },
              alignSelf: { xs: 'stretch', sm: 'center' },
              borderRadius: 2,
              px: { xs: 1.75, sm: 2.5 },
              py: { xs: 1, sm: 1.1 },
              textTransform: 'none',
              fontWeight: 700,
              fontSize: { xs: 'clamp(0.8125rem, 2.5vw + 0.45rem, 0.9375rem)', sm: '0.9375rem' },
              lineHeight: 1.25,
              textAlign: 'center',
              background: (theme) =>
                `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              color: (theme) => theme.palette.primary.contrastText,
              boxShadow: (theme) => theme.customShadows?.z8 || theme.shadows[8],
              '&:hover': {
                background: (theme) =>
                  `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                color: (theme) => theme.palette.primary.contrastText,
                boxShadow: (theme) => theme.customShadows?.z12 || theme.shadows[12],
              },
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
            <CircularProgress size={36} thickness={4} color="primary" />
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              sx={{
                px: { xs: 1, sm: 2 },
                fontSize: { xs: 'clamp(0.8125rem, 2.6vw + 0.45rem, 0.875rem)', sm: '0.875rem' },
                lineHeight: 1.55,
                ...mobileWordWrap,
              }}
            >
              Loading templates from Flowise…
            </Typography>
          </Box>
        ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5, lg: 2 }}>
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
            <Grid key={template.id} xs={12} sm={6} lg={3}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: (theme) => `1px solid ${alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.28 : 0.14)}`,
                  bgcolor: 'background.paper',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: (theme) => theme.customShadows.z16,
                    transform: 'translateY(-4px)',
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.45),
                  },
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: { xs: '16 / 10', sm: '16 / 9', lg: '5 / 3' },
                    minHeight: { xs: 160, sm: 176, lg: 140 },
                    maxHeight: { xs: 200, sm: 220, lg: 168 },
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
                        bgcolor: (theme) => alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.2 : 0.06),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify
                        icon="solar:workflow-bold-duotone"
                        width={{ xs: 52, md: 64 }}
                        sx={{ color: 'primary.main', opacity: 0.85 }}
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
                  <Box
                    sx={{
                      position: 'absolute',
                      top: { xs: 12, lg: 10 },
                      right: { xs: 12, lg: 10 },
                      left: { xs: 12, lg: 'auto' },
                      zIndex: 2,
                      display: 'flex',
                      justifyContent: { xs: 'flex-start', lg: 'flex-end' },
                      maxWidth: { xs: '100%', lg: 'min(85%, 280px)' },
                    }}
                  >
                    <Chip
                      label={template.source === 'flowise' ? template.label?.title || 'Flowise Template' : template.label?.title || template.label?.name || 'Uncategorized'}
                      size="small"
                      sx={(theme) => ({
                        maxWidth: '100%',
                        height: 'auto',
                        minHeight: 24,
                        bgcolor: alpha(theme.palette.secondary.dark, theme.palette.mode === 'dark' ? 0.92 : 0.88),
                        color: 'primary.contrastText',
                        fontWeight: 600,
                        backdropFilter: 'blur(6px)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                        '& .MuiChip-label': {
                          whiteSpace: { xs: 'normal', sm: 'nowrap' },
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: { xs: 2, sm: 1 },
                          lineHeight: 1.25,
                          py: 0.25,
                          fontSize: { xs: 'clamp(0.625rem, 1.8vw + 0.42rem, 0.6875rem)', sm: '0.75rem' },
                          ...mobileWordWrap,
                        },
                      })}
                    />
                  </Box>
                </Box>
                <Box
                  sx={{
                    p: { xs: 1.75, sm: 2, lg: 1.75 },
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: (theme) => `1px solid ${alpha(theme.palette.secondary.main, 0.12)}`,
                    background: (theme) =>
                      `linear-gradient(180deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.02)} 0%, transparent 72%)`,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: { xs: 1.25, lg: 1 },
                      lineHeight: 1.35,
                      fontSize: {
                        xs: 'clamp(0.9375rem, 3.2vw + 0.55rem, 1.0625rem)',
                        sm: '1.0625rem',
                        lg: '0.9375rem',
                      },
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      color: 'secondary.main',
                      ...mobileWordWrap,
                    }}
                  >
                    {template.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      mb: { xs: 1.5, lg: 1 },
                      fontSize: {
                        xs: 'clamp(0.78125rem, 2.4vw + 0.5rem, 0.875rem)',
                        sm: '0.875rem',
                        lg: '0.8125rem',
                      },
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flexGrow: 1,
                      ...mobileWordWrap,
                    }}
                  >
                    {toPlainDescription(template.description) || 'No description available'}
                  </Typography>
                  {!template.isFallback && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        mb: { xs: 1, lg: 0.75 },
                        fontSize: {
                          xs: 'clamp(0.65625rem, 2vw + 0.42rem, 0.75rem)',
                          sm: '0.75rem',
                          lg: '0.7rem',
                        },
                        lineHeight: 1.45,
                        ...mobileWordWrap,
                      }}
                    >
                      {isTemplateCreatedByUser(template.createdBy)
                        ? `Created by: ${String(template.createdBy).trim()}`
                        : 'System-generated template'}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1}>
                    <GradientButton
                      size="small"
                      onClick={template.isFallback ? handleCreateWorkflow : () => handleOpenTemplate(template)}
                      sx={{
                        flex: 1,
                        fontSize: { xs: 'clamp(0.6875rem, 2.2vw + 0.42rem, 0.8125rem)', sm: '0.875rem' },
                        px: { xs: 1.25, sm: 2 },
                        py: { xs: 0.65, sm: 1 },
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        lineHeight: { xs: 1.25, sm: 1.2 },
                        minHeight: { xs: 36, sm: 'auto' },
                      }}
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
