export const APP_FONT_FAMILY = '"Montserrat", "Google Sans", system-ui, sans-serif';

export const APP_COLORS = {
  primary: '#1C4270',
  primaryDeep: '#0F2744',
  accent: '#E32B24',
  textPrimary: '#1F2A37',
  textSecondary: '#5B6B7E',
  sectionBg: '#F8FAFC',
  sectionAltBg: '#F3F6FB',
  cardBg: '#FFFFFF',
  borderSoft: '#D9E2EC',
};

export const APP_TYPOGRAPHY = {
  eyebrow: {
    fontFamily: APP_FONT_FAMILY,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.78rem' },
    lineHeight: 1.2,
  },
  pageHeading: {
    fontFamily: APP_FONT_FAMILY,
    fontWeight: 800,
    color: APP_COLORS.primaryDeep,
    fontSize: { xs: '1.5rem', sm: '1.9rem', md: '2.2rem' },
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  body: {
    fontFamily: APP_FONT_FAMILY,
    color: APP_COLORS.textSecondary,
    fontSize: { xs: '0.95rem', sm: '1rem', md: '1.05rem' },
    lineHeight: 1.7,
    fontWeight: 400,
  },
};

export const APP_SECTION_SPACING = {
  compact: { xs: 4, md: 5 },
  regular: { xs: 6, md: 8 },
  large: { xs: 7, md: 10 },
};
