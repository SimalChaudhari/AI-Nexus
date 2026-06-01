import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { FLUID_FONT_SIZES } from 'src/theme/home-typography';
import { varAlpha, bgGradient } from 'src/theme/styles';

import { AnimateText, MotionContainer, animateTextClasses } from 'src/components/animate';

// ----------------------------------------------------------------------

export function ContactHero({ headingLine1 = '', headingLine2 = '', imageUrl = '' }) {
  const theme = useTheme();
  const lines = [String(headingLine1 || '').trim(), String(headingLine2 || '').trim()].filter(Boolean);
  const heroImage = String(imageUrl || '').trim();

  if (!heroImage && !lines.length) {
    return null;
  }

  return (
    <Box
      sx={{
        ...bgGradient({
          color: `0deg, ${varAlpha(theme.vars.palette.grey['900Channel'], 0.8)}, ${varAlpha(theme.vars.palette.grey['900Channel'], 0.8)}`,
          imgUrl: heroImage,
        }),
        height: { md: 560 },
        py: { xs: 10, md: 0 },
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Container component={MotionContainer}>
        <Box
          sx={{
            bottom: { md: 80 },
            position: { md: 'absolute' },
            textAlign: { xs: 'center', md: 'unset' },
            maxWidth: 780,
            px: { xs: 1, sm: 2, md: 0 },
          }}
        >
          {lines.length ? (
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
          ) : null}
        
        </Box>
      </Container>
    </Box>
  );
}
