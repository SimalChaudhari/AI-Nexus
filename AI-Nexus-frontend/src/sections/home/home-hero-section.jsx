import { m } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { DashboardContent } from 'src/layouts/dashboard';
import { RouterLink } from 'src/routes/components';
import { appSettingsService } from 'src/services/app-settings.service';
import { useAuthContext } from 'src/auth/hooks';

import { resolveHomeHeroData } from './home-hero-defaults';
import { FLUID_FONT_SIZES, FLUID_TYPOGRAPHY } from 'src/theme/home-typography';

// ----------------------------------------------------------------------

const NAVY = '#1C4270';
const NAVY_STATS = '#001A70';
const RED = '#E32B24';
const BORDER_BLUE = '#5C7AA1';

/** Eyebrow logo — flush left with headline, Figma spacing/size. */
const HERO_BADGE_LOGO_SX = {
  display: 'block',
  m: 0,
  p: { xs: 0.5, sm: 0.625, md: 0.75 },
  width: 'auto',
  height: { xs: 30, sm: 34, md: 40 },
  maxWidth: { xs: 140, sm: 156, md: 172 },
  objectFit: 'contain',
  objectPosition: 'left center',
  flexShrink: 0,
  mb: { xs: 1, sm: 1.25, md: 1.5 },
};

function normalizeRichTextHtml(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function resolveHeroImageSrc(imageUrl) {
  const src = String(imageUrl || '').trim();
  return src;
}

function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || '').trim());
}

function normalizeAppPath(href) {
  const h = String(href || '').trim();
  if (!h || isExternalHref(h)) return h;
  return h.startsWith('/') ? h : `/${h}`;
}

function isHashHref(href) {
  return String(href || '')
    .trim()
    .startsWith('#');
}

function isJoinMovementHref(href) {
  const h = String(href || '')
    .trim()
    .toLowerCase();
  return h === '#join-movement' || h === '#join' || h === '#get-started';
}

function isEligibilityCtaLabel(label) {
  return (
    String(label || '')
      .trim()
      .toLowerCase() === 'check eligibility'
  );
}

function isLikelyImagePath(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(s);
}

const HERO_IMAGE_WIDTH = '58%';
const HERO_EASE = [0.19, 1, 0.22, 1];
/** Opacity-only motion — blur/scale on load can expand scroll overflow and flash a scrollbar. */
const HERO_IMAGE_ANIMATION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 1.4, ease: HERO_EASE, delay: 0.08 },
};
const HERO_IMAGE_REVEAL_ANIMATION = {
  initial: { clipPath: 'inset(0 0 0 100%)', opacity: 0.92 },
  animate: { clipPath: 'inset(0 0 0 0)', opacity: 1 },
  transition: { duration: 1.1, ease: HERO_EASE, delay: 1.45 },
};
const HERO_TEXT_ANIMATION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1.1, ease: HERO_EASE, delay: 0.68 },
};
const HERO_FOOTER_ANIMATION = {
  initial: { opacity: 0.92, clipPath: 'inset(0 100% 0 0)' },
  animate: { opacity: 1, clipPath: 'inset(0 0 0 0)' },
  transition: { duration: 1.1, ease: HERO_EASE, delay: 1.45 },
};

/** Mobile-only hero visual — full-width card below copy. */
function HeroMobileImage({ imageSrc }) {
  const src = resolveHeroImageSrc(imageSrc);
  if (!src) return null;

  return (
    <Box
      sx={{
        display: { xs: 'block', md: 'none' },
        width: '100%',
        borderRadius: '20px',
        overflow: 'hidden',
        aspectRatio: '16 / 10',
        maxHeight: 240,
        boxShadow: `0 20px 40px ${alpha(NAVY, 0.14)}, 0 4px 12px ${alpha(NAVY, 0.06)}`,
        border: `1px solid ${alpha(NAVY, 0.08)}`,
      }}
    >
      <Box
        component="img"
        src={src}
        alt=""
        loading="eager"
        decoding="async"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '65% 40%',
          display: 'block',
        }}
      />
    </Box>
  );
}

