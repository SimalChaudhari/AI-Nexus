import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

/** Guest copy per Learning tab: hero icon + title + subtitle (override via props if needed). */
export const learningGuestSignInPresets = {
  progress: {
    heroIcon: 'solar:graph-up-bold',
    title: 'Sign in to track your progress',
    subtitle: 'Your learning activity is saved to your account so you can pick up where you stopped.',
  },
  favorites: {
    heroIcon: 'solar:heart-bold',
    title: 'Sign in to view favorites',
    subtitle: 'Save courses and lessons to your account and open them quickly anytime.',
  },
  myCourses: {
    heroIcon: 'solar:notebook-bookmark-bold',
    title: 'Sign in to view your courses',
    subtitle: 'Courses you have purchased or enrolled in appear here after you sign in.',
  },
  certificates: {
    heroIcon: 'solar:medal-ribbons-star-bold',
    title: 'Sign in to view certificates',
    subtitle: 'Earned certificates are tied to your account—sign in to see and download them.',
  },
};

/** Guest sign-in prompt for Learning tabs (Progress / Favorites / Certificates). */
export function LearningGuestSignInPrompt({
  variant,
  title: titleProp,
  subtitle: subtitleProp,
  heroIcon: heroIconProp,
  signInHref = paths.auth.simple.signIn,
}) {
  const preset = variant ? learningGuestSignInPresets[variant] : null;
  const title = titleProp ?? preset?.title ?? '';
  const subtitle = subtitleProp ?? preset?.subtitle ?? '';
  const heroIcon = heroIconProp ?? preset?.heroIcon ?? 'solar:login-2-bold';

  return (
    <Box
      sx={{
        width: '100%',
        py: { xs: 6, md: 10 },
        px: { xs: 2, sm: 3 },
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Stack
        spacing={3}
        sx={{
          maxWidth: 560,
          width: '100%',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Iconify icon={heroIcon} width={64} sx={{ color: 'text.disabled' }} />

        <Box sx={{ width: '100%' }}>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.65,
                maxWidth: 480,
                mx: 'auto',
              }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Box>

        <Button
          component={RouterLink}
          to={signInHref}
          variant="contained"
          size="large"
          startIcon={<Iconify icon="solar:login-2-bold" width={18} />}
        >
          Sign in
        </Button>
      </Stack>
    </Box>
  );
}
