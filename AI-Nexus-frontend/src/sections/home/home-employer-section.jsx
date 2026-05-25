import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { alpha } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';

import { resolveEmployerContent, hasEmployerContent } from './employer-defaults';

const CTA_LIME = '#d4f938';
const CTA_LIME_HOVER = '#c5ea2e';

function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || '').trim());
}

function normalizeAppPath(href) {
  const h = String(href || '').trim();
  if (!h || isExternalHref(h)) return h;
  return h.startsWith('/') ? h : `/${h}`;
}

// ----------------------------------------------------------------------

export function HomeEmployerSection() {
  const [content, setContent] = useState(() => resolveEmployerContent(null));

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        setContent(resolveEmployerContent(settings?.homeEmployerContent));
      })
      .catch(() => {
        if (active) setContent(resolveEmployerContent(null));
      });
    return () => {
      active = false;
    };
  }, []);

  const benefits = (content.benefits || []).filter(
    (row) => String(row?.title || '').trim() || String(row?.description || '').trim()
  );
  const showCta = Boolean(content.ctaLabel?.trim() && content.ctaHref?.trim());
  const ctaHref = String(content.ctaHref || '').trim();

  if (!hasEmployerContent(content)) return null;

  const ctaButton = showCta ? (
    isExternalHref(ctaHref) ? (
      <Button
        component="a"
        href={ctaHref}
        target="_blank"
        rel="noopener noreferrer"
        variant="contained"
        size="large"
        sx={{
          bgcolor: CTA_LIME,
          color: 'grey.900',
          fontWeight: 700,
          px: 3,
          py: 1.35,
          '&:hover': { bgcolor: CTA_LIME_HOVER },
        }}
      >
        {content.ctaLabel}
      </Button>
    ) : (
      <Button
        component={RouterLink}
        href={normalizeAppPath(ctaHref)}
        variant="contained"
        size="large"
        sx={{
          bgcolor: CTA_LIME,
          color: 'grey.900',
          fontWeight: 700,
          px: 3,
          py: 1.35,
          '&:hover': { bgcolor: CTA_LIME_HOVER },
        }}
      >
        {content.ctaLabel}
      </Button>
    )
  ) : null;

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 5, md: 7 },
        bgcolor: 'grey.200',
      }}
    >
      <DashboardContent component={MotionViewport}>
        <Stack spacing={{ xs: 3, md: 4 }} alignItems="center">
          {(content.heading || content.subtitle) && (
            <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 760, textAlign: 'center' }}>
              {content.heading ? (
                <Typography
                  component="h2"
                  variants={varFade({ distance: 24 }).inUp}
                  sx={{
                    color: 'primary.main',
                    fontWeight: 700,
                    fontSize: { xs: '1.35rem', sm: '1.5rem', md: '1.75rem' },
                    lineHeight: 1.25,
                  }}
                >
                  {content.heading}
                </Typography>
              ) : null}
              {content.subtitle ? (
                <RichTextContent
                  html={content.subtitle}
                  variants={varFade({ distance: 24 }).inUp}
                  sx={{
                    color: 'text.secondary',
                    typography: 'body1',
                    lineHeight: 1.65,
                    mx: 'auto',
                    maxWidth: 640,
                  }}
                />
              ) : null}
            </Stack>
          )}

          {benefits.length > 0 ? (
            <Card
              component={Box}
              variants={varFade({ distance: 24 }).inUp}
              sx={{
                width: '100%',
                p: { xs: 2, sm: 3, md: 4 },
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: (theme) => theme.customShadows?.card,
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            >
              <Grid container spacing={{ xs: 2, md: 3 }}>
                {benefits.map((row, index) => (
                  <Grid key={`employer-benefit-${index}`} xs={12} sm={6} lg={benefits.length <= 3 ? 4 : 3}>
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="flex-start"
                      sx={{
                        height: 1,
                        p: { xs: 1.5, md: 2 },
                        borderRadius: 1.5,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                      }}
                    >
                      {row.icon ? (
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                          }}
                        >
                          <Iconify icon={row.icon} width={22} />
                        </Box>
                      ) : null}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        {row.title ? (
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.35 }}>
                            {String(row.title).trim()}
                          </Typography>
                        ) : null}
                        {row.description ? (
                          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            {String(row.description).trim()}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Card>
          ) : null}

          {showCta ? (
            <Box variants={varFade({ distance: 24 }).inUp} sx={{ pt: 0.5 }}>
              {ctaButton}
            </Box>
          ) : null}
        </Stack>
      </DashboardContent>
    </Box>
  );
}
