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

/** Shared lesson media frame height — same as video player (video, image, document, text). */
export const LESSON_MEDIA_FRAME_HEIGHT = {
  xs: 260,
  sm: 320,
  md: 'clamp(240px, 34vh, 380px)',
  lg: 'clamp(280px, 36vh, 440px)',
  xl: 580,
};

/** @deprecated Use LESSON_MEDIA_FRAME_HEIGHT */
export const LESSON_FRAME_HEIGHT = LESSON_MEDIA_FRAME_HEIGHT;

export function getLessonMediaFrameSx(theme, frameHeight = LESSON_MEDIA_FRAME_HEIGHT) {
  return {
    position: 'relative',
    overflow: 'hidden',
    bgcolor: 'grey.900',
    width: '100%',
    aspectRatio: '16 / 9',
    height: 'auto',
    maxHeight: frameHeight,
    borderRadius: 0,
    boxShadow: `0 12px 40px ${alpha(theme.palette.common.black, 0.14)}`,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
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
