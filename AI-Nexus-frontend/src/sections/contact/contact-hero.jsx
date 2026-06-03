import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { FLUID_FONT_SIZES } from 'src/theme/home-typography';
import { varAlpha, bgGradient } from 'src/theme/styles';

import { AnimateText, MotionViewport, animateTextClasses } from 'src/components/animate';

// ----------------------------------------------------------------------

export function ContactHero({ headingLine1 = '', headingLine2 = '', imageUrl = '' }) {
  const theme = useTheme();
  const lines = [String(headingLine1 || '').trim(), String(headingLine2 || '').trim()].filter(
    Boolean
  );
  const heroImage = String(imageUrl || '').trim();

  if (!heroImage && !lines.length) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        minHeight: { xs: 220, sm: 260, md: 320 },
        display: 'flex',
        alignItems: 'center',
        marginBottom: 4,
        px: { xs: 3, sm: 4, md: 5 },
        py: { xs: 4, md: 5 },
        ...(heroImage
          ? bgGradient({
              color: `0deg, ${varAlpha(theme.vars.palette.grey['900Channel'], 0.78)}, ${varAlpha(theme.vars.palette.grey['900Channel'], 0.78)}`,
              imgUrl: heroImage,
            })
          : {
              bgcolor: 'primary.dark',
              backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            }),
      }}
    >
      {lines.length ? (
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 760 }}>
          <AnimateText
            component="h1"
            variant="h1"
            text={lines}
            sx={{
              color: 'common.white',
              ...HERO_TYPOGRAPHY.sectionMainTitle,
              lineHeight: { xs: 1.2, sm: 1.15, md: 1.1 },
              [`& .${animateTextClasses.line}`]: {
                fontSize: FLUID_FONT_SIZES.display,
              },
              textShadow: '0 2px 12px rgba(0,0,0,0.28)',
              [`& .${animateTextClasses.line}[data-index="0"]`]: {
                [`& .${animateTextClasses.word}[data-index="0"]`]: { color: 'primary.main' },
              },
            }}
          />
        </Box>
      ) : null}
    </Box>
  );
}
