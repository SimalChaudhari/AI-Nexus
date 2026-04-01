import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { GradientButton } from 'src/components/custom-button';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

export function HomeJoinSection() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 10, md: 15 },
        bgcolor: 'grey.900',
      }}
    >
      <DashboardContent
        component={MotionViewport}
        sx={{
          maxWidth: 900,
          textAlign: 'center',
        }}
      >
        <Stack spacing={4} component={m.div} variants={varFade().inUp}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 'bold',
              color: 'common.white',
              mb: 2,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Ready to Join the AI Revolution?
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: 'grey.300',
              mb: 4,
              fontWeight: 'normal',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Connect with the brightest AI minds, learn cutting-edge techniques, and build the
            future together.
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <GradientButton
              size="large"
              icon="mingcute:arrow-right-line"
              iconPosition="left"
            >
              Get Started Now
            </GradientButton>
          </Box>
        </Stack>
      </DashboardContent>
    </Box>
  );
}

