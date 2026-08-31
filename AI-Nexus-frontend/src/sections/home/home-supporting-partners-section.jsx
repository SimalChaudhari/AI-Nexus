import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';

import { normalizeEmployeeContent } from './employee-defaults';
import { normalizeEmployerContent } from './employer-defaults';
import { HOME_DASHBOARD_CONTENT_SX } from './home-section-styles';
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
  const raw = String(url || '')
    .trim()
    .replace(/\\/g, '/');
  if (!raw) return '';

  let resolved = '';
  if (/^https?:\/\//i.test(raw)) {
    resolved = raw;
  } else {
    const assetBase = String(CONFIG.site.assetURL || '')
      .trim()
      .replace(/\/$/, '');
    if (assetBase) {
      resolved = `${assetBase}${raw.startsWith('/') ? raw : `/${raw}`}`;
    } else {
      const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
      resolved = `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
    }
  }

  if (
    typeof window !== 'undefined'
    && window.location.protocol === 'https:'
    && /^http:\/\//i.test(resolved)
  ) {
    resolved = resolved.replace(/^http:\/\//i, 'https://');
  }

  return resolved;
}

function PartnerLogoImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  const label = String(alt || 'Partner').trim();

  if (!src || failed) {
    return (
      <Typography
        variant="caption"
        sx={{
          color: 'text.disabled',
          textAlign: 'center',
          lineHeight: 1.3,
          px: 0.5,
          wordBreak: 'break-word',
        }}
      >
        {label || 'Logo'}
      </Typography>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={label}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
      sx={{
        display: 'block',
        height: { xs: 40, sm: 44, md: 52 },
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
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
  );
}

function PartnersLogoSection({ heading, logos }) {
  const theme = useTheme();
  const secondaryColor = theme.palette.secondary.main;
  const safeLogos = Array.isArray(logos) ? logos : [];

  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        bgcolor: PARTNERS_BG,
        py: { xs: 4, md: 5 },
        borderTop: `1px solid ${alpha(SECTION_GREY, 0.65)}`,
      }}
    >
      <DashboardContent
        sx={{
          ...HOME_DASHBOARD_CONTENT_SX,
          py: 0,
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
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${secondaryColor} 100%)`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
                }}
              />
            </Stack>
          ) : null}

          {safeLogos.length > 0 ? (
            <Box
              sx={{
                width: 1,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                alignContent: 'center',
                gap: { xs: 2, sm: 2.5, md: 3.5, lg: 4 },
              }}
            >
              {safeLogos.map((row, index) => (
                <Box
                  key={`partner-logo-${index}-${row.logoUrl}`}
                  sx={{
                    flex: '0 1 auto',
                    width: { xs: 130, sm: 140, md: 150 },
                    maxWidth: 160,
                    minHeight: { xs: 56, md: 64 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: { xs: 0.75, md: 1 },
                    py: 0.5,
                  }}
                >
                  <PartnerLogoImage src={row.logoUrl} alt={row.name} />
                </Box>
              ))}
            </Box>
          ) : null}
        </Stack>
      </DashboardContent>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function HomeSupportingPartnersSection({ headingOverride, logosSource = 'employer' } = {}) {
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

  return <PartnersLogoSection heading={heading} logos={logos} />;
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

  if (!supportingLogos.length && !earlyAdopterLogos.length) {
    return null;
  }

  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        pb: { xs: 2, md: 3 },
      }}
    >
      {supportingLogos.length > 0 ? (
        <PartnersLogoSection heading={supportingHeading} logos={supportingLogos} />
      ) : null}
      {earlyAdopterLogos.length > 0 ? (
        <PartnersLogoSection heading={earlyAdopterHeading} logos={earlyAdopterLogos} />
      ) : null}
    </Box>
  );
}
