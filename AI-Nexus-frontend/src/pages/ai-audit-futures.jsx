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
  TextField,
  Typography,
} from '@mui/material';

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

const scoreToReadinessLabel = (score) => {
  if (score < 45) return 'Low readiness';
  if (score < 75) return 'Emerging readiness';
  return 'Strong readiness';
};

export default function AiAuditFuturesPage() {
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

    const humanJudgmentCriticality = clamp(100 - automationPercent + (regulatory === 'High' ? 8 : 0), 20, 95);
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
      humanJudgmentCriticality,
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

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 }, maxWidth: 1400, mx: 'auto' }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h3">AI Audit Futures Tool</Typography>
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
                'Where will human judgment remain essential in AI-assisted audits?',
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
              <Select value={regulatory} label="Regulatory strictness" onChange={(e) => setRegulatory(e.target.value)}>
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
              <Select value={budget} label="Tech budget" onChange={(e) => setBudget(e.target.value)}>
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
              <Select value={teamSize} label="Team size" onChange={(e) => setTeamSize(e.target.value)}>
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
              <Select value={aiLiteracy} label="AI literacy" onChange={(e) => setAiLiteracy(e.target.value)}>
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
              <Select value={adoptionSpeed} label="AI adoption speed" onChange={(e) => setAdoptionSpeed(e.target.value)}>
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
              <Select value={industry} label="Industry" onChange={(e) => setIndustry(e.target.value)}>
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
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="h5" gutterBottom>
                Automation Forecast
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Estimated AI-assisted coverage in {timelineYears} years
              </Typography>
              <Typography variant="h2" sx={{ mb: 1 }}>
                {outputs.automationPercent}%
              </Typography>
              <LinearProgress variant="determinate" value={outputs.automationPercent} sx={{ height: 10, borderRadius: 10 }} />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Focus tasks: data extraction, transaction testing, anomaly detection, and documentation drafting.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="h5" gutterBottom>
                Readiness Score
              </Typography>
              <Typography variant="h2" sx={{ mb: 1 }}>
                {outputs.readinessScore}/100
              </Typography>
              <Chip color="primary" label={outputs.readinessLabel} />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Scenario: {industry} industry, {teamSize.toLowerCase()}, {aiLiteracy.toLowerCase()} AI literacy.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="h5" gutterBottom>
                Human Judgment Map
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Areas where accountants remain critical
              </Typography>
              <LinearProgress
                variant="determinate"
                value={outputs.humanJudgmentCriticality}
                color="secondary"
                sx={{ height: 10, borderRadius: 10, mb: 2 }}
              />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label="Professional skepticism" variant="outlined" />
                <Chip label="Ethical judgment" variant="outlined" />
                <Chip label="Materiality assessment" variant="outlined" />
                <Chip label="Client communication" variant="outlined" />
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="h5" gutterBottom>
                Skills Gap Analysis
              </Typography>
              <Stack spacing={1.5}>
                {outputs.skills.map((skill) => (
                  <Box key={skill.label}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">{skill.label}</Typography>
                      <Typography variant="body2">{skill.value}% gap</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={skill.value} sx={{ height: 8, borderRadius: 8 }} />
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

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom>
            Recommendations
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 0 }}>
            {outputs.recommendations.map((item) => (
              <li key={item}>
                <Typography variant="body2">{item}</Typography>
              </li>
            ))}
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
