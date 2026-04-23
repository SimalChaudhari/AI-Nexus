import { useMemo, useState } from 'react';

import {
  Box,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import AiMaturityAssessmentPanel from 'src/sections/audit/ai-maturity-assessment-panel';

const REGULATORY_OPTIONS = ['Low', 'Medium', 'High'];
const BUDGET_OPTIONS = ['Low', 'Moderate', 'High'];
const TEAM_OPTIONS = ['Small team', 'Mid-sized team', 'Large team'];
const LITERACY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const ADOPTION_OPTIONS = ['Slow', 'Moderate', 'Fast'];
const INDUSTRY_OPTIONS = ['General', 'Financial services', 'Manufacturing', 'Retail', 'Public sector', 'SMEs'];

const LITERACY_SKILL_GAP = {
  Beginner: 85,
  Intermediate: 55,
  Advanced: 25,
};

const BUDGET_AUTOMATION_BOOST = {
  Low: -10,
  Moderate: 0,
  High: 10,
};

const ADOPTION_AUTOMATION_BOOST = {
  Slow: -12,
  Moderate: 0,
  Fast: 12,
};

const TEAM_AUTOMATION_BOOST = {
  'Small team': -6,
  'Mid-sized team': 0,
  'Large team': 6,
};

const REGULATORY_AUTOMATION_BOOST = {
  Low: 8,
  Medium: 0,
  High: -8,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const selectMenuProps = { disableScrollLock: true };

const scoreToReadinessLabel = (score) => {
  if (score < 45) return 'Low readiness';
  if (score < 75) return 'Emerging readiness';
  return 'Strong readiness';
};

function AuditFuturesExploration() {
  const theme = useTheme();
  const [scenario, setScenario] = useState('How will AI impact fraud detection in 5 years?');
  const [regulatory, setRegulatory] = useState('High');
  const [budget, setBudget] = useState('Moderate');
  const [teamSize, setTeamSize] = useState('Small team');
  const [aiLiteracy, setAiLiteracy] = useState('Beginner');
  const [adoptionSpeed, setAdoptionSpeed] = useState('Moderate');
  const [industry, setIndustry] = useState('General');
  const [timelineYears, setTimelineYears] = useState(5);

  const outputs = useMemo(() => {
    const baseAutomation = 40;
    const automationPercent = clamp(
      baseAutomation +
        BUDGET_AUTOMATION_BOOST[budget] +
        ADOPTION_AUTOMATION_BOOST[adoptionSpeed] +
        TEAM_AUTOMATION_BOOST[teamSize] +
        REGULATORY_AUTOMATION_BOOST[regulatory],
      10,
      85
    );

    const literacyGap = LITERACY_SKILL_GAP[aiLiteracy];
    const governanceGap = clamp(regulatory === 'High' ? 75 : regulatory === 'Medium' ? 55 : 35, 10, 95);
    const analyticsGap = clamp(75 - BUDGET_AUTOMATION_BOOST[budget], 20, 90);
    const exceptionReviewGap = clamp(70 - TEAM_AUTOMATION_BOOST[teamSize], 25, 90);

    const readinessScore = clamp(
      100 - (literacyGap * 0.4 + governanceGap * 0.25 + analyticsGap * 0.2 + exceptionReviewGap * 0.15) + (adoptionSpeed === 'Fast' ? 5 : 0),
      0,
      100
    );

    const recommendations = [
      'Increase AI literacy training in the next 12 months.',
      'Define a review protocol for AI-generated audit outputs.',
      'Prioritize anomaly detection and transaction testing pilots.',
    ];

    if (teamSize === 'Small team') recommendations.push('Assign one AI audit champion to coordinate rollout and quality checks.');
    if (regulatory === 'High') recommendations.push('Strengthen governance controls before scaling automation use cases.');
    if (budget === 'High') recommendations.push('Accelerate implementation with a phased roadmap across planning, testing, and review.');

    return {
      automationPercent,
      readinessScore: Math.round(readinessScore),
      readinessLabel: scoreToReadinessLabel(readinessScore),
      skills: [
        { label: 'AI literacy', value: literacyGap },
        { label: 'AI risk governance', value: governanceGap },
        { label: 'Audit analytics', value: analyticsGap },
        { label: 'Exception review', value: exceptionReviewGap },
      ],
      recommendations: recommendations.slice(0, 4),
    };
  }, [budget, adoptionSpeed, teamSize, regulatory, aiLiteracy]);
  const readinessChipColor =
    outputs.readinessScore < 45 ? 'error' : outputs.readinessScore < 75 ? 'warning' : 'success';

  return (
    <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h5">Scenario exploration</Typography>
          <Typography variant="body2" color="text.secondary">
            Explore how audit workflows, risk, and skill needs may evolve over the next 3 to 5 years.
          </Typography>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h5">Scenario Input</Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="Type a future-focused audit question..."
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {[
                'How will AI affect fraud detection in 5 years?',
                'What will audit planning look like for small firms by 2030?',
                'Which audit tasks are most ready for AI-assisted execution?',
              ].map((prompt) => (
                <Chip key={prompt} label={prompt} onClick={() => setScenario(prompt)} />
              ))}
            </Stack>
          </Stack>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6} lg={4}>
            <FormControl fullWidth>
              <InputLabel>Regulatory strictness</InputLabel>
              <Select
                value={regulatory}
                label="Regulatory strictness"
                onChange={(e) => setRegulatory(e.target.value)}
                MenuProps={selectMenuProps}
              >
                {REGULATORY_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <FormControl fullWidth>
              <InputLabel>Tech budget</InputLabel>
              <Select value={budget} label="Tech budget" onChange={(e) => setBudget(e.target.value)} MenuProps={selectMenuProps}>
                {BUDGET_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <FormControl fullWidth>
              <InputLabel>Team size</InputLabel>
              <Select value={teamSize} label="Team size" onChange={(e) => setTeamSize(e.target.value)} MenuProps={selectMenuProps}>
                {TEAM_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <FormControl fullWidth>
              <InputLabel>AI literacy</InputLabel>
              <Select value={aiLiteracy} label="AI literacy" onChange={(e) => setAiLiteracy(e.target.value)} MenuProps={selectMenuProps}>
                {LITERACY_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <FormControl fullWidth>
              <InputLabel>AI adoption speed</InputLabel>
              <Select
                value={adoptionSpeed}
                label="AI adoption speed"
                onChange={(e) => setAdoptionSpeed(e.target.value)}
                MenuProps={selectMenuProps}
              >
                {ADOPTION_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <FormControl fullWidth>
              <InputLabel>Industry</InputLabel>
              <Select value={industry} label="Industry" onChange={(e) => setIndustry(e.target.value)} MenuProps={selectMenuProps}>
                {INDUSTRY_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography gutterBottom variant="body2">
              Timeline horizon ({timelineYears} years)
            </Typography>
            <Slider value={timelineYears} valueLabelDisplay="auto" min={3} max={5} step={1} marks onChange={(_, value) => setTimelineYears(value)} />
          </Grid>
        </Grid>

        <Divider />

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.25, md: 2.5 },
                height: '100%',
                borderRadius: 2,
                borderColor: alpha(theme.palette.divider, 0.85),
                boxShadow: `0 3px 14px ${alpha(theme.palette.common.black, 0.04)}`,
              }}
            >
              <Typography variant="h5" gutterBottom>
                Automation Forecast
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                Estimated AI-assisted coverage in {timelineYears} years
              </Typography>
              <Typography variant="h2" sx={{ mb: 1.25, fontWeight: 800, letterSpacing: -0.02 }}>
                {outputs.automationPercent}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={outputs.automationPercent}
                color="info"
                sx={{
                  height: 9,
                  borderRadius: 999,
                  bgcolor: alpha(theme.palette.info.main, 0.16),
                  '& .MuiLinearProgress-bar': { borderRadius: 999 },
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.75, lineHeight: 1.6 }}>
                Focus tasks: data extraction, transaction testing, anomaly detection, and documentation drafting.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.25, md: 2.5 },
                height: '100%',
                borderRadius: 2,
                borderColor: alpha(theme.palette.divider, 0.85),
                boxShadow: `0 3px 14px ${alpha(theme.palette.common.black, 0.04)}`,
              }}
            >
              <Typography variant="h5" gutterBottom>
                Readiness Score
              </Typography>
              <Typography variant="h2" sx={{ mb: 1.25, fontWeight: 800, letterSpacing: -0.02 }}>
                {outputs.readinessScore}/100
              </Typography>
              <Chip color={readinessChipColor} label={outputs.readinessLabel} sx={{ fontWeight: 700 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.75, lineHeight: 1.6 }}>
                Scenario: {industry} industry, {teamSize.toLowerCase()}, {aiLiteracy.toLowerCase()} AI literacy.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.25, md: 2.5 },
                height: '100%',
                borderRadius: 2,
                borderColor: alpha(theme.palette.divider, 0.85),
                boxShadow: `0 3px 14px ${alpha(theme.palette.common.black, 0.04)}`,
              }}
            >
              <Typography variant="h5" gutterBottom>
                Skills Gap Analysis
              </Typography>
              <Stack spacing={1.75}>
                {outputs.skills.map((skill) => (
                  <Box key={skill.label}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {skill.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                        {skill.value}% gap
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={skill.value}
                      color="info"
                      sx={{
                        mt: 0.5,
                        height: 7,
                        borderRadius: 999,
                        bgcolor: alpha(theme.palette.info.main, 0.16),
                        '& .MuiLinearProgress-bar': { borderRadius: 999 },
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom>
            Workflow Evolution
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current-state to future-state process shift
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label="Manual sampling" />
            <Typography variant="body1">→</Typography>
            <Chip label="AI-assisted testing" color="primary" />
            <Typography variant="body1">→</Typography>
            <Chip label="Exception review by auditor" color="secondary" />
          </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.25, md: 2.5 },
            borderRadius: 2,
            borderColor: alpha(theme.palette.divider, 0.85),
            boxShadow: `0 3px 14px ${alpha(theme.palette.common.black, 0.04)}`,
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.success.main, 0.14),
                color: 'success.main',
              }}
            >
              <Iconify icon="solar:checklist-minimalistic-bold-duotone" width={20} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Recommendations
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.75 }}>
            Priority actions to improve audit readiness over the next planning cycle.
          </Typography>
          <Stack spacing={1.1}>
            {outputs.recommendations.map((item, index) => (
              <Stack
                key={item}
                direction="row"
                spacing={1.25}
                alignItems="flex-start"
                sx={{
                  p: 1.25,
                  borderRadius: 1.25,
                  bgcolor: alpha(theme.palette.success.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.12)}`,
                }}
              >
                <Box
                  sx={{
                    mt: 0.2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </Box>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                  {item}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
    </Stack>
  );
}

export default function AiAuditFuturesPage() {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>
      <Stack spacing={2.5}>
        <Stack spacing={1}>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: -0.02 }}>
            AI Audit &amp; maturity
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720, lineHeight: 1.65 }}>
            Explore long-range audit scenarios, or run a structured maturity self-check with live rollup scores.
          </Typography>
        </Stack>

        {isSmUp ? (
          <Paper
            elevation={0}
            sx={{
              p: 0.75,
              borderRadius: 100,
              border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              bgcolor: alpha(theme.palette.grey[500], 0.06),
              maxWidth: 560,
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              variant="fullWidth"
              TabIndicatorProps={{ sx: { display: 'none' } }}
              sx={{
                minHeight: 46,
                '& .MuiTabs-flexContainer': { gap: 0.75 },
                '& .MuiTab-root': {
                  minHeight: 46,
                  py: 1,
                  px: 2,
                  borderRadius: 100,
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: '0.9375rem',
                  color: 'text.secondary',
                  transition: (t) =>
                    t.transitions.create(['color', 'background-color', 'box-shadow'], {
                      duration: t.transitions.duration.shorter,
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
                icon={<Iconify icon="solar:rocket-bold-duotone" width={20} />}
                iconPosition="start"
                label="Futures explorer"
                sx={{ gap: 1 }}
              />
              <Tab
                icon={<Iconify icon="solar:clipboard-check-bold-duotone" width={20} />}
                iconPosition="start"
                label="Maturity self-check"
                sx={{ gap: 1 }}
              />
            </Tabs>
          </Paper>
        ) : (
          <Box sx={{ width: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              variant="fullWidth"
              aria-label="Audit view"
              TabIndicatorProps={{
                sx: {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  bgcolor: 'primary.main',
                },
              }}
              sx={{
                minHeight: 44,
                '& .MuiTab-root': {
                  minHeight: 44,
                  py: 1.25,
                  px: 1,
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                },
                '& .Mui-selected': {
                  color: 'primary.main',
                },
              }}
            >
              <Tab label="Futures" aria-label="Futures explorer" />
              <Tab label="Maturity" aria-label="Maturity self-check" />
            </Tabs>
          </Box>
        )}

        {tab === 0 ? <AuditFuturesExploration /> : <AiMaturityAssessmentPanel />}
      </Stack>
    </Box>
  );
}
