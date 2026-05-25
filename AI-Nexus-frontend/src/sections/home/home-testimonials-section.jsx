import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, useTheme } from '@mui/material/styles';

import { RichTextContent } from 'src/components/html-content';
import { Iconify } from 'src/components/iconify';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  Carousel,
  useCarousel,
  CarouselProgressBar,
  carouselBreakpoints,
} from 'src/components/carousel';
import { appSettingsService } from 'src/services/app-settings.service';

import { resolveTestimonialsContent, hasTestimonialsContent } from './testimonials-defaults';
import { HomeTestimonialQuoteCard } from './home-testimonial-quote-card';

const SECTION_BG = '#F4F6F8';
const STAR_COLOR = '#F5A623';
const NAV_BTN_SIZE = { xs: 36, sm: 40, md: 48, lg: 52 };
const CARD_GAP = { xs: '12px', sm: '16px', md: '24px', lg: '32px', xl: '36px' };
const CAROUSEL_MAX_WIDTH = 1320;
/** Viewport width (px) at or below: one card; above: at least two until md. */
const MOBILE_ONE_CARD_MAX_PX = 375;

function splitSectionHeading(heading) {
  const text = String(heading || '').trim();
  if (!text) return { lead: '', main: '' };
  const words = text.split(/\s+/);
  if (words.length <= 2) return { lead: text, main: '' };
  return {
    lead: words.slice(0, 2).join(' '),
    main: words.slice(2).join(' ').toUpperCase(),
  };
}

