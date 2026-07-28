import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { useAuthContext } from 'src/auth/hooks';
import { paths } from 'src/routes/paths';
import { appSettingsService } from 'src/services/app-settings.service';
import { navigateToPaidMembershipSignup } from 'src/utils/membership-eligibility-sso';
import { FLUID_FONT_SIZES, FLUID_TYPOGRAPHY } from 'src/theme/home-typography';

import {
  hasEnrolOptionsContent,
  resolveEnrolOptionsContent,
} from './enrol-options-defaults';

// ----------------------------------------------------------------------

const NAVY = '#1C4270';

function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || '').trim());
}

function isHashHref(href) {
  return String(href || '')
    .trim()
    .startsWith('#');
}

function normalizeAppPath(href) {
  const h = String(href || '').trim();
  if (!h || isExternalHref(h) || isHashHref(h)) return h;
  return h.startsWith('/') ? h : `/${h}`;
}

// ----------------------------------------------------------------------

function EnrolOptionCard({ option, onAction }) {
  const { title, description, ctaLabel, icon, accent } = option;
  const accentSoft = alpha(accent, 0.1);

  return (
    <Box
      sx={{
        height: 1,
        minHeight: { md: 280 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        p: { xs: 2.5, sm: 3 },
        borderRadius: '16px',
        bgcolor: '#fff',
        border: `1px solid ${alpha(NAVY, 0.12)}`,
        boxShadow: `0 4px 18px ${alpha(NAVY, 0.06)}`,
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          bgcolor: accentSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          flexShrink: 0,
        }}
      >
        <Iconify icon={icon} width={26} sx={{ color: accent }} />
      </Box>

      <Typography
        component="h3"
        sx={{
          m: 0,
          mb: 1,
          color: accent,
          fontWeight: 700,
          fontSize: FLUID_FONT_SIZES.h6,
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          m: 0,
          mb: 2.5,
          flex: 1,
          color: NAVY,
          opacity: 0.78,
          fontSize: FLUID_FONT_SIZES.body2,
          lineHeight: 1.5,
        }}
      >
        {description}
      </Typography>

      <Button
        fullWidth
        variant="contained"
        onClick={() => onAction?.(option)}
        endIcon={<Iconify icon="eva:arrow-forward-fill" width={18} />}
        sx={{
          mt: 'auto',
          py: 1.25,
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: FLUID_FONT_SIZES.button,
          textTransform: 'none',
          bgcolor: accent,
          color: '#fff',
          boxShadow: 'none',
          '&:hover': {
            bgcolor: accent,
            filter: 'brightness(0.92)',
            boxShadow: 'none',
          },
        }}
      >
        {ctaLabel}
      </Button>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function HomeEnrolOptionsSection({ onOpenMembershipSignup }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticated } = useAuthContext();
  const [content, setContent] = useState(() => resolveEnrolOptionsContent(null));

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        setContent(resolveEnrolOptionsContent(settings?.homeEnrolOptionsContent));
      })
      .catch(() => {
        if (active) setContent(resolveEnrolOptionsContent(null));
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAction = useCallback(
    (option) => {
      if (authenticated) {
        navigate('/learning');
        return;
      }

      const href = String(option?.href || '').trim();
      if (href) {
        if (isHashHref(href)) {
          const target = document.getElementById(href.slice(1));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
        if (isExternalHref(href)) {
          window.location.assign(href);
          return;
        }
        navigate(normalizeAppPath(href));
        return;
      }

      if (option.action === 'register') {
        const returnPath = `${location.pathname}${location.search || ''}` || paths.home;
        navigateToPaidMembershipSignup(navigate, returnPath);
        return;
      }

      onOpenMembershipSignup?.();
    },
    [authenticated, location.pathname, location.search, navigate, onOpenMembershipSignup]
  );

  const handleCompareClick = useCallback(
    (event) => {
      event.preventDefault();
      const href = String(content.compareHref || '#eligibility-membership').trim();
      if (isHashHref(href)) {
        const target = document.getElementById(href.slice(1) || 'eligibility-membership');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
      if (isExternalHref(href)) {
        window.location.assign(href);
        return;
      }
      if (href) navigate(normalizeAppPath(href));
    },
    [content.compareHref, navigate]
  );

  if (!hasEnrolOptionsContent(content)) return null;

  const cards = (content.cards || []).filter(
    (row) =>
      String(row?.title || '').trim() ||
      String(row?.description || '').trim() ||
      String(row?.ctaLabel || '').trim()
  );

  return (
    <Box
      component="section"
      id="enrol-options"
      sx={{
        width: '100%',
        pt: { xs: 1, sm: 1.25, md: 1.5 },
        pb: { xs: 2, sm: 2.5, md: 3 },
      }}
    >
      <Stack spacing={{ xs: 1, md: 1.25 }} alignItems="center" sx={{ mb: { xs: 3, md: 4 } }}>
        {content.heading ? (
          <Typography
            component="h2"
            sx={{
              m: 0,
              textAlign: 'center',
              color: NAVY,
              fontWeight: 800,
              fontSize: FLUID_FONT_SIZES.h3,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            {content.heading}
          </Typography>
        ) : null}
        {content.subtitle ? (
          <Typography
            sx={{
              m: 0,
              textAlign: 'center',
              color: NAVY,
              opacity: 0.72,
              ...FLUID_TYPOGRAPHY.sectionSubtitle,
            }}
          >
            {content.subtitle}
          </Typography>
        ) : null}
      </Stack>

      {cards.length ? (
        <Grid container spacing={{ xs: 2, md: 2.5 }} sx={{ mb: { xs: 3, md: 3.5 } }}>
          {cards.map((option) => (
            <Grid key={option.id || option.title} xs={12} sm={6} md={4}>
              <EnrolOptionCard
                option={{
                  ...option,
                  accent: option.accentColor || '#3D2A7A',
                }}
                onAction={handleAction}
              />
            </Grid>
          ))}
        </Grid>
      ) : null}

      {(content.comparePrompt || content.compareLinkLabel) && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ rowGap: 0.5 }}
        >
          <Iconify icon="eva:question-mark-circle-outline" width={18} sx={{ color: NAVY }} />
          {content.comparePrompt ? (
            <Typography
              component="span"
              sx={{
                color: NAVY,
                fontSize: FLUID_FONT_SIZES.body2,
                lineHeight: 1.5,
              }}
            >
              {content.comparePrompt}
            </Typography>
          ) : null}
          {content.compareLinkLabel ? (
            <Link
              component="button"
              type="button"
              underline="always"
              onClick={handleCompareClick}
              sx={{
                color: NAVY,
                fontWeight: 700,
                fontSize: FLUID_FONT_SIZES.body2,
                lineHeight: 1.5,
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                p: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {content.compareLinkLabel}
              <Iconify icon="eva:arrow-forward-fill" width={14} />
            </Link>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}
