import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { GradientButton } from 'src/components/custom-button';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

export function HomeHeroSection() {
  const theme = useTheme();

  const backgroundImageUrl =
    'https://readdy.ai/api/search-image?query=futuristic%20AI%20technology%20network%20with%20glowing%20neural%20connections%2C%20holographic%20interfaces%2C%20and%20digital%20data%20streams%20in%20a%20modern%20tech%20environment%20with%20soft%20blue%20and%20yellow%20lighting%2C%20minimalist%20clean%20background%20perfect%20for%20text%20overlay&width=1920&height=1080&seq=hero-ai-nexus&orientation=landscape';

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `linear-gradient(rgba(86, 199, 218, 0.1), rgba(252, 214, 11, 0.1)), url("${backgroundImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(255, 255, 255, 0.9), transparent)',
        }}
      />

      <DashboardContent
        component={MotionViewport}
        sx={{
          position: 'relative',
          zIndex: 10,
          py: { xs: 10, md: 15 },
        }}
      >
        <Stack
          spacing={4}
          sx={{
            textAlign: { xs: 'center', lg: 'left' },
            maxWidth: { lg: '50%' },
          }}
        >
          <Box component={m.div} variants={varFade().inUp}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                fontWeight: 'bold',
                mb: 3,
              }}
            >
              <Box
                component="span"
                sx={{
                  fontFamily: 'Pacifico, serif',
                  background: 'linear-gradient(45deg, rgb(86, 199, 218), #fcd60b)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  display: 'block',
                }}
              >
                AI Nexus
              </Box>
              <Box component="span"
                // sx={{ color: 'text.primary', display: 'block', mt: 1 }}
                sx={{
                  color: 'text.primary',
                  display: 'block',
                  mt: 1,
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Where AI Minds Connect
              </Box>
            </Typography>
          </Box>

          <Box component={m.div} variants={varFade().inUp}>
            <Typography
              variant="h5"
              sx={{
                color: 'text.secondary',
                mb: 4,
                lineHeight: 1.8,
                maxWidth: { xs: '100%', lg: '90%' },
              }}
            >
              Join the ultimate AI community platform. Discover cutting-edge AI communities, learn
              from experts, and build intelligent workflows. Connect with AI enthusiasts, researchers,
              and innovators worldwide.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ justifyContent: { xs: 'center', lg: 'flex-start' } }}
            component={m.div}
            variants={varFade().inUp}
          >
            <GradientButton
              size="large"
              icon="mingcute:flash-line"
              iconPosition="left"
              sx={{ minHeight: 48 }}
            >
              Start Your AI Journey
            </GradientButton>

            <Button
              variant="outlined"
              size="large"
              startIcon={<Iconify icon="mingcute:play-line" width={20} />}
              sx={{
                px: 4,
                py: 1.8,
                fontSize: '1.125rem',
                minHeight: 64,
                borderWidth: 2,
                borderColor: 'primary.main',
                bgcolor: 'common.white',
                color: 'primary.main',
                '&:hover': {
                  borderWidth: 2,
                  borderColor: 'primary.main',
                  bgcolor: 'primary.main',
                  color: 'common.white',
                },
              }}
            >
              Watch Demo
            </Button>
          </Stack>
        </Stack>
      </DashboardContent>
    </Box>
  );
}

