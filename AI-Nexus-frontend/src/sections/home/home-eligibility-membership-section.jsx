import { m } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { CONFIG } from 'src/config-global';
import { appSettingsService } from 'src/services/app-settings.service';
import { useAuthContext } from 'src/auth/hooks';
import { FLUID_FONT_SIZES } from 'src/theme/home-typography';

import {
  resolveMembershipExploreHref,
  shouldOpenEligibilityModal,
} from './eligibility-membership-defaults';

// ----------------------------------------------------------------------

const HEADER_CONTENT_PX = { xs: 0.5, sm: 1, md: 1.25, lg: 1.5 };

const NAVY = '#0f2744';
const LEFT_BLUE_LIGHT = '#1a6fd4';
const LEFT_BLUE_MID = '#0f52b8';
const LEFT_BLUE_DEEP = '#0a3d8f';
const RED = '#e63946';
const BLUE_ICON = '#1e5a8a';
const LIGHT_PANEL_BG = '#f5f7fa';
const LIGHT_PANEL_BORDER = '#e8ecf1';
const CARD_CONTENT_PX = { xs: 2, sm: 2.5 };
const CARD_CONTENT_PY = { xs: 1.5, sm: 2 };
const PANEL_TITLE_SX = {
  m: 0,
  fontWeight: 700,
  fontSize: FLUID_FONT_SIZES.h5,
  lineHeight: 1.25,
};
const PANEL_SUBTITLE_SX = {
  m: 0,
  mt: 0.5,
  fontWeight: 400,
  fontSize: FLUID_FONT_SIZES.body2,
  lineHeight: 1.5,
};
const NETWORK_PATTERN = `radial-gradient(circle at 20% 30%, ${alpha('#7ec8ff', 0.35)} 0 2px, transparent 2px),
  radial-gradient(circle at 60% 70%, ${alpha('#5eb0f5', 0.28)} 0 2px, transparent 2px),
  radial-gradient(circle at 80% 20%, ${alpha('#8ad4ff', 0.22)} 0 1.5px, transparent 1.5px)`;

function resolveAssetUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || '').trim());
}

function normalizeAppPath(href) {
  const h = String(href || '').trim();
  if (!h || isExternalHref(h)) return h;
  return h.startsWith('/') ? h : `/${h}`;
}

function iconAccentColor(iconColor) {
  return iconColor === 'red' ? RED : BLUE_ICON;
}

function normalizeEligibilityMembershipContentNoDefaults(source) {
  if (!source || typeof source !== 'object') return null;
  const left = source.leftPanel && typeof source.leftPanel === 'object' ? source.leftPanel : {};
  const right = source.rightPanel && typeof source.rightPanel === 'object' ? source.rightPanel : {};
  const leftQuestions = Array.isArray(left.questions) ? left.questions : [];
  const rightBenefits = Array.isArray(right.benefits) ? right.benefits : [];

  return {
    leftPanel: {
      heading: left.heading != null ? String(left.heading) : '',
      subtitle: left.subtitle != null ? String(left.subtitle) : '',
      heroImageUrl: left.heroImageUrl != null ? String(left.heroImageUrl) : '',
      questions: leftQuestions.slice(0, 4).map((q) => ({
        id: q?.id != null ? String(q.id) : '',
        icon: q?.icon != null ? String(q.icon).trim() : '',
        iconColor:
          String(q?.iconColor || '')
            .trim()
            .toLowerCase() === 'red'
            ? 'red'
            : '',
        text: q?.text != null ? String(q.text) : '',
      })),
      ctaLabel: left.ctaLabel != null ? String(left.ctaLabel) : '',
      ctaHref: left.ctaHref != null ? String(left.ctaHref) : '',
    },
    rightPanel: {
      eyebrow: right.eyebrow != null ? String(right.eyebrow) : '',
      heading: right.heading != null ? String(right.heading) : '',
      benefits: rightBenefits.slice(0, 4).map((b) => ({
        id: b?.id != null ? String(b.id) : '',
        icon: b?.icon != null ? String(b.icon).trim() : '',
        label: b?.label != null ? String(b.label) : '',
      })),
      primaryCtaLabel: right.primaryCtaLabel != null ? String(right.primaryCtaLabel) : '',
      primaryCtaHref: right.primaryCtaHref != null ? String(right.primaryCtaHref) : '',
      secondaryCtaLabel: right.secondaryCtaLabel != null ? String(right.secondaryCtaLabel) : '',
      secondaryCtaHref: right.secondaryCtaHref != null ? String(right.secondaryCtaHref) : '',
    },
  };
}

