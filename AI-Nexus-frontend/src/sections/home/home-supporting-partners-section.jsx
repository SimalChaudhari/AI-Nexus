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

import { normalizeEmployeeContent } from './employee-defaults';
import { normalizeEmployerContent } from './employer-defaults';
import { FLUID_FONT_SIZES } from 'src/theme/home-typography';

// ----------------------------------------------------------------------

const SECTION_GREY = '#eceef1';
const PARTNERS_BG = '#F7F9FA';

export const PARTNERS_WITH_ISCA_HEADING = 'Early Adopters';
export const SUPPORTING_PARTNERS_HEADING = 'Supporting Partners';

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
  const safeLogos = Array.isArray(logos) ? logos : [];
  const shouldScroll = safeLogos.length > 6;

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

          {safeLogos.length > 0 ? (
          <Box
            sx={{
              width: 1,
              overflow: shouldScroll ? 'hidden' : 'visible',
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
              {(shouldScroll ? [...safeLogos, ...safeLogos] : safeLogos).map((row, index) => (
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
          ) : null}
        </Stack>
      </DashboardContent>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function HomeSupportingPartnersSection({ headingOverride, logosSource = 'employer' } = {}) {
  const theme = useTheme();
  const secondary = theme.palette.secondary;

  const [partnersHeading, setPartnersHeading] = useState('');
  const [logos, setLogos] = useState([]);
  const useEmployeeLogos = logosSource === 'employee';

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        const employerContent = normalizeEmployerContent(settings?.homeEmployerContent);
        const normalizedEmployee = normalizeEmployeeContent(settings?.homeEmployeeContent);
        const rawLogos = useEmployeeLogos ? normalizedEmployee.logos : employerContent.logos;

        setPartnersHeading(
          useEmployeeLogos
            ? String(normalizedEmployee.partnersHeading || PARTNERS_WITH_ISCA_HEADING).trim()
            : String(employerContent.partnersHeading || '').trim()
        );
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
  }, [useEmployeeLogos]);

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

function mapLogoRows(rawLogos) {
  return (Array.isArray(rawLogos) ? rawLogos : [])
    .map((row) => ({
      name: String(row?.name || '').trim(),
      logoUrl: resolveAssetUrl(row?.logoUrl),
    }))
    .filter((row) => row.logoUrl);
}

/** Partner-with-ISCA page: Supporting Partners (employer logos) + Early Adopters (employee logos). */
export function PartnerWithIscaPartnerLogosSections() {
  const theme = useTheme();
  const secondary = theme.palette.secondary;

  const [supportingHeading, setSupportingHeading] = useState(SUPPORTING_PARTNERS_HEADING);
  const [earlyAdopterHeading, setEarlyAdopterHeading] = useState(PARTNERS_WITH_ISCA_HEADING);
  const [supportingLogos, setSupportingLogos] = useState([]);
  const [earlyAdopterLogos, setEarlyAdopterLogos] = useState([]);

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        const employerContent = normalizeEmployerContent(settings?.homeEmployerContent);
        const employeeContent = normalizeEmployeeContent(settings?.homeEmployeeContent);

        setSupportingHeading(
          String(employerContent.partnersHeading || SUPPORTING_PARTNERS_HEADING).trim()
        );
        setEarlyAdopterHeading(
          String(employeeContent.partnersHeading || PARTNERS_WITH_ISCA_HEADING).trim()
        );
        setSupportingLogos(mapLogoRows(employerContent.logos));
        setEarlyAdopterLogos(mapLogoRows(employeeContent.logos));
      })
      .catch(() => {
        if (active) {
          setSupportingHeading(SUPPORTING_PARTNERS_HEADING);
          setEarlyAdopterHeading(PARTNERS_WITH_ISCA_HEADING);
          setSupportingLogos([]);
          setEarlyAdopterLogos([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Box component="section" sx={{ width: '100%', flexShrink: 0, touchAction: 'pan-y', overflow: 'visible' }}>
      <PartnersLogoSection
        heading={supportingHeading}
        logos={supportingLogos}
        secondaryColor={secondary.main}
        disableAnimation
      />
      <PartnersLogoSection
        heading={earlyAdopterHeading}
        logos={earlyAdopterLogos}
        secondaryColor={secondary.main}
        disableAnimation
      />
    </Box>
  );
}
