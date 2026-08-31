import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { CONFIG } from 'src/config-global';
import { appSettingsService } from 'src/services/app-settings.service';
import { resolvePartnerWithIscaContent } from './partner-with-isca-defaults';
import { DashboardContent } from 'src/layouts/dashboard';
import { HomeFooter } from 'src/layouts/main/footer';
import { layoutClasses } from 'src/layouts/classes';
import { frontendContentSx } from 'src/layouts/main/frontend-content-layout';
import { HOME_DASHBOARD_CONTENT_SX } from 'src/sections/home/home-section-styles';
import { PartnerWithIscaPartnerLogosSections } from 'src/sections/home/home-supporting-partners-section';
import { FLUID_FONT_SIZES, FLUID_TYPOGRAPHY } from 'src/theme/home-typography';
import {
  PARTNER_BODY_MD_SX,
  PARTNER_BODY_SX,
  PARTNER_BUTTON_TEXT_SX,
  PARTNER_CARD_TITLE_SX,
  PARTNER_CTA_BODY_SX,
  PARTNER_CTA_TITLE_SX,
  PARTNER_EYEBROW_SX,
  PARTNER_FAQ_ANSWER_SX,
  PARTNER_FAQ_QUESTION_SX,
  PARTNER_FEATURE_TITLE_SX,
  PARTNER_HERO_BODY_SX,
  PARTNER_HERO_EYEBROW_SX,
  PARTNER_HERO_TITLE_SX,
  PARTNER_SECTION_TITLE_SX,
  PARTNER_STEP_BODY_SX,
  PARTNER_STEP_TITLE_SX,
} from './partner-with-isca-typography';

import {
  BENEFIT_ICON_TONES,
  ISCA_BORDER,
  ISCA_DARK_NAVY,
  PAGE_FONT_FAMILY,
  ISCA_PANEL_BG,
  ISCA_RED,
  ISCA_RED_DARK,
} from './partner-with-isca-theme';

// ----------------------------------------------------------------------

const ASSET_BASE_URL = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');

const HERO_NAVY = '#1C4270';
const HERO_RED = '#E32B24';
const HERO_BORDER_BLUE = '#5C7AA1';
const HERO_IMAGE_WIDTH = '58%';
const HERO_EASE = [0.19, 1, 0.22, 1];
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

function resolveAssetUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${ASSET_BASE_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function isLikelyImagePath(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(s);
}

function HeroMobileImage({ imageSrc }) {
  const src = String(imageSrc || '').trim();
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
        boxShadow: `0 20px 40px ${alpha(HERO_NAVY, 0.14)}, 0 4px 12px ${alpha(HERO_NAVY, 0.06)}`,
        border: `1px solid ${alpha(HERO_NAVY, 0.08)}`,
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

function HeroFullWidthBackdrop({ imageSrc, overlayHeader = false }) {
  const src = String(imageSrc || '').trim();
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
        pointerEvents: 'none',
        bgcolor: '#ffffff',
        willChange: 'opacity, transform',
      }}
    >
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
          top: overlayHeader ? { xs: 52, md: 76 } : 0,
          right: 0,
          bottom: overlayHeader ? { xs: 40, sm: 44, md: 48 } : { md: 24 },
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

function HeroStatsBar({ stats = [], iconSize = 26 }) {
  const rows = (stats || []).filter(
    (row) => String(row?.title || row?.value || '').trim() || String(row?.label || '').trim()
  );
  if (!rows.length) return null;

  const mdCols = Math.max(1, Math.min(4, Math.floor(12 / rows.length)));
  const xsCols = rows.length === 1 ? 12 : 6;

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
            key={`partner-hero-stat-${index}`}
            xs={xsCols}
            md={mdCols}
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
                xs: index % 2 === 0 && rows.length > 1 ? `1px solid ${alpha('#fff', 0.16)}` : 'none',
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
                {row.title || row.value}
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

/** Home-page content width only — does not change section visual design. */
function PartnerLayoutSection({ id, children, sx, contentSx }) {
  return (
    <Box id={id} component="section" sx={{ scrollMarginTop: '80px', ...sx }}>
      <DashboardContent sx={{ ...HOME_DASHBOARD_CONTENT_SX, py: 0, ...contentSx }}>{children}</DashboardContent>
    </Box>
  );
}

function Eyebrow({ children, align = 'center', sx }) {
  return (
    <Typography sx={{ ...PARTNER_EYEBROW_SX, textAlign: align, mb: 1.25, ...sx }}>
      {children}
    </Typography>
  );
}

function SectionTitle({ children, align = 'center', sx }) {
  return (
    <Typography component="h2" sx={{ ...PARTNER_SECTION_TITLE_SX, textAlign: align, ...sx }}>
      {children}
    </Typography>
  );
}

function HeroCtaButton({ children, variant = 'red', href, onClick, component, ...other }) {
  const isPrimary = variant === 'red';

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

  const variantSx = isPrimary
    ? {
        bgcolor: HERO_RED,
        color: '#fff',
        border: 'none',
        '&:hover': { bgcolor: '#C4241E', boxShadow: 'none' },
      }
    : {
        bgcolor: '#fff',
        color: HERO_NAVY,
        border: `1.5px solid ${HERO_BORDER_BLUE}`,
        '&:hover': { bgcolor: alpha(HERO_NAVY, 0.04), borderColor: HERO_NAVY, boxShadow: 'none' },
      };

  return (
    <Button
      component={component}
      href={href}
      onClick={onClick}
      variant={isPrimary ? 'contained' : 'outlined'}
      size="large"
      sx={{ ...baseSx, ...variantSx }}
      {...other}
    >
      <Box component="span" sx={{ display: 'block', width: '100%', textAlign: 'center', lineHeight: 1.25 }}>
        {children}
      </Box>
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
        <Iconify icon="solar:arrow-right-linear" width={18} />
      </Box>
    </Button>
  );
}

function HeroSection({ hero, stats }) {
  const heroImageUrl = resolveAssetUrl(hero?.heroImageUrl);
  const heroActions = (hero?.actions || []).filter((action) => String(action?.label || '').trim());

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        overflowY: 'visible',
        bgcolor: '#ffffff',
        minHeight: { xs: 'auto', md: 560 },
        background: {
          xs: `linear-gradient(180deg, ${alpha(HERO_NAVY, 0.04)} 0%, #ffffff 28%)`,
          md: '#ffffff',
        },
      }}
    >
      <DashboardContent
        variant="fullWidth"
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: { xs: 'auto', md: 560 },
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
          overflowY: 'visible',
          boxSizing: 'border-box',
          px: { xs: 2, sm: 3, md: 3, lg: 'var(--layout-dashboard-content-px, 24px)' },
          pt: { xs: 2.5, md: 4 },
          pb: { xs: 2.5, md: 0 },
        }}
      >
        <HeroFullWidthBackdrop imageSrc={heroImageUrl} overlayHeader={false} />

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            display: 'flex',
            alignItems: { xs: 'flex-start', md: 'flex-start' },
            width: '100%',
            maxWidth: '100%',
            overflowX: 'hidden',
            overflowY: 'visible',
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
            alignItems={{ xs: 'flex-start', md: 'flex-start' }}
            sx={{ width: '100%', maxWidth: '100%', m: 0, willChange: 'opacity, transform' }}
          >
            <Grid xs={12} md={6} lg={5} sx={{ minWidth: 0, pr: { md: 2 }, maxWidth: { md: 'none' } }}>
              <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
                {hero?.eyebrow?.trim() ? (
                  <Typography component="span" sx={PARTNER_HERO_EYEBROW_SX}>
                    {hero.eyebrow}
                  </Typography>
                ) : null}

                <Typography
                  component="h1"
                  sx={{
                    ...PARTNER_HERO_TITLE_SX,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: { xs: 0.5, sm: 0.625, md: 0.75 },
                  }}
                >
                  {hero?.headline?.trim() ? (
                    <Box component="span" sx={{ display: 'block', color: 'secondary.main' }}>
                      {hero.headline}
                    </Box>
                  ) : null}
                  {hero?.headlineAccent?.trim() ? (
                    <Box component="span" sx={{ display: 'block', color: 'primary.main' }}>
                      {hero.headlineAccent}
                    </Box>
                  ) : null}
                </Typography>

                {hero?.description ? (
                  <RichTextContent
                    html={hero.description}
                    sx={{
                      ...PARTNER_HERO_BODY_SX,
                      maxWidth: '100%',
                      '& p': { m: 0 },
                      '& p + p': { mt: 1 },
                    }}
                  />
                ) : null}

                <HeroMobileImage imageSrc={heroImageUrl} />

                {heroActions.length ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                      gap: { xs: 1.25, sm: 1.25, md: 1.5 },
                      width: '100%',
                      maxWidth: '100%',
                      pt: { xs: 0.25, md: 0.5 },
                      boxSizing: 'border-box',
                    }}
                  >
                    {heroActions.map((action) => {
                      const label = String(action?.label || '').trim();
                      const scrollTo = String(action?.scrollTo || '').trim();
                      const href = String(action?.href || '').trim();
                      const variant = action?.variant === 'red' ? 'red' : 'outline';

                      if (scrollTo) {
                        return (
                          <HeroCtaButton
                            key={`${label}-${scrollTo}`}
                            variant={variant}
                            onClick={() => scrollToSection(scrollTo)}
                          >
                            {label}
                          </HeroCtaButton>
                        );
                      }

                      if (href) {
                        return (
                          <HeroCtaButton
                            key={`${label}-${href}`}
                            variant={variant}
                            component={RouterLink}
                            href={href}
                          >
                            {label}
                          </HeroCtaButton>
                        );
                      }

                      return null;
                    })}
                  </Box>
                ) : null}
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
            pt: { xs: 0, md: 3 },
            willChange: 'opacity, transform',
          }}
        >
          <HeroStatsBar stats={stats} />
        </Box>
      </DashboardContent>
    </Box>
  );
}