function hasEligibilityMembershipContentNoDefaults(content) {
  if (!content || typeof content !== 'object') return false;
  const left = content.leftPanel || {};
  const right = content.rightPanel || {};
  if (String(left.heading || '').trim()) return true;
  if (String(left.subtitle || '').trim()) return true;
  if (String(left.heroImageUrl || '').trim()) return true;
  if (String(left.ctaLabel || '').trim()) return true;
  if (String(right.eyebrow || '').trim()) return true;
  if (String(right.heading || '').trim()) return true;
  if ((left.questions || []).some((q) => String(q?.text || '').trim())) return true;
  if ((right.benefits || []).some((b) => String(b?.label || '').trim())) return true;
  if (String(right.primaryCtaLabel || '').trim()) return true;
  if (String(right.secondaryCtaLabel || '').trim()) return true;
  return false;
}

function QuestionCard({ question }) {
  const text = String(question?.text || '').trim();
  if (!text) return null;
  const accent = iconAccentColor(question?.iconColor);
  const icon = String(question?.icon || '').trim();

  return (
    <Stack
      direction="row"
      spacing={{ xs: 0.55, sm: 0.85 }}
      alignItems="center"
      sx={{
        width: 1,
        p: { xs: 0.65, sm: 0.85 },
        borderRadius: 1.25,
        bgcolor: 'common.white',
        border: `1px solid ${alpha('#e2e8f0', 0.95)}`,
        boxShadow: `0 1px 4px ${alpha('#000', 0.06)}`,
        height: 1,
        minHeight: { xs: 48, sm: 52 },
        justifyContent: 'flex-start',
      }}
    >
      <Box
        sx={{
          width: { xs: 20, sm: 24 },
          height: { xs: 20, sm: 24 },
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon ? <Iconify icon={icon} width={18} sx={{ color: accent }} /> : null}
      </Box>
      <Typography
        sx={{
          m: 0,
          fontWeight: 600,
          fontSize: FLUID_FONT_SIZES.overline,
          lineHeight: 1.2,
          color: NAVY,
          flex: 1,
          minWidth: 0,
          textAlign: 'left',
        }}
      >
        {text}
      </Typography>
    </Stack>
  );
}

function MembershipBenefit({ benefit, showDivider }) {
  const label = String(benefit?.label || '').trim();
  if (!label) return null;
  const icon = String(benefit?.icon || '').trim();
  const displayLabel =
    label === 'Access to AI Fluency Programme' ? 'Access to AI Fluency\nProgramme' : label;

  return (
    <Stack
      alignItems="center"
      spacing={0.65}
      sx={{
        flex: { xs: '1 1 calc(50% - 8px)', md: '1 1 25%' },
        minWidth: 0,
        justifyContent: 'flex-start',
        px: { xs: 0.5, sm: 0.75, xl: 1 },
        position: 'relative',
        textAlign: 'center',
        ...(showDivider
          ? {
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 10,
                bottom: 10,
                width: '1px',
                bgcolor: LIGHT_PANEL_BORDER,
                display: { xs: 'none', md: 'block' },
              },
            }
          : {}),
      }}
    >
      <Box
        sx={{
          width: { xs: 36, md: 40 },
          height: { xs: 36, md: 40 },
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'common.white',
          border: `1px solid ${alpha('#dce6f0', 0.95)}`,
          boxShadow: `0 2px 6px ${alpha(NAVY, 0.06)}`,
        }}
      >
        {icon ? <Iconify icon={icon} width={20} sx={{ color: BLUE_ICON }} /> : null}
      </Box>
      <Typography
        sx={{
          m: 0,
          fontWeight: 700,
          fontSize: FLUID_FONT_SIZES.caption,
          lineHeight: 1.2,
          color: NAVY,
          width: '100%',
          maxWidth: 120,
          textAlign: 'center',
          mx: 'auto',
          whiteSpace: 'pre-line',
        }}
      >
        {displayLabel}
      </Typography>
    </Stack>
  );
}

