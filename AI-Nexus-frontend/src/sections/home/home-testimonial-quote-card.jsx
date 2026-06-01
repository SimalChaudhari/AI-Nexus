import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { CONFIG } from 'src/config-global';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
import { FLUID_FONT_SIZES } from 'src/theme/home-typography';

// ----------------------------------------------------------------------

const CARD_CREAM = '#FFFCF7';
const STAR_COLOR = '#F5A623';
const AVATAR_SIZE = { xs: 64, sm: 64, md: 76 };

function resolveAssetUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function avatarFallbackUrl(name) {
  const seed = encodeURIComponent(String(name || 'guest').trim() || 'guest');
  return `https://i.pravatar.cc/150?u=${seed}`;
}

function formatCustomerName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].toUpperCase();
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first.toUpperCase()} ${lastInitial}.`;
}

const MOBILE_ONE_CARD_MAX_PX = 375;

const HOVER_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export function HomeTestimonialQuoteCard({ item, sectionBg = '#F4F6F8' }) {
  const theme = useTheme();
  const isSingleCardLayout = useMediaQuery(`(max-width:${MOBILE_ONE_CARD_MAX_PX}px)`, {
    noSsr: true,
  });
  const primary = theme.palette.primary.main;
  const quoteHtml = String(item?.quote || '');
  const hasQuote = !isEffectivelyEmptyHtml(quoteHtml);
  const name = String(item?.name || '').trim();
  const rating = Math.min(5, Math.max(0, Number(item?.rating) || 5));
  const avatarSrc = resolveAssetUrl(item?.avatarUrl) || avatarFallbackUrl(name);
  const displayName = formatCustomerName(name);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        minWidth: 0,
        height: isSingleCardLayout ? 'auto' : '100%',
        pb: {
          xs: `${AVATAR_SIZE.xs / 2 + 4}px`,
          sm: `${AVATAR_SIZE.sm / 2 + 4}px`,
          md: `${AVATAR_SIZE.md / 2 + 4}px`,
        },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        className="testimonial-card"
        sx={{
          position: 'relative',
          flex: isSingleCardLayout ? '0 0 auto' : 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: { xs: 2, md: 3 },
          bgcolor: CARD_CREAM,
          overflow: 'visible',
          border: { xs: `1.5px solid ${primary}`, md: `2px solid ${primary}` },
          boxShadow: `0 6px 24px ${alpha(theme.palette.grey[500], 0.1)}`,
          isolation: 'isolate',
          transition: (t) =>
            t.transitions.create(['box-shadow', 'border-color', 'background-color', 'transform'], {
              duration: t.transitions.duration.standard,
              easing: HOVER_EASE,
            }),
          '@keyframes testimonialStarPop': {
            '0%': { transform: 'scale(1)' },
            '40%': { transform: 'scale(1.22)' },
            '100%': { transform: 'scale(1.08)' },
          },
          '@keyframes testimonialBadgePulse': {
            '0%, 100%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.12)' },
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            opacity: 0,
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${alpha(primary, 0.14)} 0%, transparent 70%)`,
            transition: (t) => t.transitions.create('opacity', { duration: 400 }),
            zIndex: 0,
          },
          '@media (hover: hover) and (pointer: fine)': {
            cursor: 'default',
            '&:hover': {
              bgcolor: 'common.white',
              borderColor: theme.palette.primary.dark,
              transform: 'scale(1.02)',
              boxShadow: `0 20px 48px ${alpha(primary, 0.22)}, 0 10px 24px ${alpha(
                theme.palette.grey[500],
                0.14
              )}, 0 0 0 1px ${alpha(primary, 0.08)}`,
              '&::after': { opacity: 1 },
              '& .testimonial-quote-box': {
                bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                boxShadow: `inset 0 0 0 1px ${alpha(primary, 0.12)}`,
              },
              '& .testimonial-quote-mark': {
                color: alpha(primary, 0.55),
                transform: 'scale(1.12)',
              },
              '& .testimonial-rating .MuiRating-icon': {
                animation: 'testimonialStarPop 0.45s ease forwards',
              },
              '& .testimonial-rating .MuiRating-icon:nth-of-type(1)': { animationDelay: '0ms' },
              '& .testimonial-rating .MuiRating-icon:nth-of-type(2)': { animationDelay: '40ms' },
              '& .testimonial-rating .MuiRating-icon:nth-of-type(3)': { animationDelay: '80ms' },
              '& .testimonial-rating .MuiRating-icon:nth-of-type(4)': { animationDelay: '120ms' },
              '& .testimonial-rating .MuiRating-icon:nth-of-type(5)': { animationDelay: '160ms' },
              '& .testimonial-divider': {
                width: 56,
                opacity: 1,
                background: `linear-gradient(90deg, transparent, ${primary}, ${STAR_COLOR}, ${primary}, transparent)`,
              },
              '& .testimonial-name': {
                letterSpacing: 1,
                color: theme.palette.primary.dark,
              },
              '& .testimonial-verified': {
                bgcolor: (t) => alpha(t.palette.success.main, 0.16),
                transform: 'translateY(-2px)',
              },
              '& .testimonial-avatar-wrap': {
                transform: 'translate(-50%, 50%) scale(1.08)',
                boxShadow: `0 12px 28px ${alpha(primary, 0.35)}`,
                borderColor: theme.palette.primary.dark,
              },
              '& .testimonial-star-badge': {
                animation: 'testimonialBadgePulse 0.6s ease',
              },
            },
          },
        }}
      >
        <Stack
          alignItems="center"
          spacing={0}
          sx={{
            position: 'relative',
            zIndex: 1,
            flex: isSingleCardLayout ? '0 0 auto' : 1,
            height: isSingleCardLayout ? 'auto' : '100%',
            width: '100%',
            px: { xs: 2, sm: 2, md: 3 },
            pt: { xs: 2.5, sm: 2.5, md: 3.25 },
            pb: { xs: 4, sm: 4.25, md: 5 },
          }}
        >
          <Rating
            readOnly
            value={rating}
            precision={0.5}
            size="small"
            className="testimonial-rating"
            sx={{
              position: 'relative',
              zIndex: 1,
              mb: { xs: 1.25, md: 2 },
              fontSize: FLUID_FONT_SIZES.h5,
              '& .MuiRating-icon': {
                transition: 'transform 0.3s ease, color 0.3s ease',
              },
              '& .MuiRating-iconFilled': { color: STAR_COLOR },
              '& .MuiRating-iconEmpty': { color: alpha(STAR_COLOR, 0.25) },
            }}
          />

          <Box
            className="testimonial-quote-box"
            sx={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              flex: isSingleCardLayout ? '0 0 auto' : 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              py: { xs: 1.25, sm: 1.5, md: 2 },
              px: { xs: 1.25, sm: 1.5, md: 2 },
              borderRadius: { xs: 1.5, md: 2 },
              bgcolor: (t) => alpha(t.palette.grey[500], 0.06),
              textAlign: 'center',
              transition: (t) =>
                t.transitions.create(['background-color', 'box-shadow'], {
                  duration: t.transitions.duration.standard,
                }),
            }}
          >
            <Typography
              component="span"
              aria-hidden
              className="testimonial-quote-mark"
              sx={{
                position: 'absolute',
                top: 6,
                left: 10,
                fontFamily: 'Georgia, serif',
                fontSize: FLUID_FONT_SIZES.h5,
                lineHeight: 1,
                color: alpha(primary, 0.35),
                userSelect: 'none',
                transition: (t) =>
                  t.transitions.create(['color', 'transform'], {
                    duration: t.transitions.duration.standard,
                    easing: HOVER_EASE,
                  }),
              }}
            >
              “
            </Typography>
            <Typography
              component="span"
              aria-hidden
              className="testimonial-quote-mark"
              sx={{
                position: 'absolute',
                bottom: 6,
                right: 10,
                fontFamily: 'Georgia, serif',
                fontSize: FLUID_FONT_SIZES.h5,
                lineHeight: 1,
                color: alpha(primary, 0.35),
                userSelect: 'none',
                transition: (t) =>
                  t.transitions.create(['color', 'transform'], {
                    duration: t.transitions.duration.standard,
                    easing: HOVER_EASE,
                  }),
              }}
            >
              ”
            </Typography>

            {hasQuote ? (
              <RichTextContent
                html={quoteHtml}
                className="testimonial-quote-text"
                sx={{
                  typography: 'body1',
                  fontSize: FLUID_FONT_SIZES.body2,
                  lineHeight: { xs: 1.65, md: 1.75 },
                  color: 'text.primary',
                  textAlign: 'center',
                  overflow: 'visible',
                  px: { xs: 0.5, md: 1 },
                  '& img': {
                    maxWidth: '100%',
                    height: 'auto',
                    maxHeight: 'min(560px, 78vh)',
                    objectFit: 'contain',
                    verticalAlign: 'middle',
                    borderRadius: 1.5,
                  },
                  '& figure': {
                    maxWidth: '100%',
                  },
                }}
              />
            ) : null}
          </Box>

          <Box
            className="testimonial-divider"
            sx={{
              position: 'relative',
              zIndex: 1,
              width: { xs: 32, md: 40 },
              height: 3,
              flexShrink: 0,
              borderRadius: 2,
              my: { xs: 1.25, md: 1.75 },
              background: `linear-gradient(90deg, transparent, ${primary}, transparent)`,
              opacity: 0.45,
              transition: (t) =>
                t.transitions.create(['width', 'opacity', 'background'], {
                  duration: t.transitions.duration.standard,
                  easing: HOVER_EASE,
                }),
            }}
          />

          <Stack spacing={0.75} alignItems="center" sx={{ width: '100%', flexShrink: 0 }}>
            {displayName ? (
              <Typography
                className="testimonial-name"
                sx={{
                  color: primary,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  fontSize: FLUID_FONT_SIZES.caption,
                  letterSpacing: { xs: 0.3, md: 0.6 },
                  lineHeight: 1.25,
                  transition: (t) =>
                    t.transitions.create(['letter-spacing', 'color'], {
                      duration: t.transitions.duration.standard,
                      easing: HOVER_EASE,
                    }),
                }}
              >
                {displayName}
              </Typography>
            ) : null}

            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              className="testimonial-verified"
              sx={{
                px: { xs: 0.75, md: 1.25 },
                py: 0.35,
                borderRadius: 10,
                bgcolor: (t) => alpha(t.palette.success.main, 0.08),
                transition: (t) =>
                  t.transitions.create(['background-color', 'transform'], {
                    duration: t.transitions.duration.standard,
                    easing: HOVER_EASE,
                  }),
              }}
            >
              <Iconify
                icon="solar:verified-check-bold"
                width={12}
                sx={{ color: 'success.main', width: { md: 14 }, height: { md: 14 } }}
              />
              <Typography
                sx={{
                  color: 'text.primary',
                  fontWeight: 600,
                  letterSpacing: { xs: 0.35, md: 0.5 },
                  textTransform: 'uppercase',
                  fontSize: FLUID_FONT_SIZES.overline,
                }}
              >
                Verified
                <Box component="span" sx={{ display: isSingleCardLayout ? 'inline' : 'none' }}>
                  {' '}
                  customer
                </Box>
              </Typography>
            </Stack>
          </Stack>
        </Stack>

        <Box
          className="testimonial-avatar-wrap"
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            transform: 'translate(-50%, 50%)',
            zIndex: 2,
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            p: { xs: '2px', md: '3px' },
            borderRadius: '50%',
            border: { xs: `2px solid ${primary}`, md: `3px solid ${primary}` },
            boxShadow: `0 6px 18px ${alpha(primary, 0.22)}`,
            transition: (t) =>
              t.transitions.create(['transform', 'box-shadow', 'border-color'], {
                duration: t.transitions.duration.standard,
                easing: HOVER_EASE,
              }),
          }}
        >
          <Avatar
            src={avatarSrc}
            alt={name}
            imgProps={{ loading: 'lazy' }}
            sx={{
              width: '100%',
              height: '100%',
              border: { xs: '2px solid', md: '3px solid' },
              borderColor: sectionBg,
              bgcolor: 'grey.200',
            }}
          />
          <Box
            aria-hidden
            className="testimonial-star-badge"
            sx={{
              position: 'absolute',
              right: -2,
              bottom: 4,
              width: { xs: 22, md: 26 },
              height: { xs: 22, md: 26 },
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: STAR_COLOR,
              border: `2px solid ${sectionBg}`,
              boxShadow: `0 2px 6px ${alpha(theme.palette.common.black, 0.12)}`,
              transition: (t) => t.transitions.create('transform', { duration: 300, easing: HOVER_EASE }),
            }}
          >
            <Iconify icon="solar:star-bold" width={14} sx={{ color: 'common.white' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