/** Desktop: hero image right; left white fades into image. Hidden on mobile. */
function HeroFullWidthBackdrop({ imageSrc }) {
  const src = resolveHeroImageSrc(imageSrc);
  if (!src) return null;

  return (
    <Box
      aria-hidden
      component={m.div}
      initial={HERO_IMAGE_ANIMATION.initial}
      animate={HERO_IMAGE_ANIMATION.animate}
      transition={HERO_IMAGE_ANIMATION.transition}
      sx={{
        display: { xs: 'none', md: 'block' },
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        width: '100%',
        overflow: 'hidden',
        bgcolor: '#ffffff',
        willChange: 'opacity, transform',
      }}
    >
      {/* Left copy area — pure white, soft fade at image seam */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: { xs: '100%', md: '50%' },
          background: {
            xs: '#ffffff',
            md: `
              linear-gradient(
                90deg,
                #ffffff 0%,
                #ffffff 78%,
                rgba(255, 255, 255, 0.92) 88%,
                rgba(255, 255, 255, 0.55) 96%,
                rgba(255, 255, 255, 0) 100%
              )
            `,
          },
        }}
      />

      <Box
        component={m.div}
        initial={HERO_IMAGE_REVEAL_ANIMATION.initial}
        animate={HERO_IMAGE_REVEAL_ANIMATION.animate}
        transition={HERO_IMAGE_REVEAL_ANIMATION.transition}
        sx={{
          position: 'absolute',
          top: { xs: 52, md: 76 },
          right: 0,
          bottom: { xs: 40, sm: 44, md: 48 },
          width: HERO_IMAGE_WIDTH,
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src={src}
          alt=""
          loading="eager"
          decoding="async"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: { xs: '72% 68%', md: '68% 70%' },
            display: 'block',
          }}
        />

        {/* Match image edge to left white — same #fff fade, no color shift */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `
              linear-gradient(
                180deg,
                #ffffff 0%,
                rgba(255, 255, 255, 0.9) 5%,
                rgba(255, 255, 255, 0.45) 12%,
                transparent 24%
              ),
              linear-gradient(
                90deg,
                #ffffff 0%,
                rgba(255, 255, 255, 0.98) 6%,
                rgba(255, 255, 255, 0.82) 14%,
                rgba(255, 255, 255, 0.45) 24%,
                rgba(255, 255, 255, 0.12) 34%,
                transparent 46%
              ),
              linear-gradient(
                0deg,
                rgba(255, 255, 255, 0.7) 0%,
                rgba(255, 255, 255, 0.22) 10%,
                transparent 18%
              )
            `,
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            boxShadow: `
              inset 0 32px 40px -14px rgba(255, 255, 255, 0.95),
              inset 48px 0 56px -20px rgba(255, 255, 255, 0.9),
              inset 0 -18px 24px -10px rgba(255, 255, 255, 0.5)
            `,
          }}
        />
      </Box>
    </Box>
  );
}

