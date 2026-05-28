import { useMemo, useRef, useState } from 'react';

import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import {
  AI_MATURITY_QUESTIONNAIRE,
  MATURITY_LEVELS,
  buildInitialScoreMap,
  computeMaturitySummary,
  countQuestionnaireDimensions,
} from 'src/assets/data/ai-maturity-questionnaire';

function maturityChipColor(level) {
  switch (level) {
    case 'Initial':
      return 'error';
    case 'Engaged':
      return 'warning';
    case 'Defined':
      return 'info';
    case 'Managed':
      return 'primary';
    case 'Optimized':
      return 'success';
    default:
      return 'default';
  }
}

function pillarProgressColor(average, theme) {
  if (average >= 4.25) return theme.palette.success.main;
  if (average >= 3.25) return theme.palette.primary.main;
  if (average >= 2.25) return theme.palette.info.main;
  if (average >= 1.5) return theme.palette.warning.main;
  return theme.palette.error.main;
}

export default function AiMaturityAssessmentPanel() {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const [segment, setSegment] = useState('assessment');
  const [scores, setScores] = useState(buildInitialScoreMap);
  const [currentPillarIndex, setCurrentPillarIndex] = useState(0);
  const segmentTabsRef = useRef(null);

  const summary = useMemo(() => computeMaturitySummary(scores), [scores]);

  const handleScoreChange = (questionId, value) => {
    setScores((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleReset = () => {
    setScores(buildInitialScoreMap());
  };

  const overallPct = (summary.overallAverage / 5) * 100;

  const dimCount = countQuestionnaireDimensions();
  const dimensionRows = summary.pillarSummaries
    .flatMap((pillar) =>
      pillar.dimensions.map((dimension) => ({
        ...dimension,
        pillarTitle: pillar.title,
      }))
    )
    .sort((a, b) => b.average - a.average);
  const currentPillar = AI_MATURITY_QUESTIONNAIRE[currentPillarIndex];
  const currentPillarSummary = summary.pillarSummaries.find((p) => p.id === currentPillar.id);
  const currentPillarItemCount = currentPillar.dimensions.reduce((n, d) => n + d.questions.length, 0);
  const currentPillarChipLabel =
    currentPillarSummary?.levelInfo && currentPillarSummary?.average != null
      ? isSmUp
        ? `${currentPillarSummary.levelInfo.label} · ${currentPillarSummary.average}`
        : `L${currentPillarSummary.levelInfo.level} · ${currentPillarSummary.average}`
      : currentPillarSummary?.average ?? '—';
  const scrollToQuestionnaireTop = () => {
    segmentTabsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <Stack spacing={{ xs: 2.5, md: 3 }}>
      {/* Intro hero */}
      <Card
        elevation={0}
        sx={{
          overflow: 'hidden',
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.06)} inset`,
          background: `linear-gradient(
            125deg,
            ${alpha(theme.palette.primary.main, 0.07)} 0%,
            ${alpha(theme.palette.background.paper, 1)} 38%,
            ${alpha(theme.palette.primary.dark, 0.04)} 100%
          )`,
        }}
      >
        <Grid container>
          <Grid item xs={12} md={7} sx={{ p: { xs: 3, sm: 3.5, md: 4 } }}>
            <Stack spacing={2.5}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.14),
                    color: 'primary.main',
                  }}
                >
                  <Iconify icon="solar:clipboard-list-bold" width={30} />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.4, lineHeight: 1.2, display: 'block' }}
                  >
                    Readiness assessment
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.03, lineHeight: 1.15 }}>
                    AI readiness
                  </Typography>
                </Box>
              </Stack>

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  fontSize: { xs: '1rem', md: '1.0625rem' },
                  lineHeight: 1.75,
                  maxWidth: 560,
                }}
              >
                Work through six pillars and {dimCount} dimensions. Each item uses a 1–5 scale (half-points allowed);
                rolled-up averages map to the five standard maturity levels. Scroll down to expand pillars and move the
                sliders—your scores and charts update instantly.
              </Typography>

              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                <Chip
                  size="medium"
                  variant="soft"
                  color="primary"
                  icon={<Iconify icon="solar:layers-bold" width={18} />}
                  label={`${AI_MATURITY_QUESTIONNAIRE.length} pillars`}
                />
                <Chip
                  size="medium"
                  variant="soft"
                  color="primary"
                  icon={<Iconify icon="solar:widget-5-bold" width={18} />}
                  label={`${dimCount} dimensions`}
                />
                <Chip
                  size="medium"
                  variant="soft"
                  color="default"
                  icon={<Iconify icon="solar:graph-up-bold" width={18} />}
                  label="Live rollup scores"
                />
              </Stack>

              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', lineHeight: 1.6 }}>
                Default wording is generic; swap in your licensed questionnaire copy when ready.
              </Typography>
            </Stack>
          </Grid>

          <Grid
            item
            xs={12}
            md={5}
            sx={{
              borderTop: { xs: `1px dashed ${alpha(theme.palette.divider, 0.9)}`, md: 'none' },
              borderLeft: { md: `1px solid ${alpha(theme.palette.divider, 0.14)}` },
              bgcolor: { md: alpha(theme.palette.grey[500], 0.04) },
              p: { xs: 3, sm: 3.5, md: 4 },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, letterSpacing: 0.2 }}>
              Maturity level reference
            </Typography>
            <Stack spacing={1.25}>
              {MATURITY_LEVELS.map((row) => (
                <Paper
                  key={row.level}
                  variant="outlined"
                  sx={{
                    px: 1.75,
                    py: 1.25,
                    borderRadius: 1.5,
                    borderColor: alpha(theme.palette.divider, 0.55),
                    bgcolor: alpha(theme.palette.background.paper, 0.65),
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
                      {row.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontWeight: 600 }}>
                      {row.bandMin}–{row.bandMax}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Card>

      <Paper
        ref={segmentTabsRef}
        elevation={0}
        sx={{
          p: 0.75,
          borderRadius: 100,
          border: `1px solid ${alpha(theme.palette.divider, 0.14)}`,
          bgcolor: alpha(theme.palette.grey[500], 0.06),
          maxWidth: { sm: 420 },
        }}
      >
        <Tabs
          value={segment}
          onChange={(_, value) => setSegment(value)}
          variant="fullWidth"
          TabIndicatorProps={{ sx: { display: 'none' } }}
          sx={{
            minHeight: 46,
            '& .MuiTabs-flexContainer': { gap: 0.75 },
            '& .MuiTab-root': {
              minHeight: 46,
              py: 1,
              px: 1.5,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.9375rem',
              borderRadius: 100,
              color: 'text.secondary',
              transition: theme.transitions.create(['background-color', 'color', 'box-shadow'], {
                duration: theme.transitions.duration.shorter,
              }),
            },
            '& .Mui-selected': {
              color: `${theme.palette.primary.contrastText} !important`,
              bgcolor: 'primary.main',
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
            },
          }}
        >
          <Tab
            value="assessment"
            label="Assessment"
            icon={<Iconify icon="solar:clipboard-check-bold-duotone" width={18} />}
            iconPosition="start"
            sx={{ gap: 0.75 }}
          />
          <Tab
            value="insights"
            label="Insights"
            icon={<Iconify icon="solar:chart-2-bold-duotone" width={18} />}
            iconPosition="start"
            sx={{ gap: 0.75 }}
          />
        </Tabs>
      </Paper>

      {/* Score dashboard */}
      {segment === 'insights' && (
      <Grid container spacing={{ xs: 2, md: 2.5 }}>
        <Grid item xs={12} md={5}>
          <Card
            sx={{
              height: '100%',
              p: { xs: 2.5, md: 3 },
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.08)}`,
              background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.background.paper, 1)} 45%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`,
            }}
          >
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.2, fontWeight: 700 }}>
              Overall maturity
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mt: 1, mb: 1.5 }}>
              <Typography
                component="span"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2.75rem', md: '3.25rem' },
                  lineHeight: 1,
                  letterSpacing: -0.03,
                  color: 'text.primary',
                }}
              >
                {summary.overallAverage}
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 600 }}>
                / 5
              </Typography>
            </Stack>
            <Chip
              color={maturityChipColor(summary.overallLevelInfo.name)}
              label={summary.overallLevelInfo.label}
              sx={{
                fontWeight: 700,
                mb: 2,
                height: 'auto',
                py: 1,
                '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.35 },
              }}
            />
            <Box sx={{ mb: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="caption" color="text.secondary">
                  Maturity scale
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {overallPct.toFixed(0)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={overallPct}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  },
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
              Average-score maturity levels
            </Typography>
            <Stack spacing={0.75} sx={{ mb: 2 }}>
              {MATURITY_LEVELS.map((row) => (
                <Typography key={row.level} variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {row.label}
                  </Box>{' '}
                  (average {row.bandMin}–{row.bandMax})
                </Typography>
              ))}
            </Stack>
            <Button
              variant="outlined"
              color="inherit"
              size="medium"
              onClick={handleReset}
              startIcon={<Iconify icon="solar:restart-bold" width={20} />}
              sx={{
                borderColor: alpha(theme.palette.text.primary, 0.2),
                '&:hover': { borderColor: alpha(theme.palette.text.primary, 0.35) },
              }}
            >
              Reset all responses
            </Button>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card
            sx={{
              height: '100%',
              p: { xs: 2.5, md: 3 },
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              boxShadow: theme.shadows[1],
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Pillar scores
              </Typography>
              <Stack direction="row" spacing={0.75}>
                <Chip size="small" variant="soft" color="default" label={`${AI_MATURITY_QUESTIONNAIRE.length} pillars`} />
                <Chip size="small" variant="soft" color="default" label={`${countQuestionnaireDimensions()} dimensions`} />
              </Stack>
            </Stack>
            <Stack spacing={2}>
              {summary.pillarSummaries.map((pillar, index) => (
                <Box key={pillar.id}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.75 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: 'text.disabled',
                        minWidth: 22,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0, fontWeight: 600 }} noWrap title={pillar.title}>
                      {pillar.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        color: pillarProgressColor(pillar.average, theme),
                      }}
                    >
                      {pillar.average}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(pillar.average / 5) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: alpha(theme.palette.grey[500], 0.12),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: pillarProgressColor(pillar.average, theme),
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Card>
        </Grid>
      </Grid>
      )}

      {/* Questionnaire */}
      {segment === 'assessment' && (
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>
          Questionnaire
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', maxWidth: 720 }}>
          Complete one pillar at a time. Use Next/Previous to move through pages.
        </Typography>

        <Card
          sx={{
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.95)}`,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.04)}`,
          }}
        >
          <Box sx={{ px: { xs: 1.75, sm: 2.25 }, py: { xs: 1.5, sm: 1.75 }, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}` }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1.25}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    flexShrink: 0,
                  }}
                >
                  {currentPillarIndex + 1}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
                    {currentPillar.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pillar {currentPillarIndex + 1} of {AI_MATURITY_QUESTIONNAIRE.length} · {currentPillar.dimensions.length} dimensions ·{' '}
                    {currentPillarItemCount} items
                  </Typography>
                </Box>
              </Stack>
              <Chip
                size="small"
                label={currentPillarChipLabel}
                color={currentPillarSummary?.levelInfo ? maturityChipColor(currentPillarSummary.levelInfo.name) : 'default'}
                sx={{ fontWeight: 700 }}
              />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 62 }}>
                Progress
              </Typography>
              <LinearProgress
                variant="determinate"
                value={((currentPillarIndex + 1) / AI_MATURITY_QUESTIONNAIRE.length) * 100}
                sx={{ flex: 1, height: 7, borderRadius: 999 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 42, textAlign: 'right' }}>
                {currentPillarIndex + 1}/{AI_MATURITY_QUESTIONNAIRE.length}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 1.75, sm: 2.25 }, pb: 2.25, pt: 1.75, bgcolor: alpha(theme.palette.grey[500], 0.04) }}>
            <Stack spacing={2} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
              {currentPillar.dimensions.map((dimension) => (
                <Box key={dimension.id}>
                  <Typography
                    variant="overline"
                    sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 0.8, display: 'block', mb: 1.25 }}
                  >
                    {dimension.title}
                  </Typography>
                  <Stack spacing={0.85}>
                    {dimension.questions.map((question, qIndex) => (
                      <Paper
                        key={question.id}
                        variant="outlined"
                        sx={{
                          p: { xs: 1, sm: 1.1 },
                          borderRadius: 1.25,
                          borderColor: alpha(theme.palette.divider, 0.8),
                          bgcolor: alpha(theme.palette.background.paper, 0.96),
                          boxShadow: `0 1px 0 ${alpha(theme.palette.common.black, 0.03)}`,
                        }}
                      >
                        <Stack direction="row" alignItems="flex-start" spacing={1.1}>
                          <Box
                            sx={{
                              mt: 0.1,
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: 'primary.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontVariantNumeric: 'tabular-nums',
                              flexShrink: 0,
                            }}
                          >
                            {String(qIndex + 1).padStart(2, '0')}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.4, mb: 0.3, pr: 1.25 }}>
                                {question.text}
                              </Typography>
                              <Chip
                                size="small"
                                color="info"
                                variant="soft"
                                label={`${(scores[question.id] ?? 3).toFixed(1)}/5`}
                                sx={{
                                  fontWeight: 800,
                                  fontVariantNumeric: 'tabular-nums',
                                  height: 20,
                                  mt: 0.15,
                                  flexShrink: 0,
                                }}
                              />
                            </Stack>
                            <Slider
                              value={scores[question.id] ?? 3}
                              onChange={(_, value) => handleScoreChange(question.id, value)}
                              min={1}
                              max={5}
                              step={0.5}
                              valueLabelDisplay="auto"
                              color="info"
                              aria-label={question.text}
                              sx={{
                                py: 0,
                                '& .MuiSlider-thumb': {
                                  width: 12,
                                  height: 12,
                                  border: `2px solid ${theme.palette.background.paper}`,
                                  boxShadow: `0 2px 8px ${alpha(theme.palette.info.main, 0.28)}`,
                                },
                                '& .MuiSlider-track': {
                                  border: 'none',
                                  height: 3,
                                  borderRadius: 999,
                                },
                                '& .MuiSlider-rail': {
                                  height: 3,
                                  borderRadius: 999,
                                  opacity: 1,
                                  bgcolor: alpha(theme.palette.grey[500], 0.28),
                                },
                                '& .MuiSlider-mark': {
                                  width: 5,
                                  height: 5,
                                  borderRadius: '50%',
                                  bgcolor: alpha(theme.palette.grey[700], 0.3),
                                  transform: 'translate(-50%, -50%)',
                                },
                                '& .MuiSlider-markActive': {
                                  bgcolor: theme.palette.info.main,
                                },
                                '& .MuiSlider-valueLabel': {
                                  bgcolor: theme.palette.info.main,
                                  fontWeight: 700,
                                },
                              }}
                            />
                          </Box>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={{ xs: 1.1, sm: 1.5 }}
            sx={{
              px: { xs: 1.75, sm: 2.25 },
              py: { xs: 1.15, sm: 1 },
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              bgcolor: 'background.paper',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 0.9, sm: 1 }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ width: { xs: 1, sm: 'auto' } }}
            >
              <Button
                variant="outlined"
                size="small"
                fullWidth={!isSmUp}
                onClick={() => {
                  setCurrentPillarIndex((idx) => Math.max(idx - 1, 0));
                  scrollToQuestionnaireTop();
                }}
                disabled={currentPillarIndex === 0}
                startIcon={<Iconify icon="eva:arrow-back-fill" width={16} />}
                sx={{ minWidth: { sm: 112 } }}
              >
                Previous
              </Button>
              <Button
                variant="contained"
                size="small"
                fullWidth={!isSmUp}
                onClick={() => {
                  setCurrentPillarIndex((idx) => Math.min(idx + 1, AI_MATURITY_QUESTIONNAIRE.length - 1));
                  scrollToQuestionnaireTop();
                }}
                disabled={currentPillarIndex === AI_MATURITY_QUESTIONNAIRE.length - 1}
                endIcon={<Iconify icon="eva:arrow-forward-fill" width={16} />}
                sx={{ minWidth: { sm: 100 } }}
              >
                Next
              </Button>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent={{ xs: 'space-between', sm: 'flex-end' }}
              sx={{ width: { xs: 1, sm: 'auto' } }}
            >
              <Chip
                size="small"
                variant="soft"
                color="default"
                label={`Step ${currentPillarIndex + 1}/${AI_MATURITY_QUESTIONNAIRE.length}`}
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                Progress auto-calculates live
              </Typography>
            </Stack>
          </Stack>
        </Card>
      </Box>
      )}

      {/* Dimension breakdown */}
      {segment === 'insights' && (
      <Card
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Dimension breakdown
          </Typography>
          <Chip size="small" variant="soft" color="default" label={`${dimCount} dimensions`} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Executive view of all dimensions ranked by score, with maturity level and pillar context.
        </Typography>

        <Box
          sx={{
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            borderRadius: 1.75,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: 1.25,
              bgcolor: alpha(theme.palette.grey[500], 0.08),
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            }}
          >
            <Grid container alignItems="center" spacing={1}>
              <Grid item xs={7} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                  Dimension
                </Typography>
              </Grid>
              <Grid item xs={5} md={2}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                  Pillar
                </Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                  Level
                </Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                  Score
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Box
            sx={{
              maxHeight: { xs: 360, md: 460 },
              overflowY: 'auto',
            }}
          >
            <Stack divider={<Divider flexItem />}>
              {dimensionRows.map((row, index) => (
                <Box key={row.id} sx={{ px: { xs: 1.5, sm: 2 }, py: 1.15 }}>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item xs={12} md={6}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Typography
                          variant="caption"
                          sx={{
                            minWidth: 26,
                            fontWeight: 800,
                            color: 'text.disabled',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          #{index + 1}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
                          {row.title}
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {row.pillarTitle}
                      </Typography>
                    </Grid>
                    <Grid item xs={7} sm={3} md={2}>
                      <Chip
                        size="small"
                        color={maturityChipColor(row.levelInfo?.name)}
                        label={row.levelInfo?.label}
                        sx={{
                          height: 'auto',
                          '& .MuiChip-label': { py: 0.4, lineHeight: 1.2, whiteSpace: 'normal' },
                        }}
                      />
                    </Grid>
                    <Grid item xs={5} sm={3} md={2}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            {row.average.toFixed(1)}/5
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {Math.round((row.average / 5) * 100)}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={(row.average / 5) * 100}
                          sx={{
                            height: 6,
                            borderRadius: 4,
                            bgcolor: alpha(theme.palette.grey[500], 0.16),
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              bgcolor: pillarProgressColor(row.average, theme),
                            },
                          }}
                        />
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Card>
      )}
    </Stack>
  );
}
