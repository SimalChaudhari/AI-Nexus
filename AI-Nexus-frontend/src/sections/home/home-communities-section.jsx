import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';

import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const STEPS = [
  {
    number: '1',
    title: 'Create Your Community',
    description:
      'Set up your AI-powered community in minutes. Define your goals, target audience, and let our AI configure the optimal settings for engagement and growth.',
    bgColor: '#2563eb',
  },
  {
    number: '2',
    title: 'Deploy smart AI resources',
    description:
      'Activate intelligent AI resources that handle member onboarding, content curation, engagement tracking, and personalized recommendations.',
    bgColor: '#16a34a',
  },
  {
    number: '3',
    title: 'Scale & Optimize',
    description:
      'Watch your community grow as AI continuously optimizes engagement, suggests improvements, and provides insights to maximize member value and retention.',
    bgColor: '#9333ea',
  },
];

// ----------------------------------------------------------------------

export function HomeCommunitiesSection() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 4, md: 8 },
        bgcolor: 'background.default',
      }}
    >
      <DashboardContent component={MotionViewport}>
        <Stack
          spacing={1}
          sx={{
            textAlign: { xs: 'center', lg: 'center' },
            // maxWidth: { lg: '50%' },
            mb: 6,
          }}
        >
          <Box component={m.div} variants={varFade().inUp}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', md: '2.5rem' },
                fontWeight: 'bold',
                mb: 2,
                color: 'text.primary',
              }}
            >
              How AI Communities Work
            </Typography>
          </Box>

          <Box component={m.div} variants={varFade().inUp}>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem' },
                color: 'text.secondary',
                maxWidth: { xs: '100%', lg: '90%' },
              }}
            >
              Our three-step process makes it easy to create, manage, and scale your AI-powered
              community.
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={3}>
          {STEPS.map((step, index) => (
            <Grid key={step.number} xs={12} md={4}>
              <Box
                component={m.div}
                variants={varFade().inUp}
                sx={{
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: step.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 'bold',
                      color: 'common.white',
                    }}
                  >
                    {step.number}
                  </Typography>
                </Box>

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    color: 'text.primary',
                  }}
                >
                  {step.title}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    lineHeight: 1.8,
                    fontSize: '0.875rem',
                  }}
                >
                  {step.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </DashboardContent>
    </Box>
  );
}