function HeroCtaButton({ cta, variant = 'primary', onJoinClick, onEligibilityScroll }) {
  const label = String(cta?.label || '').trim();
  const href = String(cta?.href || '').trim();
  const icon = String(cta?.icon || '').trim();
  if (!label) return null;
  const isEligibilityButton = isEligibilityCtaLabel(label);

  const isPrimary = variant === 'primary';
  const iconNode = icon ? (
    isLikelyImagePath(icon) ? (
      <Box component="img" src={icon} alt="" sx={{ width: 18, height: 18, objectFit: 'contain' }} />
    ) : (
      <Iconify icon={icon} width={18} />
    )
  ) : null;

  const baseSx = {
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: FLUID_FONT_SIZES.button,
    textTransform: 'none',
    boxShadow: 'none',
    gap: 0,
    whiteSpace: 'normal',
    minHeight: { xs: 48, sm: 50, md: 52 },
    px: { xs: 1.5, sm: 1.5, md: 2 },
    py: { xs: 1.25, sm: 1.15, md: 1.35 },
    pr: { xs: 4, sm: 4.25, md: 4.75 },
  };

  const customBg = String(cta?.buttonColor || '').trim();
  const customText = String(cta?.buttonTextColor || '').trim();
  const hasCustomColors = Boolean(customBg || customText);

  const variantSx = isPrimary
    ? {
        bgcolor: customBg || RED,
        color: customText || '#fff',
        border: hasCustomColors && !customBg ? `1.5px solid ${BORDER_BLUE}` : 'none',
        '&:hover': {
          bgcolor: customBg ? alpha(customBg, 0.9) : '#C4241E',
          boxShadow: 'none',
        },
      }
    : hasCustomColors
      ? {
          bgcolor: customBg || '#fff',
          color: customText || NAVY,
          border: customBg ? 'none' : `1.5px solid ${BORDER_BLUE}`,
          '&:hover': {
            bgcolor: customBg ? alpha(customBg, 0.9) : alpha(NAVY, 0.04),
            borderColor: customBg ? 'transparent' : NAVY,
            boxShadow: 'none',
          },
        }
      : {
          bgcolor: '#fff',
          color: NAVY,
          border: `1.5px solid ${BORDER_BLUE}`,
          '&:hover': { bgcolor: alpha(NAVY, 0.04), borderColor: NAVY, boxShadow: 'none' },
        };

  const handleClick = (event) => {
    if (isEligibilityButton) {
      event.preventDefault();
      onEligibilityScroll?.(event);
      return;
    }
    if (!isJoinMovementHref(href)) return;
    event.preventDefault();
    onJoinClick?.(event);
  };

  if (isEligibilityButton || isJoinMovementHref(href)) {
    return (
      <Button
        type="button"
        variant="contained"
        size="large"
        onClick={handleClick}
        sx={{ ...baseSx, ...variantSx }}
      >
        <Box
          component="span"
          sx={{ display: 'block', width: '100%', textAlign: 'center', lineHeight: 1.25 }}
        >
          {label}
        </Box>
        {iconNode && (
          <Box
            sx={{
              position: 'absolute',
              right: { xs: 14, sm: 16, md: 18 },
              top: '50%',
              transform: 'translateY(-50%)',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            {iconNode}
          </Box>
        )}
      </Button>
    );
  }

  if (isHashHref(href)) {
    return (
      <Button
        component="a"
        href={href}
        variant={isPrimary ? 'contained' : 'outlined'}
        size="large"
        sx={{ ...baseSx, ...variantSx }}
      >
        <Box
          component="span"
          sx={{ display: 'block', width: '100%', textAlign: 'center', lineHeight: 1.25 }}
        >
          {label}
        </Box>
        {iconNode && (
          <Box
            sx={{
              position: 'absolute',
              right: { xs: 14, sm: 16, md: 18 },
              top: '50%',
              transform: 'translateY(-50%)',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            {iconNode}
          </Box>
        )}
      </Button>
    );
  }

  if (isExternalHref(href)) {
    return (
      <Button
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        variant={isPrimary ? 'contained' : 'outlined'}
        size="large"
        sx={{ ...baseSx, ...variantSx }}
      >
        <Box
          component="span"
          sx={{ display: 'block', width: '100%', textAlign: 'center', lineHeight: 1.25 }}
        >
          {label}
        </Box>
        {iconNode && (
          <Box
            sx={{
              position: 'absolute',
              right: { xs: 14, sm: 16, md: 18 },
              top: '50%',
              transform: 'translateY(-50%)',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            {iconNode}
          </Box>
        )}
      </Button>
    );
  }

  return (
    <Button
      component={RouterLink}
      href={normalizeAppPath(href)}
      variant={isPrimary ? 'contained' : 'outlined'}
      size="large"
      sx={{ ...baseSx, ...variantSx }}
    >
      <Box
        component="span"
        sx={{ display: 'block', width: '100%', textAlign: 'center', lineHeight: 1.25 }}
      >
        {label}
      </Box>
      {iconNode && (
        <Box
          sx={{
            position: 'absolute',
            right: { xs: 14, sm: 16, md: 18 },
            top: '50%',
            transform: 'translateY(-50%)',
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {iconNode}
        </Box>
      )}
    </Button>
  );
}

function HeroStatIcon({ icon, size = 26 }) {
  const value = String(icon || '').trim();
  if (!value) return null;
  const desktopSize = Math.max(16, Math.min(56, Number(size) || 26));
  const tabletSize = Math.max(15, Math.min(48, Math.round(desktopSize * 0.88)));
  const mobileSize = Math.max(14, Math.min(40, Math.round(desktopSize * 0.76)));
  if (isLikelyImagePath(value)) {
    return (
      <Box
        component="img"
        src={value}
        alt=""
        sx={{
          width: { xs: mobileSize, sm: tabletSize, md: desktopSize },
          height: { xs: mobileSize, sm: tabletSize, md: desktopSize },
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <Iconify
      icon={value}
      sx={{
        color: '#fff',
        flexShrink: 0,
        width: { xs: mobileSize, sm: tabletSize, md: desktopSize },
        height: { xs: mobileSize, sm: tabletSize, md: desktopSize },
      }}
    />
  );
}

/** Navy stats bar — full width of hero content, below copy row. */
function HeroStatsBar({ stats = [], iconSize = 26 }) {
  const rows = (stats || []).filter(
    (row) => String(row?.value || '').trim() || String(row?.label || '').trim()
  );
  if (!rows.length) return null;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        borderRadius: { xs: '18px', sm: '22px', md: '26px' },
        bgcolor: '#06144D',
        backgroundImage: `linear-gradient(135deg, ${alpha('#153A96', 0.5)} 0%, ${alpha('#001A70', 0.92)} 48%, ${alpha('#000C39', 0.92)} 100%)`,
        flexShrink: 0,
        overflow: 'hidden',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <Grid container>
        {rows.map((row, index) => (
          <Grid
            key={`hero-stat-${index}`}
            xs={6}
            md={3}
            sx={{
              position: 'relative',
              px: { xs: 1.5, sm: 2.5, md: 3.5 },
              py: { xs: 2, sm: 2.75, md: 3.8 },
              minHeight: { xs: 0, md: 96 },
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, md: 1.5 },
              borderBottom: {
                xs: index < 2 && rows.length > 2 ? `1px solid ${alpha('#fff', 0.16)}` : 'none',
                md: 'none',
              },
              borderRight: {
                xs:
                  index % 2 === 0 && rows.length > 1 ? `1px solid ${alpha('#fff', 0.16)}` : 'none',
                md: 'none',
              },
              ...(index < rows.length - 1 && {
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '18%',
                  right: 0,
                  width: '1px',
                  height: '64%',
                  bgcolor: alpha('#fff', 0.24),
                  display: { xs: 'none', md: 'block' },
                },
              }),
            }}
          >
            <HeroStatIcon icon={row.icon} size={iconSize} />
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  color: '#fff',
                  ...FLUID_TYPOGRAPHY.statLabel,
                  letterSpacing: '-0.015em',
                }}
              >
                {row.value}
              </Typography>
              <Typography
                sx={{
                  color: alpha('#fff', 0.88),
                  ...FLUID_TYPOGRAPHY.micro,
                }}
              >
                {row.label}
              </Typography>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function HomeHeroSection({ onOpenMembershipSignup }) {
  const navigate = useNavigate();
  const { authenticated } = useAuthContext();
  const [hero, setHero] = useState(() => resolveHomeHeroData({}));

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        setHero(resolveHomeHeroData(settings));
      })
      .catch(() => {
        if (active) setHero(resolveHomeHeroData({}));
      });
    return () => {
      active = false;
    };
  }, []);

  const descriptionHtml = useMemo(
    () => normalizeRichTextHtml(hero.description),
    [hero.description]
  );

  const headlineColor = hero.headlineColor?.trim() || NAVY;
  const headlineAccentColor = hero.headlineAccentColor?.trim() || RED;

  const primaryCta = useMemo(
    () => (hero.cta?.label?.trim() ? { ...hero.cta, variant: 'primary' } : null),
    [hero.cta]
  );

  const secondaryCtas = useMemo(
    () =>
      (hero.secondaryCtas || [])
        .filter((row) => row?.label?.trim())
        .map((row) => ({ ...row, variant: 'outline' })),
    [hero.secondaryCtas]
  );

  const hasCtas = Boolean(primaryCta) || secondaryCtas.length > 0;

  const handleJoinClick = useCallback(() => {
    if (!authenticated) {
      onOpenMembershipSignup?.();
      return;
    }
    navigate('/learning');
  }, [authenticated, navigate, onOpenMembershipSignup]);

  const handleEligibilityScroll = useCallback(() => {
    const target = document.getElementById('eligibility-membership');
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <Box
        component="section"
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          overflowX: 'hidden',
          overflowY: 'clip',
          isolation: 'isolate',
          bgcolor: '#ffffff',
          minHeight: { xs: 'auto', md: 680 },
          background: {
            xs: `linear-gradient(180deg, ${alpha(NAVY, 0.04)} 0%, #ffffff 28%)`,
            md: '#ffffff',
          },
        }}
      >
        <DashboardContent
          variant="fullWidth"
          sx={{
            position: 'relative',
            zIndex: 1,
            minHeight: { xs: 'auto', md: 680 },
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            px: { xs: 2, sm: 3, md: 3, lg: 'var(--layout-dashboard-content-px, 24px)' },
            pt: {
              xs: 'calc(var(--layout-header-mobile-height, 64px) + 4px)',
              sm: 'calc(var(--layout-header-mobile-height, 64px) + 8px)',
              md: 'calc(var(--layout-header-desktop-height, 64px) + 2px)',
            },
            pb: { xs: 2.5, md: 0 },
          }}
        >
          <HeroFullWidthBackdrop imageSrc={hero.backgroundImageUrl} />

          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              display: 'flex',
              alignItems: { xs: 'flex-start', md: 'flex-start' },
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              pb: { xs: 2, md: 4 },
              pt: { md: 0 },
            }}
          >
            <Grid
              component={m.div}
              initial={HERO_TEXT_ANIMATION.initial}
              animate={HERO_TEXT_ANIMATION.animate}
              transition={HERO_TEXT_ANIMATION.transition}
              container
              columnSpacing={0}
              rowSpacing={0}
              alignItems={{ xs: 'flex-start', md: 'flex-start' }}
              sx={{ width: '100%', maxWidth: '100%', m: 0, willChange: 'opacity, transform' }}
            >
              <Grid
                xs={12}
                md={6}
                lg={5}
                sx={{ minWidth: 0, p: 0, pr: { md: 2 }, maxWidth: { md: 'none' } }}
              >
                <Stack
                  alignItems="flex-start"
                  sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
                >
                  {hero.badgeLogoUrl?.trim() ? (
                    <Box
                      component="img"
                      src={hero.badgeLogoUrl}
                      alt="AI Nexus"
                      sx={(theme) => ({
                        ...HERO_BADGE_LOGO_SX,
                      })}
                    />
                  ) : null}

                  <Stack
                    spacing={{ xs: 2, sm: 2.5, md: 3 }}
                    sx={{ width: '100%', maxWidth: '100%', minWidth: 0, alignItems: 'flex-start' }}
                  >
                    <Typography
                      component="h1"
                      sx={{
                        ...FLUID_TYPOGRAPHY.heroHeadline,
                        m: 0,
                        maxWidth: '100%',
                        overflowWrap: 'break-word',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: { xs: 0.5, sm: 0.625, md: 0.75 },
                      }}
                    >
                      {hero.headline?.trim() ? (
                        <Box component="span" sx={{ color: headlineColor, display: 'block' }}>
                          {hero.headline}
                        </Box>
                      ) : null}
                      {hero.headlineAccent?.trim() ? (
                        <Box component="span" sx={{ color: headlineAccentColor, display: 'block' }}>
                          {hero.headlineAccent}
                        </Box>
                      ) : null}
                    </Typography>

                    {descriptionHtml ? (
                      <RichTextContent
                        html={descriptionHtml}
                        sx={{
                          color: NAVY,
                          ...FLUID_TYPOGRAPHY.heroDescription,
                          maxWidth: '100%',
                          '& p': { m: 0 },
                          '& p + p': { mt: 1 },
                        }}
                      />
                    ) : null}

                    <HeroMobileImage imageSrc={hero.backgroundImageUrl} />

                    {hasCtas ? (
                      <Stack
                        spacing={{ xs: 1.25, sm: 1.25, md: 1.5 }}
                        sx={{
                          width: '100%',
                          maxWidth: '100%',
                          pt: { xs: 0.25, md: 0.5 },
                          boxSizing: 'border-box',
                        }}
                      >
                        {secondaryCtas.length ? (
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, minmax(0, 1fr))',
                              },
                              gap: { xs: 1.25, sm: 1.25, md: 1.5 },
                              width: '100%',
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                            }}
                          >
                            {secondaryCtas.map((cta, index) => (
                              <HeroCtaButton
                                key={`hero-secondary-cta-${index}-${cta.label}`}
                                cta={cta}
                                variant="outline"
                                onJoinClick={handleJoinClick}
                                onEligibilityScroll={handleEligibilityScroll}
                              />
                            ))}
                          </Box>
                        ) : null}

                        {primaryCta ? (
                          <Box sx={{ width: '100%' }}>
                            <HeroCtaButton
                              cta={primaryCta}
                              variant="primary"
                              onJoinClick={handleJoinClick}
                              onEligibilityScroll={handleEligibilityScroll}
                            />
                          </Box>
                        ) : null}
                      </Stack>
                    ) : null}
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          </Box>

          <Box
            component={m.div}
            initial={HERO_FOOTER_ANIMATION.initial}
            animate={HERO_FOOTER_ANIMATION.animate}
            transition={HERO_FOOTER_ANIMATION.transition}
            sx={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              mt: { xs: 2.5, md: 'auto' },
              pt: { xs: 0, md: 6 },
              willChange: 'opacity, transform',
            }}
          >
            <HeroStatsBar stats={hero.stats} iconSize={hero.statIconSize} />
          </Box>
        </DashboardContent>
      </Box>
    </>
  );
}
