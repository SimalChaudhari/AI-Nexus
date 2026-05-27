import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';

import {
  hasFundingEligibilityContent,
  resolveFundingEligibilityContent,
} from './funding-eligibility-defaults';

// ----------------------------------------------------------------------

const HEADER_CONTENT_PX = { xs: 0, sm: 2, md: 4, lg: 6 };
const SECTION_MAX_WIDTH = 1200;

const EYEBROW_GRADIENT =
  'linear-gradient(90deg, #2563eb 0%, #7c3aed 48%, #eab308 100%)';

const ICON_GRADIENT = 'linear-gradient(135deg, #56c7da 0%, #fcd60b 100%)';

function splitEyebrow(text) {
  const raw = String(text || '').trim();
  if (!raw) return { lead: '', accent: '' };
  const idx = raw.toUpperCase().indexOf('ELIGIBILITY');
  if (idx > 0) {
    return {
      lead: raw.slice(0, idx).trim(),
      accent: raw.slice(idx).trim(),
    };
  }
  const amp = raw.indexOf('&');
  if (amp >= 0) {
    return { lead: raw.slice(0, amp + 1).trim(), accent: raw.slice(amp + 1).trim() };
  }
  return { lead: raw, accent: '' };
}

function EligibilityCard({ card }) {
  const theme = useTheme();
  const title = String(card?.title || '').trim();
  const descriptionHtml = String(card?.description || '');
  const hasDescription = !isEffectivelyEmptyHtml(descriptionHtml);
  const icon = String(card?.icon || '').trim() || 'solar:flag-bold-duotone';

  if (!title && !hasDescription) return null;

  return (
    <Stack
      component={m.div}
      variants={varFade({ distance: 18 }).inUp}
      spacing={2}
      sx={{
        height: 1,
        p: { xs: 2.5, md: 3 },
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.customShadows?.z1 || theme.shadows[1],
        transition: theme.transitions.create(['box-shadow', 'transform', 'border-color'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: alpha(theme.palette.secondary.main, 0.35),
          boxShadow: theme.customShadows?.z8 || theme.shadows[8],
        },
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: ICON_GRADIENT,
          boxShadow: `0 8px 20px ${alpha('#56c7da', 0.35)}`,
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'common.white',
          }}
        >
          <Iconify
            icon={icon}
            width={26}
            sx={{
              '--iconify-color-1': theme.palette.secondary.main,
              '--iconify-color-2': theme.palette.primary.main,
            }}
          />
        </Box>
      </Box>

      <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
        {title ? (
          <Typography
            variant="subtitle1"
            sx={{
              m: 0,
              fontWeight: 700,
              color: 'secondary.dark',
              lineHeight: 1.35,
              fontSize: { xs: '1rem', md: '1.0625rem' },
            }}
          >
            {title}
          </Typography>
        ) : null}

        {hasDescription ? (
          <RichTextContent
            html={descriptionHtml}
            sx={{
              typography: 'body2',
              color: 'text.secondary',
              lineHeight: 1.65,
              fontSize: { xs: '0.8125rem', md: '0.875rem' },
              '& p': { m: 0, mb: 0.5, '&:last-child': { mb: 0 } },
              '& strong, & b': { fontWeight: 600, color: 'text.primary' },
            }}
          />
        ) : null}
      </Stack>
    </Stack>
  );
}

export function HomeFundingEligibilitySection() {
  const theme = useTheme();
  const [content, setContent] = useState(() => resolveFundingEligibilityContent(null));

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        setContent(resolveFundingEligibilityContent(settings?.homeFundingEligibilityContent));
      })
      .catch(() => {
        if (active) setContent(resolveFundingEligibilityContent(null));
      });
    return () => {
      active = false;
    };
  }, []);

  if (!hasFundingEligibilityContent(content)) return null;

  const items = (content.items || []).filter(
    (r) => String(r?.title || '').trim() || !isEffectivelyEmptyHtml(r?.description)
  );

  const eyebrow = String(content.eyebrow || '').trim();
  const heading = String(content.heading || '').trim();
  const { lead: eyebrowLead, accent: eyebrowAccent } = splitEyebrow(eyebrow);
  const useSplitEyebrow = Boolean(eyebrowLead || eyebrowAccent);

  return (
    <Box
      id="funding-eligibility"
      component="section"
      sx={{
        py: { xs: 5, md: 7 },
        bgcolor: 'secondary.100',
      }}
    >
      <DashboardContent
        component={MotionViewport}
        disablePadding
        sx={{
          width: 1,
          maxWidth: '100%',
          px: HEADER_CONTENT_PX,
        }}
      >
        <Stack
          spacing={{ xs: 3.5, md: 4.5 }}
          alignItems="center"
          sx={{
            width: 1,
            maxWidth: SECTION_MAX_WIDTH,
            mx: 'auto',
          }}
        >
          {(eyebrow || heading) && (
            <Stack
              spacing={1}
              alignItems="center"
              sx={{ textAlign: 'center', maxWidth: 720, px: 1 }}
            >
              {eyebrow ? (
                <Typography
                  component="p"
                  variants={varFade({ distance: 12 }).inUp}
                  sx={{
                    m: 0,
                    fontWeight: 800,
                    letterSpacing: { xs: 1.5, md: 2 },
                    textTransform: 'uppercase',
                    fontSize: { xs: '0.65rem', md: '0.72rem' },
                    ...(useSplitEyebrow
                      ? {}
                      : {
                          background: EYEBROW_GRADIENT,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          color: 'transparent',
                        }),
                  }}
                >
                  {useSplitEyebrow ? (
                    <>
                      {eyebrowLead ? (
                        <Box component="span" sx={{ color: 'secondary.main' }}>
                          {eyebrowLead}
                          {eyebrowAccent ? ' ' : ''}
                        </Box>
                      ) : null}
                      {eyebrowAccent ? (
                        <Box component="span" sx={{ color: 'warning.main' }}>
                          {eyebrowAccent}
                        </Box>
                      ) : null}
                    </>
                  ) : (
                    eyebrow
                  )}
                </Typography>
              ) : null}

              {heading ? (
                <Typography
                  component="h2"
                  variants={varFade({ distance: 16 }).inUp}
                  sx={{
                    m: 0,
                    fontWeight: 700,
                    fontSize: { xs: '1.6rem', sm: '1.9rem', md: '2.15rem' },
                    lineHeight: 1.2,
                    color: 'secondary.dark',
                    letterSpacing: -0.3,
                  }}
                >
                  {heading}
                </Typography>
              ) : null}
            </Stack>
          )}

          {items.length > 0 ? (
            <Box
              component={m.div}
              variants={varFade({ distance: 22 }).inUp}
              sx={{
                width: 1,
                p: { xs: 2, sm: 2.5, md: 3.5 },
                borderRadius: { xs: 2.5, md: 3 },
                bgcolor: 'common.white',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: `0 20px 48px ${alpha(theme.palette.secondary.main, 0.08)}`,
              }}
            >
              <Grid container spacing={{ xs: 2, md: 2.5 }}>
                {items.map((card, index) => (
                  <Grid key={card.id || `fe-item-${index}`} xs={12} sm={6} md={4}>
                    <EligibilityCard card={card} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : null}
        </Stack>
      </DashboardContent>
    </Box>
  );
}