function PanelCtaButton({ label, href, variant = 'contained', onEligibilityClick, sx }) {
  if (!String(label || '').trim()) return null;

  const handleClick = (event) => {
    if (shouldOpenEligibilityModal(href)) {
      event.preventDefault();
      onEligibilityClick?.(event);
    }
  };

  const external = isExternalHref(href);
  const common = {
    size: 'medium',
    sx: {
      fontWeight: 700,
      px: 1.8,
      py: 0.85,
      borderRadius: 1.15,
      textTransform: 'none',
      fontSize: FLUID_FONT_SIZES.caption,
      minHeight: 36,
      whiteSpace: 'nowrap',
      ...sx,
    },
  };

  if (variant === 'outlined') {
    const btnSx = {
      ...common.sx,
      color: NAVY,
      borderColor: alpha('#2f5ec4', 0.65),
      borderWidth: 1.5,
      bgcolor: 'common.white',
      '&:hover': {
        borderColor: '#2f5ec4',
        bgcolor: alpha('#2f5ec4', 0.04),
      },
    };
    if (shouldOpenEligibilityModal(href)) {
      return (
        <Button variant="outlined" onClick={handleClick} {...common} sx={btnSx}>
          {label}
        </Button>
      );
    }
    return external ? (
      <Button
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        variant="outlined"
        {...common}
        sx={btnSx}
      >
        {label}
      </Button>
    ) : (
      <Button
        component={RouterLink}
        href={normalizeAppPath(href)}
        variant="outlined"
        {...common}
        sx={btnSx}
      >
        {label}
      </Button>
    );
  }

  if (variant === 'eligibility') {
    return (
      <Button
        variant="contained"
        onClick={handleClick}
        endIcon={<Iconify icon="mingcute:arrow-right-line" width={18} />}
        {...common}
        sx={{
          ...common.sx,
          color: NAVY,
          bgcolor: 'common.white',
          borderRadius: 999,
          px: { xs: 2, sm: 2.25 },
          py: { xs: 0.85, sm: 1 },
          minHeight: { xs: 38, sm: 42 },
          fontSize: FLUID_FONT_SIZES.caption,
          fontWeight: 700,
          boxShadow: `0 4px 14px ${alpha('#000', 0.16)}`,
          '&:hover': { bgcolor: alpha('#fff', 0.95) },
          ...sx,
        }}
      >
        {label}
      </Button>
    );
  }

  const containedSx = {
    ...common.sx,
    color: 'common.white',
    bgcolor: RED,
    boxShadow: 'none',
    '&:hover': { bgcolor: '#cc2532', boxShadow: 'none' },
  };

  if (shouldOpenEligibilityModal(href)) {
    return (
      <Button variant="contained" onClick={handleClick} {...common} sx={containedSx}>
        {label}
      </Button>
    );
  }

  return external ? (
    <Button
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant="contained"
      {...common}
      sx={containedSx}
    >
      {label}
    </Button>
  ) : (
    <Button
      component={RouterLink}
      href={normalizeAppPath(href)}
      variant="contained"
      {...common}
      sx={containedSx}
    >
      {label}
    </Button>
  );
}

// ----------------------------------------------------------------------

