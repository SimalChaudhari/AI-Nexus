// Fluid font sizes for course player — scales smoothly between mobile and desktop.

import { alpha } from '@mui/material/styles';

export const playerFluidType = {
  body: {
    xs: 'clamp(0.8125rem, 0.72rem + 0.35vw, 0.9375rem)',
    md: '0.9375rem',
  },
  caption: {
    xs: 'clamp(0.6875rem, 0.62rem + 0.28vw, 0.75rem)',
    md: '0.75rem',
  },
  label: {
    xs: 'clamp(0.875rem, 0.8rem + 0.4vw, 1rem)',
    md: '1rem',
  },
  overline: {
    xs: 'clamp(0.625rem, 0.58rem + 0.22vw, 0.6875rem)',
    md: '0.6875rem',
  },
  tab: {
    xs: 'clamp(0.8125rem, 0.74rem + 0.32vw, 0.875rem)',
    md: '0.875rem',
  },
  subtitle: {
    xs: 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
    md: '1.125rem',
  },
};

export const playerLessonNotesSx = {
  fontSize: playerFluidType.body,
  color: 'text.secondary',
  lineHeight: 1.75,
  overflow: 'visible',
  maxHeight: 'none',
  '& p, & li, & td, & th': {
    fontSize: 'inherit',
    lineHeight: 'inherit',
  },
  '& p': { mb: 1.25 },
  '& ul, & ol': { mb: 1.25, pl: { xs: 2, sm: 2.5 } },
  '& h1': {
    fontSize: { xs: 'clamp(1.375rem, 1.15rem + 1vw, 1.75rem)', md: '1.75rem' },
    color: 'text.primary',
    fontWeight: 700,
    mt: 1.5,
    mb: 1,
    lineHeight: 1.3,
  },
  '& h2': {
    fontSize: { xs: 'clamp(1.25rem, 1.05rem + 0.85vw, 1.5rem)', md: '1.5rem' },
    color: 'text.primary',
    fontWeight: 700,
    mt: 1.5,
    mb: 1,
    lineHeight: 1.35,
  },
  '& h3, & h4': {
    fontSize: { xs: 'clamp(1.0625rem, 0.95rem + 0.55vw, 1.25rem)', md: '1.25rem' },
    color: 'text.primary',
    fontWeight: 700,
    mt: 1.25,
    mb: 0.75,
    lineHeight: 1.4,
  },
  '& a': { color: 'primary.main', fontWeight: 600, fontSize: 'inherit' },
};

export const playerTabIconSx = {
  width: { xs: 20, sm: 22 },
  height: { xs: 20, sm: 22 },
  maxWidth: { xs: 20, sm: 22 },
  maxHeight: { xs: 20, sm: 22 },
  objectFit: 'contain',
  display: 'block',
  flexShrink: 0,
};

/** Max height cap from `sm` up; on xs the frame uses full width + 16:9 aspect ratio only. */
export const LESSON_MEDIA_FRAME_HEIGHT = {
  sm: 360,
  md: 'clamp(280px, 38vh, 420px)',
  lg: 'clamp(300px, 40vh, 480px)',
  xl: 580,
};

/** @deprecated Use LESSON_MEDIA_FRAME_HEIGHT */
export const LESSON_FRAME_HEIGHT = LESSON_MEDIA_FRAME_HEIGHT;

export function getLessonMediaFrameSx(theme, _frameHeight = LESSON_MEDIA_FRAME_HEIGHT) {
  return {
    position: 'relative',
    overflow: 'hidden',
    bgcolor: 'grey.900',
    width: '100%',
    aspectRatio: '16 / 9',
    // Paired maxHeight + maxWidth keeps the frame at exactly 16:9 when height is constrained.
    // Using maxHeight alone with width:100% lets the frame grow wider than 16:9 in flex containers.
    maxHeight: { xs: 'none', sm: '56vh', md: '60vh', lg: '65vh', xl: '72vh' },
    maxWidth: {
      xs: '100%',
      sm: 'min(100%, calc(56vh * 16 / 9))',
      md: 'min(100%, calc(60vh * 16 / 9))',
      lg: 'min(100%, calc(65vh * 16 / 9))',
      xl: 'min(100%, calc(72vh * 16 / 9))',
    },
    margin: '0 auto',
    borderRadius: 0,
    boxShadow: `0 12px 40px ${alpha(theme.palette.common.black, 0.14)}`,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
  };
}

/** Fill the lesson media frame (YouTube / Spotlightr / native video). */
export function getLessonVideoSurfaceSx() {
  return {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    '& iframe, & video, & > div': {
      position: 'absolute',
      inset: 0,
      width: '100% !important',
      height: '100% !important',
      maxWidth: '100%',
      border: 0,
    },
  };
}

export function getLessonMediaFrameInnerSx() {
  return {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };
}

/** Practice intro + quiz — flex child fills remaining panel height (no overflow). */
export const playerPracticePanelSx = {
  flex: '1 1 0%',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

/** Left/right player columns — hidden bars on phone; thin visible bars on laptop (touchpad). */
export const playerScrollPanelSx = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
    width: 0,
    height: 0,
  },
  '@media (min-width:900px)': {
    scrollbarWidth: 'thin',
    msOverflowStyle: 'auto',
    scrollbarColor: 'rgba(28, 66, 112, 0.28) transparent',
    '&::-webkit-scrollbar': {
      display: 'block',
      width: 6,
      height: 6,
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(28, 66, 112, 0.28)',
      borderRadius: 999,
    },
  },
};