function StatPill({ icon, label }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.75}
      sx={{
        px: 1.75,
        py: 0.85,
        borderRadius: 10,
        bgcolor: 'background.paper',
        border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.14)}`,
        boxShadow: (t) => `0 2px 8px ${alpha(t.palette.grey[500], 0.08)}`,
      }}
    >
      {icon}
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: 'text.primary',
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
          whiteSpace: { xs: 'normal', sm: 'nowrap' },
          textAlign: { xs: 'center', sm: 'left' },
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function HomeTestimonialsSection() {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const primaryDark = theme.palette.primary.dark;

  const [content, setContent] = useState(() => resolveTestimonialsContent(null));

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        setContent(resolveTestimonialsContent(settings?.homeTestimonialsContent));
      })
      .catch(() => {
        if (active) setContent(resolveTestimonialsContent(null));
      });
    return () => {
      active = false;
    };
  }, []);

  const testimonials = (content.testimonials || []).filter(
    (row) => String(row?.quote || '').trim() || String(row?.name || '').trim()
  );

  const isSingleCardLayout = useMediaQuery(
    `(max-width:${MOBILE_ONE_CARD_MAX_PX}px)`,
    { noSsr: true }
  );
  const isSideNavLayout = useMediaQuery(theme.breakpoints.up('sm'), { noSsr: true });

  const carousel = useCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    slidesToShow: isSingleCardLayout ? 1 : { xs: 2, md: 3, lg: 4, xl: 4 },
    slideSpacing: CARD_GAP.xs,
    breakpoints: {
      [carouselBreakpoints.sm]: { slideSpacing: CARD_GAP.sm },
      [carouselBreakpoints.md]: { slideSpacing: CARD_GAP.md },
      [carouselBreakpoints.lg]: { slideSpacing: CARD_GAP.lg },
      [carouselBreakpoints.xl]: { slideSpacing: CARD_GAP.xl },
    },
  });

  useEffect(() => {
    if (!carousel.mainApi) return undefined;
    carousel.mainApi.reInit();
    return undefined;
  }, [isSingleCardLayout, carousel.mainApi]);

  if (!hasTestimonialsContent(content)) return null;

  const { lead, main } = splitSectionHeading(content.heading);
  const subtitleHtml = String(content.subtitle || '');
  const hasSubtitle = !isEffectivelyEmptyHtml(subtitleHtml);
  const snapCount = carousel.dots.scrollSnaps?.length || 0;
  const currentSlide = snapCount > 0 ? carousel.dots.selectedIndex + 1 : 0;
  const showNav = testimonials.length > 1;
  const reviewCount = testimonials.length;

  const navButtonSx = {
    width: NAV_BTN_SIZE,
    height: NAV_BTN_SIZE,
    color: 'common.white',
    bgcolor: 'primary.main',
    boxShadow: (t) => `0 6px 20px ${alpha(t.palette.primary.main, 0.35)}`,
    transition: (t) =>
      t.transitions.create(['transform', 'background-color', 'box-shadow'], {
        duration: t.transitions.duration.shorter,
      }),
    '&:hover': {
      bgcolor: 'primary.dark',
      transform: 'scale(1.06)',
    },
    '&.Mui-disabled': {
      bgcolor: (t) => alpha(t.palette.primary.main, 0.35),
      color: 'common.white',
    },
  };

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        py: { xs: 6, sm: 8, md: 12 },
        // background: `linear-gradient(180deg, ${SECTION_BG} 0%, ${alpha(primary, 0.04)} 50%, ${SECTION_BG} 100%)`,
        overflow: 'visible',
      }}
    >
      <Box
        aria-hidden
        sx={{
          pointerEvents: 'none',
          position: 'absolute',
          top: -100,
          right: -80,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(primary, 0.1)} 0%, transparent 68%)`,
        }}
      />

      <DashboardContent
        component={MotionViewport}
        disablePadding
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '100%',
          px: { xs: 1.5, sm: 2.5, md: 4 },
        }}
      >
        <Stack spacing={{ xs: 5, md: 7 }} alignItems="center" sx={{ width: '100%' }}>
          <Stack spacing={2.5} alignItems="center" sx={{ maxWidth: 720, textAlign: 'center', px: 1 }}>

            {(lead || main) && (
              <Box component="h2" variants={varFade({ distance: 20 }).inUp} sx={{ m: 0, lineHeight: 1.1 }}>
                {lead ? (
                  <Typography
                    component="span"
                    sx={{
                      display: 'block',
                      fontFamily: '"Segoe Script", "Brush Script MT", cursive',
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '2.85rem' },
                      fontWeight: 400,
                      color: 'text.primary',
                      mb: 0.5,
                    }}
                  >
                    {lead}
                  </Typography>
                ) : null}
                {main ? (
                  <Typography
                    component="span"
                    sx={{
                      display: 'block',
                      fontWeight: 800,
                      letterSpacing: { xs: 0.5, md: 1 },
                      fontSize: { xs: '1.75rem', sm: '2.2rem', md: '2.65rem' },
                      background: `linear-gradient(135deg, ${primaryDark} 0%, ${primary} 100%)`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    {main}
                  </Typography>
                ) : (
                  <Typography
                    component="span"
                    sx={{ display: 'block', fontWeight: 800, fontSize: '2rem', color: 'primary.main' }}
                  >
                    {lead}
                  </Typography>
                )}
              </Box>
            )}

            {hasSubtitle ? (
              <RichTextContent
                html={subtitleHtml}
                variants={varFade({ distance: 14 }).inUp}
                sx={{
                  typography: 'body1',
                  fontSize: '1rem',
                  lineHeight: 1.8,
                  color: 'text.secondary',
                  maxWidth: 560,
                  textAlign: 'center',
                  mx: 'auto',
                  overflow: 'visible',
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

            {reviewCount > 0 ? (
              <Stack
                direction="row"
                spacing={1.5}
                flexWrap="wrap"
                justifyContent="center"
                variants={varFade({ distance: 10 }).inUp}
              >
                <StatPill
                  icon={<Iconify icon="solar:star-bold" width={18} sx={{ color: STAR_COLOR }} />}
                  label="4.9 average rating"
                />
                <StatPill
                  icon={<Iconify icon="solar:users-group-rounded-bold" width={18} sx={{ color: 'primary.main' }} />}
                  label={`${reviewCount}+ verified reviews`}
                />
              </Stack>
            ) : null}
          </Stack>

          {testimonials.length > 0 ? (
            <Stack spacing={3.5} sx={{ width: '100%' }}>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: CAROUSEL_MAX_WIDTH,
                  mx: 'auto',
                  px: showNav ? { xs: 0, sm: 5, md: 7 } : { xs: 0, sm: 0 },
                }}
              >
                {showNav ? (
                  <>
                    <IconButton
                      onClick={carousel.arrows.onClickPrev}
                      disabled={carousel.arrows.disablePrev}
                      aria-label="Previous testimonials"
                      sx={{
                        ...navButtonSx,
                        display: isSideNavLayout ? 'inline-flex' : 'none',
                        position: 'absolute',
                        left: { sm: 0, md: -4 },
                        top: '40%',
                        transform: 'translateY(-50%)',
                        zIndex: 5,
                      }}
                    >
                      <Iconify icon="eva:arrow-ios-back-fill" width={24} />
                    </IconButton>
                    <IconButton
                      onClick={carousel.arrows.onClickNext}
                      disabled={carousel.arrows.disableNext}
                      aria-label="Next testimonials"
                      sx={{
                        ...navButtonSx,
                        display: isSideNavLayout ? 'inline-flex' : 'none',
                        position: 'absolute',
                        right: { sm: 0, md: -4 },
                        top: '40%',
                        transform: 'translateY(-50%)',
                        zIndex: 5,
                      }}
                    >
                      <Iconify icon="eva:arrow-ios-forward-fill" width={24} />
                    </IconButton>
                  </>
                ) : null}

                <Box
                  sx={{
                    width: '100%',
                    overflow: 'hidden',
                    pb: { xs: 4.5, sm: 5.5, md: 6 },
                    pt: { xs: 1, sm: 2 },
                    px: 0.5,
                  }}
                >
                  <Carousel
                    carousel={carousel}
                    sx={{ width: '100%' }}
                    slotProps={{
                      container: {
                        sx: {
                          alignItems: isSingleCardLayout ? 'flex-start' : 'stretch',
                        },
                      },
                      slide: { sx: { display: 'flex', alignItems: 'stretch' } },
                    }}
                  >
                    {testimonials.map((row, index) => (
                      <Box
                        key={row?.id ? `testimonial-slide-${row.id}` : `testimonial-slide-${row.name}-${index}`}
                        sx={{
                          flex: 1,
                          width: '100%',
                          minWidth: 0,
                          height: isSingleCardLayout ? 'auto' : '100%',
                          display: 'flex',
                          alignItems: 'stretch',
                          py: 1.5,
                          px: 0.25,
                        }}
                      >
                        <HomeTestimonialQuoteCard item={row} sectionBg={SECTION_BG} />
                      </Box>
                    ))}
                  </Carousel>
                </Box>
              </Box>

              {showNav && snapCount > 1 ? (
                <Stack spacing={2} sx={{ width: '100%' }}>
                  <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="center"
                    sx={{ display: isSideNavLayout ? 'none' : 'flex' }}
                  >
                    <IconButton
                      onClick={carousel.arrows.onClickPrev}
                      disabled={carousel.arrows.disablePrev}
                      aria-label="Previous testimonials"
                      sx={navButtonSx}
                    >
                      <Iconify icon="eva:arrow-ios-back-fill" width={22} />
                    </IconButton>
                    <IconButton
                      onClick={carousel.arrows.onClickNext}
                      disabled={carousel.arrows.disableNext}
                      aria-label="Next testimonials"
                      sx={navButtonSx}
                    >
                      <Iconify icon="eva:arrow-ios-forward-fill" width={22} />
                    </IconButton>
                  </Stack>

                  <Stack
                    alignItems="center"
                    spacing={1.25}
                    sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}
                  >
                  <CarouselProgressBar
                    value={carousel.progress.value}
                    sx={{
                      width: '100%',
                      height: 5,
                      borderRadius: 3,
                      color: 'primary.main',
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                    {currentSlide} / {snapCount}
                  </Typography>
                  </Stack>
                </Stack>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </DashboardContent>
    </Box>
  );
}
