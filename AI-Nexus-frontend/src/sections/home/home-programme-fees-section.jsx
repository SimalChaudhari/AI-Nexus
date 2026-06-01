import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { ViewHtmlContent } from 'src/components/html-content/view-html-content';
import { appSettingsService } from 'src/services/app-settings.service';
import {
  normalizeProgrammeFeesContent,
} from './programme-fees-defaults';
import {
  HOME_SECTION_HEADING_SX,
  PROGRAMME_FEES_HTML_SX,
  PROGRAMME_FEES_PRICE_NOTE_SX,
  PROGRAMME_FEES_PRICE_SX,
} from 'src/theme/home-typography';
import { FLUID_FONT_SIZES } from 'src/theme/fluid-typography';

function resolveAssetUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

function splitPricePair(rawPrice) {
  const value = String(rawPrice || '').trim();
  if (!value.includes('/')) return null;
  const [left, right] = value.split('/').map((part) => String(part || '').trim());
  if (!left || !right) return null;
  return { left, right };
}

// ----------------------------------------------------------------------

const RED = '#E32B24';
const SECTION_BG = 'linear-gradient(180deg, #f4f6f8 0%, #eceef1 48%, #f4f6f8 100%)';

// ----------------------------------------------------------------------

export function HomeProgrammeFeesSection() {
  const [content, setContent] = useState(() => normalizeProgrammeFeesContent(null));

  useEffect(() => {
    let active = true;
    appSettingsService
      .getProgrammeFeesContent()
      .then((remote) => {
        if (!active) return;
        setContent(normalizeProgrammeFeesContent(remote));
      })
      .catch(() => {
        if (active) setContent(normalizeProgrammeFeesContent(null));
      });
    return () => {
      active = false;
    };
  }, []);

  const tiers = (content.tiers || []).filter((t) => t.title || t.price);
  const agencyLogo = resolveAssetUrl(content.agency?.logoUrl);

  if (!content.heading && !tiers.length) return null;

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 4, md: 4 },
        bgcolor: 'grey.200',
        background: SECTION_BG,
      }}
    >
            <DashboardContent
          component={MotionViewport}
          sx={{
            width: 1,
            maxWidth: '100%',
            mx: 'auto',
            px: { xs: 1.25, sm: 2, md: 3, lg: 4 },
            pt: 0,
            pb: 0,
          }}
        >
        {content.heading ? (
          <Stack
            component={m.div}
            variants={varFade({ distance: 24 }).inUp}
            spacing={1.5}
            alignItems="flex-start"
            sx={{ mb: { xs: 3, md: 4 } }}
          >
            <Typography component="h2" sx={HOME_SECTION_HEADING_SX}>
              {content.heading}
            </Typography>

            <Box
              sx={{
                width: { xs: 72, sm: 88, md: 104 },
                height: 4,
                borderRadius: 999,
                background: (theme) =>
                  `linear-gradient(90deg, ${RED} 0%, ${theme.palette.secondary.main} 100%)`,
                boxShadow: `0 4px 12px ${alpha(RED, 0.28)}`,
              }}
            />
          </Stack>
        ) : null}

        <Card
          component={m.div}
          variants={varFade({ distance: 24 }).inUp}
          sx={{
            p: 2.5,
            borderRadius: 2,
            boxShadow: (theme) => theme.customShadows?.card,
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack spacing={0}>
            {tiers.map((tier, index) => {
              const splitPrice = splitPricePair(tier.price);
              return (
              <Box key={`fee-tier-${index}`}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 1.5, sm: 3 }}
                  alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                  justifyContent="space-between"
                  sx={{ py: { xs: 2, md: 2.5 } }}
                >
                  <Box sx={{ flex: 1, minWidth: 0, pr: { sm: 2 } }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
                      {tier.title}
                    </Typography>
                    {tier.linkLabel ? (
                      <Link
                        href={tier.linkHref || '#'}
                        underline="always"
                        sx={{
                          display: 'inline-block',
                          mt: 0.75,
                          color: 'primary.main',
                          fontWeight: 600,
                          fontSize: FLUID_FONT_SIZES.body2,
                        }}
                      >
                        {tier.linkLabel}
                      </Link>
                    ) : null}
                    {tier.description ? (
                      <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary', mt: 1, lineHeight: 1.65, maxWidth: 640 }}
                      >
                        {tier.description}
                      </Typography>
                    ) : null}
                  </Box>

                  <Box
                    sx={{
                      flexShrink: 0,
                      textAlign: { xs: 'left', sm: 'right' },
                      minWidth: 0,
                      width: { xs: '100%', sm: 'auto' },
                      maxWidth: '100%',
                    }}
                  >
                    {splitPrice ? (
                      <Typography
                        component="div"
                        sx={{
                          ...PROGRAMME_FEES_PRICE_SX,
                          color: 'error.main',
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            textDecoration: 'line-through',
                            textDecorationThickness: '2px',
                            textDecorationColor: 'common.black',
                            opacity: 0.95,
                          }}
                        >
                          {splitPrice.left}
                        </Box>
                        <Box component="span" sx={{ px: 0.6, color: 'error.main' }}>
                          /
                        </Box>
                        <Box component="span" sx={{ color: 'error.main' }}>
                          {splitPrice.right}
                        </Box>
                      </Typography>
                    ) : (
                      <Typography
                        component="div"
                        sx={{
                          ...PROGRAMME_FEES_PRICE_SX,
                          color: tier.priceVariant === 'default' ? 'text.primary' : 'primary.main',
                        }}
                      >
                        {tier.price}
                      </Typography>
                    )}
                    {tier.priceNote ? (
                      <Typography component="p" sx={PROGRAMME_FEES_PRICE_NOTE_SX}>
                        {tier.priceNote}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
                {index < tiers.length - 1 ? <Divider /> : null}
              </Box>
              );
            })}
          </Stack>

          <Stack spacing={2} sx={{ mt: 3 }}>
            <Box
              sx={(theme) => ({
                p: 2,
                borderRadius: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.background.neutral,
              })}
            >
              {content.fundingPartnersHeading ? (
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  {content.fundingPartnersHeading}
                </Typography>
              ) : null}
              <ViewHtmlContent
                html={content.fundingPartnersBody}
                sx={{
                  color: 'text.primary',
                  ...PROGRAMME_FEES_HTML_SX,
                  '& em': { color: 'primary.main', fontStyle: 'italic' },
                  '& a': { color: 'primary.main', fontWeight: 600, fontSize: 'inherit' },
                }}
              />
            </Box>

            <Box
              sx={(theme) => ({
                p: 2,
                borderRadius: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.background.neutral,
              })}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                {agencyLogo ? (
                  <Box
                    component="img"
                    src={agencyLogo}
                    alt=""
                    sx={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }}
                  />
                ) : null}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
                    {content.agency?.name}
                  </Typography>
                  {content.agency?.tagline ? (
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 0.25 }}
                    >
                      {content.agency.tagline}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Card>
      </DashboardContent>
    </Box>
  );
}
