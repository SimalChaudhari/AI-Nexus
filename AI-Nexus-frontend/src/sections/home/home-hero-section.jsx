import { m } from 'framer-motion';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { RouterLink } from 'src/routes/components';
import { appSettingsService } from 'src/services/app-settings.service';

import { HOME_HERO_DATA } from './home-hero-content';

// ----------------------------------------------------------------------

const HERO_BG_STORAGE_KEY = 'public-home-hero-bg-url';

const DEFAULT_HERO_BACKGROUND_URL =
  'https://readdy.ai/api/search-image?query=futuristic%20AI%20technology%20network%20with%20glowing%20neural%20connections%2C%20holographic%20interfaces%2C%20and%20digital%20data%20streams%20in%20a%20modern%20tech%20environment%20with%20soft%20blue%20and%20yellow%20lighting%2C%20minimalist%20clean%20background%20perfect%20for%20text%20overlay&width=1920&height=1080&seq=hero-ai-nexus&orientation=landscape';

const CTA_LIME = '#d4f938';
const CTA_LIME_HOVER = '#c5ea2e';

/** Strict spacing tokens (fixed values for exact composition) */
const heroInsetBottom = { xs: 16, sm: 24, md: 32 };

export function HomeHeroSection() {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_HERO_BACKGROUND_URL;
    }
    return window.localStorage.getItem(HERO_BG_STORAGE_KEY) || DEFAULT_HERO_BACKGROUND_URL;
  });

  useEffect(() => {
    let active = true;

    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        const next =
          settings.homeHeroImageUrl?.trim() || DEFAULT_HERO_BACKGROUND_URL;
        setBackgroundImageUrl(next);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(HERO_BG_STORAGE_KEY, next);
        }
      })
      .catch(() => {
        if (!active) return;
        setBackgroundImageUrl(DEFAULT_HERO_BACKGROUND_URL);
      });

    return () => {
      active = false;
    };
  }, []);

  const { headline, description, cta, event, stats } = HOME_HERO_DATA;

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        alignSelf: 'stretch',
        overflow: 'hidden',
        bgcolor: '#05070c',
        /*
         * Mobile: banner starts below fixed header (dark strip matches section bg).
         * Desktop: no section offset so image can sit under the header; text uses inner padding only.
         */
        paddingTop: {
          xs: 'var(--layout-header-mobile-height, 84px)',
          md: 0,
        },
      }}
    >
      {/*
        Framed hero: fixed aspect + object-fit cover so the visible crop and overlay stay aligned on every viewport
        (avoids tiny mobile bands where centered copy leaves the “designed” region of the artwork).
      */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          aspectRatio: { xs: '16 / 9', sm: '16 / 9' },
          minHeight: { xs: 'clamp(460px, 68vh, 560px)', sm: 0 },
          maxHeight: { sm: 'min(88vh, 960px)' },
        }}
      >
        <Box
          component="img"
          src={backgroundImageUrl}
          alt=""
          loading="eager"
          decoding="async"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />

        {/* Overlay exactly matches visible hero frame */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            boxSizing: 'border-box',
            minHeight: 0,
          }}
        >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background:
              'linear-gradient(180deg, rgba(8, 10, 14, 0.55) 0%, rgba(8, 10, 14, 0.72) 45%, rgba(8, 10, 14, 0.85) 100%)',
            pointerEvents: 'none',
          }}
        />

        <DashboardContent
          component={MotionViewport}
          disableAnimate={false}
          sx={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            width: '100%',
            maxWidth: '100%',
            minHeight: 0,
            maxHeight: '100%',
            height: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            overflowY: 'hidden',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'auto',

            pt: {
              xs: 'calc(var(--layout-header-desktop-height, 84px) + 24px)',
              sm: '40px',
              md: 'calc(var(--layout-header-desktop-height, 104px) + 48px)',
            },
            pb: heroInsetBottom,
          }}
        >
          <Stack
            spacing={0}
            sx={{
              width: '100%',
              maxWidth: { xs: '100%', md: '640px' },
              alignSelf: 'flex-start',
              gap: { xs: '12px', sm: '20px', md: '24px' },
            }}
          >
            <Box component={m.div} variants={varFade().inUp}>
              <Typography
                variant="h1"
                sx={{
                  color: 'common.white',
                  fontWeight: 800,
                  fontSize: {
                    xs: '1.3rem',
                    sm: '2rem',
                    md: '2.45rem',
                    lg: '2.95rem',
                    xl: '3.2rem',
                  },
                  lineHeight: { xs: 1.18, md: 1.1 },
                  letterSpacing: { xs: '-0.01em', md: '-0.02em' },
                  textWrap: 'balance',
                  maxWidth: { xs: '100%', sm: '24ch', md: '22ch', lg: '24ch' },
                  overflowWrap: 'anywhere',
                }}
              >
                {headline}
              </Typography>
            </Box>

            <Box component={m.div} variants={varFade().inUp}>
              <Typography
                variant="h6"
                component="p"
                sx={{
                  color: alpha('#fff', 0.72),
                  fontWeight: 400,
                  fontSize: {
                    xs: '0.84rem',
                    sm: '1rem',
                    md: '1.05rem',
                    lg: '1.125rem',
                  },
                  lineHeight: { xs: 1.6, md: 1.65 },
                  maxWidth: { xs: '100%', md: '50ch', lg: '54ch' },
                  overflowWrap: 'anywhere',
                }}
              >
                {description}
              </Typography>
            </Box>

            <Stack
              component={m.div}
              variants={varFade().inUp}
              direction="row"
              alignItems="right"
              flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
              sx={{
                gap: { xs: '10px', sm: '16px', md: '24px' },
                rowGap: '8px',
                width: { xs: 'fit-content', sm: 'fit-content' },
                maxWidth: '100%',
              }}
            >
              <Button
                component={RouterLink}
                href={cta.href}
                variant="contained"
                size="large"
                sx={{
                  flexShrink: 0,
                  alignSelf: { xs: 'center', sm: 'auto' },
                  mx: { xs: 'auto', sm: 0 },
                  py: { xs: 1, sm: 1.75 },
                  px: { xs: 2, sm: 3.5 },
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: { xs: '0.78rem', sm: '0.95rem' },
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  color: 'grey.900',
                  bgcolor: CTA_LIME,
                  boxShadow: 'none',
                  width: 'auto',
                  maxWidth: { xs: '100%', sm: 'none' },
                  '&:hover': {
                    bgcolor: CTA_LIME_HOVER,
                    boxShadow: 'none',
                  },
                }}
              >
                {cta.label}
              </Button>

              <Divider
                orientation="vertical"
                flexItem
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  borderColor: alpha('#fff', 0.25),
                  alignSelf: 'stretch',
                  my: 0.5,
                }}
              />

              <Stack
                direction="row"
                alignItems="center"
                flexWrap="wrap"
                sx={{
                  gap: { xs: '12px', md: '28px' },
                  rowGap: '6px',
                  justifyContent: { xs: 'center', sm: 'flex-start' },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: alpha('#fff', 0.55),
                      display: 'block',
                      mb: 0.25,
                      lineHeight: 1.2,
                      fontSize: { xs: '0.6rem', sm: '0.75rem' },
                    }}
                  >
                    {event.startDateLabel}
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: 'common.white',
                      fontWeight: 700,
                      fontSize: { xs: '0.78rem', md: '0.95rem', lg: '1rem' },
                      lineHeight: 1.3,
                    }}
                  >
                    {event.startDate}
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: alpha('#fff', 0.55),
                      display: 'block',
                      mb: 0.25,
                      lineHeight: 1.2,
                      fontSize: { xs: '0.6rem', sm: '0.75rem' },
                    }}
                  >
                    {event.startTimeLabel}
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: 'common.white',
                      fontWeight: 700,
                      fontSize: { xs: '0.78rem', md: '0.95rem', lg: '1rem' },
                      lineHeight: 1.3,
                    }}
                  >
                    {event.startTime}
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            <Box
              sx={{
                width: { xs: '100%', md: '620px' },
                pt: { xs: '4px', sm: '12px', md: '16px' },
                mt: { xs: '2px', sm: '8px', md: '12px' },
                display: 'flex',
                flexDirection: 'row',
                gap: { xs: 0, sm: 0 },
              }}
            >
              {stats.map((item, index) => (
                <Box
                  key={item.label}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    py: { xs: 0.5, sm: 0 },
                    px: { xs: index === 0 ? 0 : 1.5, sm: index === 0 ? 0 : 4 },
                    textAlign: { xs: 'center', sm: 'left' },
                    borderTop: 'none',
                    borderLeft:
                      index > 0
                        ? { xs: `1px solid ${alpha('#fff', 0.2)}`, sm: `1px solid ${alpha('#fff', 0.2)}` }
                        : 'none',
                  }}
                >
                  <Typography
                    variant="h3"
                    sx={{
                      color: 'common.white',
                      fontWeight: 800,
                      fontSize: {
                        xs: '1.05rem',
                        sm: '1.45rem',
                        md: '1.7rem',
                        lg: '1.95rem',
                      },
                      lineHeight: 1.2,
                    }}
                  >
                    {item.value}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: alpha('#fff', 0.55),
                      mt: 0.5,
                      fontWeight: 500,
                      fontSize: { xs: '0.72rem', sm: '0.875rem' },
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Stack>
        </DashboardContent>
        </Box>
      </Box>
    </Box>
  );
}
