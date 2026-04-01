import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';

import { Iconify } from 'src/components/iconify';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const CARDS = [
  {
    icon: 'mingcute:user-group-line',
    title: 'AI Communities',
    description:
      'Discover and join specialized AI communities. From machine learning to robotics, find your tribe of AI enthusiasts and experts.',
  },
  {
    icon: 'mingcute:flash-line',
    title: 'Smart Learning',
    description:
      'AI-powered learning paths that adapt to your skill level. Gamified experiences with achievements and personalized recommendations.',
  },
  {
    icon: 'mingcute:git-branch-line',
    title: 'AI Resources',
    description:
      'Build and share intelligent AI resources. Automate tasks with AI agents and connect with powerful APIs and integrations.',
  },
];

// ----------------------------------------------------------------------

export function HomeCardsSection() {
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
              Powered by{' '}
              <Box component="span" sx={{ color: 'primary.main' }}>
                Artificial Intelligence
              </Box>
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
              Experience the future of community learning with AI-driven features that adapt to your
              needs
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={3}>
          {CARDS.map((card, index) => (
            <Grid key={card.title} xs={12} md={4}>
              <Box
                component={m.div}
                variants={varFade().inUp}
                sx={{
                  height: 1,
                  p: 4,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  boxShadow: (theme) => theme.shadows[2],
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: (theme) => theme.shadows[8],
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #56c7da, #fcd60b)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                  }}
                >
                  <Iconify icon={card.icon} width={32} sx={{ color: 'common.white' }} />
                </Box>

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    color: 'text.primary',
                  }}
                >
                  {card.title}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    lineHeight: 1.8,
                    fontSize: '0.875rem',
                  }}
                >
                  {card.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </DashboardContent>
    </Box>
  );
}

