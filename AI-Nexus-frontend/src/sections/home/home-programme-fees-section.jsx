import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
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
import { normalizeProgrammeFeesContent } from './programme-fees-defaults';
import {
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
const CARD_SHELL_SX = {
  borderRadius: '20px',
  bgcolor: 'background.paper',
  border: (theme) => `1px solid ${theme.palette.divider}`,
  boxShadow: (theme) =>
    theme.palette.mode === 'dark'
      ? theme.customShadows?.card
      : '0 8px 20px rgba(15, 23, 42, 0.06)',
};
const COMPACT_PRICE_SX = {
  ...PROGRAMME_FEES_PRICE_SX,
  fontSize: FLUID_FONT_SIZES.h5,
  lineHeight: 1.3,
  fontWeight: 700,
};
const COMPACT_PRICE_NOTE_SX = {
  ...PROGRAMME_FEES_PRICE_NOTE_SX,
  fontSize: FLUID_FONT_SIZES.caption,
  mt: 0.35,
};
const INNER_PANEL_SX = (theme) => ({
  width: 1,
  flex: 1,
  minWidth: 0,
  p: { xs: 1.5, sm: 2 },
  borderRadius: '14px',
  border: `1px solid ${theme.palette.divider}`,
  bgcolor: theme.palette.background.neutral,
});
const SECTION_TITLE_SX = {
  m: 0,
  fontWeight: 700,
  fontSize: FLUID_FONT_SIZES.h5,
  lineHeight: 1.25,
  color: 'secondary.main',
};

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
  const hasFundingPartners =
    Boolean(String(content.fundingPartnersHeading || '').trim()) ||
    Boolean(String(content.fundingPartnersBody || '').trim());
  const hasAgency =
    Boolean(agencyLogo) ||
    Boolean(String(content.agency?.name || '').trim()) ||
    Boolean(String(content.agency?.tagline || '').trim());

  if (!content.heading && !tiers.length) return null;

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 2, md: 2.5 },
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
            spacing={0.75}
            alignItems="flex-start"
            sx={{ mb: { xs: 2, md: 2.5 } }}
          >
            <Typography component="h2" sx={SECTION_TITLE_SX}>
              {content.heading}
            </Typography>

            <Box
              sx={{
                width: { xs: 56, sm: 64 },
                height: 3,
                borderRadius: 999,
                background: (theme) =>
                  `linear-gradient(90deg, ${RED} 0%, ${theme.palette.secondary.main} 100%)`,
                boxShadow: `0 2px 8px ${alpha(RED, 0.22)}`,
              }}
            />
          </Stack>
        ) : null}

        <Box
          component={m.div}
          variants={varFade({ distance: 24 }).inUp}
          sx={{
            ...CARD_SHELL_SX,
            p: { xs: 2, sm: 2.5 },
          }}
        >
          {tiers.length > 0 ? (
            <Stack spacing={0}>
              {tiers.map((tier, index) => {
                const splitPrice = splitPricePair(tier.price);
                return (
                  <Box key={`fee-tier-${index}`}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={{ xs: 1, sm: 2 }}
                      alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                      justifyContent="space-between"
                      sx={{ py: { xs: 1.25, md: 1.5 } }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0, pr: { sm: 1.5 } }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            lineHeight: 1.4,
                            fontSize: FLUID_FONT_SIZES.body1,
                          }}
                        >
                          {tier.title}
                        </Typography>
                        {tier.linkLabel ? (
                          <Link
                            href={tier.linkHref || '#'}
                            underline="always"
                            sx={{
                              display: 'inline-block',
                              mt: 0.5,
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
                            sx={{
                              color: 'text.secondary',
                              mt: 0.75,
                              lineHeight: 1.55,
                              maxWidth: 640,
                              fontSize: FLUID_FONT_SIZES.body2,
                            }}
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
                              ...COMPACT_PRICE_SX,
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
                          ...COMPACT_PRICE_SX,
                          color: tier.priceVariant === 'default' ? 'text.primary' : 'primary.main',
                        }}
                          >
                            {tier.price}
                          </Typography>
                        )}
                        {tier.priceNote ? (
                          <Typography component="p" sx={COMPACT_PRICE_NOTE_SX}>
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
          ) : null}

          {(hasFundingPartners || hasAgency) && (
            <Grid
              container
              spacing={{ xs: 2, md: 3 }}
              alignItems="stretch"
              sx={{ mt: tiers.length > 0 ? 2 : 0 }}
            >
              {hasFundingPartners ? (
                <Grid xs={12} md={hasAgency ? 6 : 12} sx={{ display: 'flex', minWidth: 0 }}>
                  <Box sx={(theme) => INNER_PANEL_SX(theme)}>
                    {content.fundingPartnersHeading ? (
                      <Typography
                        sx={{
                          fontWeight: 700,
                          mb: 0.75,
                          fontSize: FLUID_FONT_SIZES.body1,
                          lineHeight: 1.35,
                        }}
                      >
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
                </Grid>
              ) : null}

              {hasAgency ? (
                <Grid xs={12} md={hasFundingPartners ? 6 : 12} sx={{ display: 'flex', minWidth: 0 }}>
                  <Box
                    sx={(theme) => ({
                      ...INNER_PANEL_SX(theme),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                      {agencyLogo ? (
                        <Box
                          component="img"
                          src={agencyLogo}
                          alt=""
                          sx={{
                            width: { xs: 120, sm: 150, md: 180 },
                            height: 'auto',
                            maxHeight: { xs: 80, sm: 96, md: 112 },
                            objectFit: 'contain',
                            flexShrink: 0,
                          }}
                        />
                      ) : null}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            lineHeight: 1.35,
                            fontSize: FLUID_FONT_SIZES.body1,
                          }}
                        >
                          {content.agency?.name}
                        </Typography>
                        {content.agency?.tagline ? (
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              fontStyle: 'italic',
                              mt: 0.25,
                              fontSize: FLUID_FONT_SIZES.body2,
                            }}
                          >
                            {content.agency.tagline}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              ) : null}
            </Grid>
          )}
        </Box>
      </DashboardContent>
    </Box>
  );
}
