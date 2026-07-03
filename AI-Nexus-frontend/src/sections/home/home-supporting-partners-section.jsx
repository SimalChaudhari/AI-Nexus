import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { CONFIG } from 'src/config-global';
import { appSettingsService } from 'src/services/app-settings.service';

import { resolveEmployeeContent } from './employee-defaults';
import { normalizeEmployerContent } from './employer-defaults';
import { FLUID_FONT_SIZES } from 'src/theme/home-typography';

// ----------------------------------------------------------------------

const SECTION_GREY = '#eceef1';
const PARTNERS_BG = '#F7F9FA';

export const PARTNERS_WITH_ISCA_HEADING = 'Early Adopter';

function resolvePartnersHeading(headingOverride, apiHeading) {
  const override = String(headingOverride ?? '').trim();
  if (override) return override;
  return String(apiHeading || '').trim();
}

function resolveAssetUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function PartnersLogoSection({ heading, logos, secondaryColor, disableAnimation = false }) {
  const shouldScroll = logos.length > 6;

  const sectionProps = disableAnimation
    ? { component: 'section' }
    : { component: m.section, variants: varFade({ distance: 16 }).inUp };

  const contentWrapper = disableAnimation ? Box : MotionViewport;

  return (
    <Box
      {...sectionProps}
      sx={{
        width: '100%',
        bgcolor: PARTNERS_BG,
        py: { xs: 4, md: 5 },
        borderTop: `1px solid ${alpha(SECTION_GREY, 0.65)}`,
        flexShrink: 0,
        touchAction: 'pan-y',
      }}
    >
      <DashboardContent
        component={contentWrapper}
        sx={{
          width: 1,
          pt: 0,
          pb: 0,
          flex: '0 0 auto',
        }}
      >
        <Stack spacing={{ xs: 3, md: 3.5 }} alignItems="center" sx={{ width: 1 }}>
          {heading ? (
            <Stack spacing={0} alignItems="center" sx={{ width: 1 }}>
              <Typography
                component="h3"
                sx={{
                  m: 0,
                  textAlign: 'center',
                  color: 'secondary.main',
                  fontWeight: 800,
                  fontSize: FLUID_FONT_SIZES.h4,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                {heading}
              </Typography>

              <Box
                sx={{
                  mt: 1.5,
                  width: { xs: 72, sm: 80, md: 96 },
                  height: 4,
                  borderRadius: 999,
                  flexShrink: 0,
                  background: (theme) =>
                    `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${secondaryColor || theme.palette.secondary.main} 100%)`,
                  boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
                }}
              />
            </Stack>
          ) : null}

          <Box
            sx={{
              width: 1,
              overflow: 'hidden',
              touchAction: 'pan-y',
              '@keyframes supportingPartnersScroll': {
                from: { transform: 'translateX(0)' },
                to: { transform: 'translateX(-50%)' },
              },
              '@media (prefers-reduced-motion: reduce)': {
                '& > *': {
                  animation: 'none !important',
                },
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              sx={{
                width: shouldScroll ? 'max-content' : 1,
                minWidth: shouldScroll ? '100%' : 'auto',
                animation: shouldScroll ? 'supportingPartnersScroll 40s linear infinite' : 'none',
                justifyContent: shouldScroll ? 'flex-start' : 'center',
                flexWrap: shouldScroll ? 'nowrap' : 'wrap',
                gap: { xs: 2.5, sm: 3.5, md: 4.5, lg: 5 },
                px: { xs: 0.5, md: 1 },
              }}
            >
              {(shouldScroll ? [...logos, ...logos] : logos).map((row, index) => (
                <Box
                  key={`supporting-partner-logo-${index}`}
                  sx={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: { xs: 52, md: 64 },
                    px: { xs: 0.5, md: 1 },
                  }}
                >
                  <Box
                    component="img"
                    src={row.logoUrl}
                    alt={row.name}
                    sx={{
                      height: { xs: 40, sm: 44, md: 52 },
                      maxWidth: { xs: 120, sm: 140, md: 160 },
                      width: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                      filter: 'grayscale(1)',
                      opacity: 0.72,
                      transition: (theme) => theme.transitions.create(['opacity', 'filter'], { duration: 200 }),
                      '@media (hover: hover) and (pointer: fine)': {
                        '&:hover': {
                          opacity: 0.95,
                          filter: 'grayscale(0)',
                        },
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DashboardContent>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function HomeSupportingPartnersSection({ headingOverride } = {}) {
  const theme = useTheme();
  const secondary = theme.palette.secondary;

  const [partnersHeading, setPartnersHeading] = useState('');
  const [logos, setLogos] = useState([]);

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        const employeeContent = resolveEmployeeContent(
          settings?.homeEmployeeContent,
          settings?.homeEmployerContent
        );
        const employerContent = normalizeEmployerContent(settings?.homeEmployerContent);
        const rawLogos = Array.isArray(employerContent.logos) ? employerContent.logos : [];

        setPartnersHeading(String(employeeContent.partnersHeading || '').trim());
        setLogos(
          rawLogos
            .map((row) => ({
              name: String(row?.name || '').trim(),
              logoUrl: resolveAssetUrl(row?.logoUrl),
            }))
            .filter((row) => row.logoUrl)
        );
      })
      .catch(() => {
        if (active) {
          setPartnersHeading('');
          setLogos([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!logos.length) return null;

  const heading = resolvePartnersHeading(headingOverride, partnersHeading);

  return (
    <PartnersLogoSection
      heading={heading}
      logos={logos}
      secondaryColor={secondary.main}
    />
  );
}

/** Partner-with-ISCA page: both logo strips in one fetch (Supporting Partners + Early Adopter). */
export function PartnerWithIscaPartnerLogosSections() {
  const theme = useTheme();
  const secondary = theme.palette.secondary;

  const [partnersHeading, setPartnersHeading] = useState('');
  const [logos, setLogos] = useState([]);

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        const employeeContent = resolveEmployeeContent(
          settings?.homeEmployeeContent,
          settings?.homeEmployerContent
        );
        const employerContent = normalizeEmployerContent(settings?.homeEmployerContent);
        const rawLogos = Array.isArray(employerContent.logos) ? employerContent.logos : [];

        setPartnersHeading(String(employeeContent.partnersHeading || '').trim());
        setLogos(
          rawLogos
            .map((row) => ({
              name: String(row?.name || '').trim(),
              logoUrl: resolveAssetUrl(row?.logoUrl),
            }))
            .filter((row) => row.logoUrl)
        );
      })
      .catch(() => {
        if (active) {
          setPartnersHeading('');
          setLogos([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!logos.length) return null;

  const supportingHeading = resolvePartnersHeading('', partnersHeading);
  const earlyAdopterHeading = resolvePartnersHeading(PARTNERS_WITH_ISCA_HEADING, '');

  return (
    <Box component="section" sx={{ width: '100%', flexShrink: 0, touchAction: 'pan-y' }}>
      {supportingHeading ? (
        <PartnersLogoSection
          heading={supportingHeading}
          logos={logos}
          secondaryColor={secondary.main}
          disableAnimation
        />
      ) : null}
      {earlyAdopterHeading ? (
        <PartnersLogoSection
          heading={earlyAdopterHeading}
          logos={logos}
          secondaryColor={secondary.main}
          disableAnimation
        />
      ) : null}
    </Box>
  );
}