export function HomeEligibilityMembershipSection({ onOpenMembershipSignup }) {
  const navigate = useNavigate();
  const { authenticated } = useAuthContext();

  const [content, setContent] = useState(null);

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        setContent(
          normalizeEligibilityMembershipContentNoDefaults(
            settings?.homeEligibilityMembershipContent
          )
        );
      })
      .catch(() => {
        if (active) setContent(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const openEligibilityFlow = useCallback(() => {
    if (!authenticated) {
      onOpenMembershipSignup?.();
      return;
    }
    const href = String(content?.leftPanel?.ctaHref || '').trim();
    if (href && !shouldOpenEligibilityModal(href)) {
      if (isExternalHref(href)) {
        window.location.assign(href);
      } else {
        navigate(normalizeAppPath(href));
      }
    } else {
      onOpenMembershipSignup?.();
    }
  }, [authenticated, content?.leftPanel?.ctaHref, navigate, onOpenMembershipSignup]);

  if (!hasEligibilityMembershipContentNoDefaults(content)) return null;

  const left = content.leftPanel || {};
  const right = content.rightPanel || {};
  const questions = (left.questions || []).filter((q) => String(q?.text || '').trim());
  const benefits = (right.benefits || []).filter((b) => String(b?.label || '').trim());
  const rightEyebrow = String(right.eyebrow || '').trim();
  const rightHeading = String(right.heading || '').trim();
  const heroUrl = resolveAssetUrl(left.heroImageUrl);
  const leftHeading = String(left.heading || '').trim();
  const leftSubtitle = String(left.subtitle || '').trim();
  const leftCtaLabel = String(left.ctaLabel || '').trim();
  const membershipExploreHref = resolveMembershipExploreHref(right.primaryCtaHref);

  return (
    <>
      <Box
        id="eligibility-membership"
        component="section"
        sx={{
          py: { xs: 2, md: 2.5 },
          bgcolor: 'grey.500',
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
          <Grid
            container
            spacing={{ xs: 2, md: 3 }}
            alignItems="stretch"
            component={m.div}
            variants={varFade({ distance: 20 }).inUp}
          >
            {/* Left panel — Am I Eligible? */}
            <Grid xs={12} lg={6} sx={{ display: 'flex', minWidth: 0 }}>
            <Box
              sx={{
                width: 1,
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                bgcolor: LEFT_BLUE_MID,
                backgroundImage: NETWORK_PATTERN,
                backgroundSize: '44px 44px, 58px 58px, 38px 38px',
                borderRadius: '20px',
                boxShadow: `0 8px 20px ${alpha(LEFT_BLUE_DEEP, 0.18)}`,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(105deg, ${LEFT_BLUE_LIGHT} 0%, ${LEFT_BLUE_MID} 42%, ${LEFT_BLUE_DEEP} 100%)`,
                  pointerEvents: 'none',
                }}
              />
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{
                  position: 'relative',
                  flex: 1,
                  zIndex: 2,
                }}
              >
                {heroUrl ? (
                  <Box
                    sx={{
                      flex: { xs: '0 0 auto', sm: '0 0 36%', lg: '0 0 38%' },
                      width: { xs: 1, sm: 'auto' },
                      minHeight: { sm: 'auto' },
                      alignSelf: { sm: 'stretch' },
                      position: 'relative',
                      overflow: 'hidden',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: { xs: '100%', sm: 64 },
                        background: {
                          xs: `linear-gradient(180deg, ${alpha(LEFT_BLUE_LIGHT, 0)} 0%, ${LEFT_BLUE_MID} 0.65} 100%)`,
                          sm: `linear-gradient(90deg, ${alpha(LEFT_BLUE_LIGHT, 0)} 0%, ${LEFT_BLUE_MID} 100%)`,
                        },
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={heroUrl}
                      alt=""
                      sx={{
                        width: 1,
                        height: 1,
                        objectFit: 'cover',
                        objectPosition: { xs: 'center top', sm: 'left center' },
                        display: 'block',
                      }}
                    />
                  </Box>
                ) : null}

                <Stack
                  spacing={{ xs: 0.85, sm: 1 }}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    height: 1,
                    justifyContent: 'flex-start',
                    px: CARD_CONTENT_PX,
                    py: CARD_CONTENT_PY,
                    position: 'relative',
                    alignItems: 'stretch',
                  }}
                >
                  <Box sx={{ width: 1, flex: 1 }}>
                    <Typography
                      component="h2"
                      sx={{
                        ...PANEL_TITLE_SX,
                        color: 'common.white',
                        textAlign: { xs: 'center', sm: 'left' },
                      }}
                    >
                      {leftHeading}
                    </Typography>

                    <Typography
                      sx={{
                        ...PANEL_SUBTITLE_SX,
                        color: alpha('#fff', 0.9),
                        textAlign: { xs: 'center', sm: 'left' },
                      }}
                    >
                      {leftSubtitle}
                    </Typography>

                    {questions.length > 0 ? (
                      <Grid
                        container
                        spacing={{ xs: 0.6, sm: 0.75 }}
                        sx={{
                          mt: { xs: 0.85, sm: 1 },
                          width: 1,
                          mx: 'auto',
                        }}
                      >
                        {questions.map((q, index) => (
                          <Grid
                            key={q.id || `q-${index}`}
                            xs={6}
                            sx={{ display: 'flex', minWidth: 0 }}
                          >
                            <QuestionCard question={q} />
                          </Grid>
                        ))}
                      </Grid>
                    ) : null}
                  </Box>

                  <Box
                    sx={{
                      mt: 'auto',
                      pt: { xs: 0.85, sm: 1 },
                      display: 'flex',
                      justifyContent: 'center',
                      width: 1,
                    }}
                  >
                    <PanelCtaButton
                      label={leftCtaLabel}
                      href={left.ctaHref}
                      variant="eligibility"
                      onEligibilityClick={openEligibilityFlow}
                      sx={{ width: 'auto', minWidth: { xs: 180, sm: 200 } }}
                    />
                  </Box>
                </Stack>
              </Stack>
            </Box>
            </Grid>

            {/* Right panel — ISCA Membership */}
            <Grid xs={12} lg={6} sx={{ display: 'flex', minWidth: 0 }}>
            <Box
              sx={{
                width: 1,
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#fcfdff',
                border: `1px solid ${alpha('#cfe0ff', 0.95)}`,
                borderRadius: '20px',
                boxShadow: `0 8px 20px ${alpha('#0f2744', 0.06)}`,
              }}
            >
              <Stack
                spacing={0.85}
                sx={{
                  height: 1,
                  px: CARD_CONTENT_PX,
                  py: CARD_CONTENT_PY,
                  justifyContent: 'flex-start',
                  alignItems: 'stretch',
                }}
              >
                <Box sx={{ width: 1, flex: 1 }}>
                  <Stack spacing={0.35} sx={{ width: 1 }}>
                    <Typography
                      sx={{
                        m: 0,
                        fontWeight: 600,
                        fontSize: FLUID_FONT_SIZES.caption,
                        color: NAVY,
                        textAlign: 'left',
                      }}
                    >
                      {rightEyebrow}
                    </Typography>

                    <Typography
                      component="h3"
                      sx={{
                        ...PANEL_TITLE_SX,
                        color: NAVY,
                        textAlign: 'left',
                      }}
                    >
                      {rightHeading}
                    </Typography>
                  </Stack>

                  {benefits.length > 0 ? (
                    <Stack
                      direction="row"
                      spacing={0}
                      sx={{
                        width: 1,
                        maxWidth: 820,
                        mx: 'auto',
                        flexWrap: { xs: 'wrap', md: 'nowrap' },
                        justifyContent: { xs: 'center', md: 'space-between' },
                        gap: { xs: 1, md: 0 },
                        py: { xs: 0.15, md: 0.25 },
                        mt: { xs: 0.85, sm: 1 },
                        alignItems: 'flex-start',
                      }}
                    >
                      {benefits.map((b, index) => (
                        <MembershipBenefit
                          key={b.id || `b-${index}`}
                          benefit={b}
                          showDivider={index > 0}
                        />
                      ))}
                    </Stack>
                  ) : null}
                </Box>

                <Box
                  sx={{
                    mt: 'auto',
                    pt: { xs: 0.85, sm: 1 },
                    display: 'flex',
                    justifyContent: 'center',
                    width: 1,
                  }}
                >
                  <PanelCtaButton
                    label={right.primaryCtaLabel}
                    href={membershipExploreHref}
                    variant="contained"
                    onEligibilityClick={openEligibilityFlow}
                    sx={{
                      width: 'auto',
                      minWidth: { xs: 180, sm: 200 },
                      px: { xs: 1.8, sm: 2.25 },
                    }}
                  />
                </Box>
              </Stack>
            </Box>
            </Grid>
          </Grid>
        </DashboardContent>
      </Box>
    </>
  );
}