function BenefitsSection({ section }) {
  const items = Array.isArray(section?.items) ? section.items : [];

  return (
    <PartnerLayoutSection id="benefits" sx={{ py: { xs: 7, md: 10 }, bgcolor: '#fff' }}>
      <Eyebrow>{section?.eyebrow}</Eyebrow>
      <SectionTitle>{section?.title}</SectionTitle>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
          },
          gap: { xs: 2, sm: 'clamp(1rem, 0.75rem + 1vw, 1.5rem)' },
        }}
      >
        {items.map((item) => {
          const tone = BENEFIT_ICON_TONES[item.iconTone] || BENEFIT_ICON_TONES.navy;

          return (
            <Box
              key={item.title}
              sx={{
                minWidth: 0,
                bgcolor: '#fff',
                border: `1.5px solid ${ISCA_BORDER}`,
                borderRadius: { xs: '10px', md: '12px' },
                p: { xs: 2.5, sm: 'clamp(1.25rem, 1rem + 0.8vw, 1.75rem)' },
                transition: 'border-color 0.15s, transform 0.15s',
                '&:hover': {
                  borderColor: ISCA_RED,
                  transform: 'translateY(-3px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 'clamp(2.5rem, 2.2rem + 1vw, 3rem)',
                  height: 'clamp(2.5rem, 2.2rem + 1vw, 3rem)',
                  borderRadius: { xs: '10px', md: '12px' },
                  bgcolor: tone.bg,
                  color: tone.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: { xs: 1.5, md: 2 },
                  flexShrink: 0,
                }}
              >
                <Iconify
                  icon={item.icon}
                  sx={{
                    width: 'clamp(1.125rem, 1rem + 0.45vw, 1.375rem)',
                    height: 'clamp(1.125rem, 1rem + 0.45vw, 1.375rem)',
                  }}
                />
              </Box>
              <Typography component="h3" sx={PARTNER_CARD_TITLE_SX}>
                {item.title}
              </Typography>
              <Typography sx={PARTNER_BODY_SX}>{item.description}</Typography>
            </Box>
          );
        })}
      </Box>
    </PartnerLayoutSection>
  );
}


function DashboardMockupImage({ imageUrl }) {
  const src = resolveAssetUrl(imageUrl);

  if (!src) {
    return (
      <Box
        sx={{
          width: 1,
          minHeight: { xs: 240, md: 320 },
          borderRadius: '14px',
          border: `1.5px dashed ${ISCA_BORDER}`,
          bgcolor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
          Dashboard mockup image will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 1,
        maxWidth: 1,
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1.5px solid #dde4f0',
        bgcolor: '#fff',
        lineHeight: 0,
      }}
    >
      <Box
        component="img"
        src={src}
        alt="Corporate dashboard"
        sx={{
          width: '100%',
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          verticalAlign: 'middle',
        }}
      />
    </Box>
  );
}

function DashboardSection({ section }) {
  const features = Array.isArray(section?.features) ? section.features : [];

  return (
    <PartnerLayoutSection
      sx={{
        bgcolor: ISCA_PANEL_BG,
        py: { xs: 7, md: 10 },
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          // Mobile + laptop: stacked full-width image. Large desktop: side-by-side.
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1.6fr)' },
          gap: { xs: 4, md: 5, lg: 8 },
          alignItems: 'start',
        }}
      >
        <Box sx={{ minWidth: 0, width: 1 }}>
          <Eyebrow align="left">{section?.eyebrow}</Eyebrow>
          <SectionTitle align="left" sx={{ mb: 1.5 }}>
            {section?.title}
          </SectionTitle>
          <RichTextContent
            html={section?.description}
            sx={{
              ...PARTNER_BODY_MD_SX,
              '& p': { m: 0 },
            }}
          />

          <Stack spacing={2.25} sx={{ mt: 3.5 }}>
            {features.map((item) => (
              <Stack key={item.title} direction="row" spacing={1.75} alignItems="flex-start">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: ISCA_RED,
                    mt: 0.75,
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography sx={PARTNER_FEATURE_TITLE_SX}>{item.title}</Typography>
                  <Typography sx={PARTNER_BODY_SX}>{item.description}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Box sx={{ minWidth: 0, width: 1 }}>
          <DashboardMockupImage imageUrl={section?.mockupImageUrl} />
        </Box>
      </Box>
    </PartnerLayoutSection>
  );
}

function HowItWorksSection({ section }) {
  const steps = Array.isArray(section?.steps) ? section.steps : [];

  return (
    <PartnerLayoutSection
      id="how-it-works"
      sx={{
        bgcolor: ISCA_PANEL_BG,
        py: { xs: 7, md: 10 },
        borderTop: '1px solid #e2e8f0',
      }}
    >
      <Eyebrow>{section?.eyebrow}</Eyebrow>
      <SectionTitle sx={{ mb: 0 }}>{section?.title}</SectionTitle>

      <Box
        sx={{
          position: 'relative',
          mt: 4.5,
          bgcolor: '#fff',
          border: '1.5px solid #dde4f0',
          borderRadius: '16px',
          p: { xs: '32px 24px', md: '44px 44px 40px' },
        }}
      >
            <Typography
              sx={{
                ...PARTNER_BODY_SX,
                position: { xs: 'static', md: 'absolute' },
                top: 20,
                right: 24,
                mb: { xs: 2, md: 0 },
                textAlign: { xs: 'center', md: 'right' },
                fontWeight: 600,
              }}
            >
              {section?.note}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: { xs: 4, md: 0 },
                position: 'relative',
                '&::before': {
                  content: '""',
                  display: { xs: 'none', md: 'block' },
                  position: 'absolute',
                  top: 35,
                  left: 'calc(16.66% + 35px)',
                  right: 'calc(16.66% + 35px)',
                  height: 2,
                  bgcolor: ISCA_RED,
                  zIndex: 0,
                },
              }}
            >
              {steps.map((step) => (
                <Box key={step.title} sx={{ textAlign: 'center', px: 2.5, position: 'relative', zIndex: 1 }}>
                  <Box
                    sx={{
                      width: 70,
                      height: 70,
                      borderRadius: '50%',
                      mx: 'auto',
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${ISCA_RED}`,
                      bgcolor: step.done ? ISCA_RED : '#fde8ea',
                      color: step.done ? '#fff' : ISCA_RED,
                    }}
                  >
                    <Iconify icon={step.icon} width={26} />
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      ...PARTNER_EYEBROW_SX,
                      display: 'inline-block',
                      bgcolor: ISCA_RED,
                      color: '#fff',
                      px: 1.25,
                      py: 0.25,
                      borderRadius: '10px',
                      mb: 1.25,
                    }}
                  >
                    {step.badge}
                  </Box>
                  <Typography sx={PARTNER_STEP_TITLE_SX}>{step.title}</Typography>
                  <Typography sx={PARTNER_STEP_BODY_SX}>{step.description}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
    </PartnerLayoutSection>
  );
}

function FaqSection({ section }) {
  const [openIndex, setOpenIndex] = useState(null);
  const items = Array.isArray(section?.items) ? section.items : [];

  return (
    <PartnerLayoutSection id="faq" sx={{ py: { xs: 7, md: 10 }, bgcolor: '#fff' }} contentSx={{ maxWidth: 760, mx: 'auto' }}>
      <Eyebrow>{section?.eyebrow}</Eyebrow>
      <SectionTitle>{section?.title}</SectionTitle>

      <Box sx={{ mt: 5 }}>
        {items.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <Box
              key={item.question}
              sx={{
                borderBottom: `1px solid ${ISCA_BORDER}`,
                borderTop: index === 0 ? `1px solid ${ISCA_BORDER}` : 'none',
              }}
            >
              <Button
                fullWidth
                onClick={() => setOpenIndex(isOpen ? null : index)}
                endIcon={
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: `1.5px solid ${isOpen ? ISCA_RED : '#dde4f0'}`,
                      bgcolor: isOpen ? ISCA_RED : 'transparent',
                      color: isOpen ? '#fff' : ISCA_RED,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: isOpen ? 'rotate(45deg)' : 'none',
                      transition: 'transform 0.25s, background 0.2s, border-color 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon="eva:plus-fill" width={16} />
                  </Box>
                }
                sx={{
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  textTransform: 'none',
                  py: 2.25,
                  px: 0,
                  ...PARTNER_FAQ_QUESTION_SX,
                  color: 'secondary.main',
                  '&:hover': { bgcolor: 'transparent', color: 'secondary.main' },
                  '& .MuiButton-endIcon': { ml: 2 },
                }}
              >
                {item.question}
              </Button>

              <Collapse in={isOpen} timeout={350}>
                <Typography sx={PARTNER_FAQ_ANSWER_SX}>{item.answer}</Typography>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    </PartnerLayoutSection>
  );
}

function CtaSection({ section }) {
  const buttonHref = String(section?.buttonHref || paths.auth.simple.corporateSignUp).trim();

  return (
    <Box id="register" component="section" sx={{ scrollMarginTop: '80px' }}>
      <Box
        sx={{
          bgcolor: ISCA_DARK_NAVY,
          py: { xs: 7, md: 10 },
          px: { xs: 3, md: 6 },
          textAlign: 'center',
        }}
      >
        <Box sx={{ maxWidth: 640, mx: 'auto' }}>
          <Box
            component="span"
            sx={{
              ...PARTNER_EYEBROW_SX,
              display: 'inline-flex',
              alignItems: 'center',
              border: '1.5px solid rgba(232,25,44,0.5)',
              color: '#ff8a96',
              px: 1.75,
              py: 0.5,
              borderRadius: '20px',
              mb: 2.5,
            }}
          >
            {section?.eyebrow}
          </Box>

          <SectionTitle sx={{ ...PARTNER_CTA_TITLE_SX, mb: 1.75 }}>
            {section?.title}
          </SectionTitle>

          <RichTextContent
            html={section?.description}
            sx={{
              ...PARTNER_CTA_BODY_SX,
              color: '#7ba0d0',
              '& p': { m: 0 },
            }}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.75,
              flexWrap: 'wrap',
            }}
          >
            <Button
              component={RouterLink}
              href={buttonHref}
              endIcon={
                <Iconify
                  icon="solar:arrow-right-linear"
                  sx={{
                    width: { xs: 'clamp(0.875rem, 0.8rem + 0.3vw, 1rem)', md: 16 },
                    height: { xs: 'clamp(0.875rem, 0.8rem + 0.3vw, 1rem)', md: 16 },
                  }}
                />
              }
              sx={{
                textTransform: 'none',
                ...PARTNER_BUTTON_TEXT_SX,
                width: { xs: '100%', sm: 'auto' },
                maxWidth: 1,
                minWidth: 0,
                whiteSpace: { xs: 'normal', md: 'nowrap' },
                py: { xs: 1.5, md: 1.75 },
                px: { xs: 2, sm: 2.5, md: 3.5 },
                borderRadius: '7px',
                bgcolor: ISCA_RED,
                color: '#fff',
                border: `2px solid ${ISCA_RED}`,
                '& .MuiButton-endIcon': {
                  flexShrink: 0,
                  ml: { xs: 0.75, md: 1 },
                },
                '&:hover': {
                  bgcolor: ISCA_RED_DARK,
                  borderColor: ISCA_RED_DARK,
                },
              }}
            >
              {section?.buttonLabel}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------
//
const PRICING_CARDS = [
  {
    badge: 'Public Sector & Non-Profit',
    badgeBg: '#dbeafe',
    badgeColor: '#1d4ed8',
    accentColor: '#2563eb',
    title: 'Government Agencies, Non-Profit Organisations & Institutes of Higher Learning',
    description: 'Tiered pricing based on the total number of enrolled learners.',
    type: 'table',
    rows: [
      { label: '10 – 99 learners', price: 'S$298 / learner' },
      { label: '100 – 300 learners', price: 'S$218 / learner' },
      { label: '301+ learners', price: 'Custom quotation', isCustom: true },
    ],
    ctaLabel: 'Get a Quote',
    ctaHref: 'mailto:hello@ainexus.isca.org.sg',
    ctaBg: '#2563eb',
  },
  {
    badge: 'Corporate & Accounting',
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
    accentColor: '#dc2626',
    title: 'Corporates & Accounting Firms',
    description: 'Tiered pricing based on the total number of enrolled learners.',
    type: 'table',
    rows: [
      { label: '10 – 99 learners', price: 'S$388 / learner' },
      { label: '100 – 300 learners', price: 'S$272 / learner' },
      { label: '301+ learners', price: 'Custom quotation', isCustom: true },
    ],
    ctaLabel: 'Get a Quote',
    ctaHref: 'mailto:hello@ainexus.isca.org.sg',
    ctaBg: '#dc2626',
  },
  {
    badge: 'Strategic Partners',
    badgeBg: '#d1fae5',
    badgeColor: '#065f46',
    accentColor: '#059669',
    title: 'Strategic Partners',
    description: 'Custom quotation available for the following organisation types.',
    type: 'list',
    orgs: [
      'ISCA Corporate Members',
      'ISCA Approved Training Organisations',
      'Commercial CPD Providers',
      'Professional Bodies and Business Associations',
    ],
    note: 'Pricing can be tailored based on learner volume, partnership scope, delivery model, and implementation requirements.',
    ctaLabel: 'Get a Quote',
    ctaHref: 'mailto:hello@ainexus.isca.org.sg',
    ctaBg: '#059669',
  },
];

function PricingSection() {
  return (
    <PartnerLayoutSection id="pricing" sx={{ py: { xs: 7, md: 10 }, bgcolor: '#f4f6f9' }}>
      <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 6 } }}>
        <Typography component="h2" sx={{ ...PARTNER_SECTION_TITLE_SX, mb: 1.25 }}>
          Simple, Transparent Pricing
        </Typography>
        <Typography sx={{ ...PARTNER_BODY_SX, maxWidth: 560, mx: 'auto', color: '#5a6478' }}>
          Choose the plan that fits your organisation. Volume discounts are available, and the more learners you enrol, the lower the cost per seat.
        </Typography>
      </Box>

      <Box
        sx={{
          display: { xs: 'flex', md: 'grid' },
          flexDirection: 'column',
          gridTemplateColumns: { md: 'repeat(3, minmax(0, 1fr))' },
          gridTemplateRows: { md: 'auto auto 1fr auto' },
          columnGap: { md: 3.5 },
          rowGap: { xs: 3, md: 0 },
        }}
      >
        {PRICING_CARDS.map((card) => (
          <Box
            key={card.badge}
            sx={{
              bgcolor: '#fff',
              borderRadius: '16px',
              borderTop: `5px solid ${card.accentColor}`,
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 10px 36px rgba(0,0,0,0.12)',
              },
              display: 'grid',
              gridRow: { md: '1 / 5' },
              gridTemplateRows: { xs: 'auto auto 1fr auto', md: 'subgrid' },
            }}
          >
            {/* Row 1 — Header */}
            <Box sx={{ px: { xs: 3, md: 4 }, pt: { xs: '28px', md: '36px' }, pb: 2.5 }}>
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  px: 1.25,
                  py: 0.5,
                  borderRadius: '20px',
                  bgcolor: card.badgeBg,
                  color: card.badgeColor,
                  mb: 1.25,
                }}
              >
                {card.badge}
              </Box>
              <Typography
                component="h3"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  fontWeight: 700,
                  color: '#1a1a2e',
                  lineHeight: 1.3,
                  mb: 0.75,
                }}
              >
                {card.title}
              </Typography>
              <Typography sx={{ ...PARTNER_BODY_SX, color: '#5a6478' }}>{card.description}</Typography>
            </Box>

            {/* Row 2 — Divider */}
            <Divider />

            {/* Row 3 — Content */}
            <Box sx={{ px: { xs: 3, md: 4 }, py: 3 }}>
              {card.type === 'table' ? (
                <Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', pb: 1.25 }}>
                    {['Learner Volume', 'Price'].map((h) => (
                      <Typography
                        key={h}
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.07em',
                          color: '#8a94a6',
                          textAlign: h === 'Price' ? 'right' : 'left',
                        }}
                      >
                        {h}
                      </Typography>
                    ))}
                  </Box>
                  {card.rows.map((row) => (
                    <Box
                      key={row.label}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        borderTop: '1px solid #f0f2f7',
                        py: 1.5,
                      }}
                    >
                      <Typography sx={{ fontSize: '0.9rem', color: '#2d3748', lineHeight: 1.4 }}>
                        {row.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: row.isCustom ? '0.82rem' : '0.9rem',
                          fontWeight: row.isCustom ? 600 : 700,
                          fontStyle: row.isCustom ? 'italic' : 'normal',
                          color: row.isCustom ? '#8a94a6' : card.accentColor,
                          whiteSpace: 'nowrap',
                          textAlign: 'right',
                        }}
                      >
                        {row.price}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {card.orgs.map((org, i) => (
                    <Box
                      key={org}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: i === 0 ? 'none' : '1px solid #f0f2f7',
                        py: 1.25,
                      }}
                    >
                      <Typography sx={{ fontSize: '0.9rem', color: '#2d3748', flex: 1, pr: 1.5 }}>
                        {org}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          fontStyle: 'italic',
                          color: '#065f46',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Custom Quote
                      </Typography>
                    </Box>
                  ))}
                  <Box
                    sx={{
                      bgcolor: '#f0fdf4',
                      borderLeft: '3px solid #059669',
                      borderRadius: '6px',
                      px: 1.75,
                      py: 1.5,
                      mt: 1.5,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.8rem', color: '#374151', lineHeight: 1.55 }}>
                      <Box component="strong" sx={{ color: '#065f46' }}>Note: </Box>
                      {card.note}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Row 4 — Button */}
            <Box sx={{ px: { xs: 3, md: 4 }, pt: 2, pb: { xs: '24px', md: '32px' } }}>
              <Button
                fullWidth
                variant="contained"
                component="a"
                href={card.ctaHref}
                sx={{
                  bgcolor: card.ctaBg,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  borderRadius: '10px',
                  py: 1.5,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: card.ctaBg, opacity: 0.88, boxShadow: 'none' },
                }}
              >
                {card.ctaLabel}
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
    </PartnerLayoutSection>
  );
}

// ----------------------------------------------------------------------

export function PartnerWithIscaView() {
  const [content, setContent] = useState(() => resolvePartnerWithIscaContent(null));

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        setContent(resolvePartnerWithIscaContent(settings?.partnerWithIscaContent));
      })
      .catch(() => {
        if (active) setContent(resolvePartnerWithIscaContent(null));
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        overflowY: 'visible',
        flex: '0 0 auto',
        bgcolor: '#ffffff',
        color: 'text.primary',
        fontFamily: PAGE_FONT_FAMILY,
        lineHeight: 1.6,
        '--layout-dashboard-content-px': {
          xs: '16px',
          sm: '24px',
          md: '32px',
          lg: '48px',
          xl: '64px',
        },
        [`& .${layoutClasses.content}`]: frontendContentSx,
      }}
    >
      <HeroSection hero={content.hero} stats={content.stats} />
      <PricingSection />
      <BenefitsSection section={content.benefits} />
      <DashboardSection section={content.dashboard} />
      <HowItWorksSection section={content.howItWorks} />
      <FaqSection section={content.faq} />
      <CtaSection section={content.cta} />
      <PartnerWithIscaPartnerLogosSections />

      <HomeFooter sx={{ mt: 0, pb: { xs: 10, sm: 8, md: 6 } }} />
    </Box>
  );
}
