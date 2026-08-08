'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { layoutClasses } from 'src/layouts/classes';
import { frontendContentSx } from 'src/layouts/main/frontend-content-layout';
import { HOME_DASHBOARD_CONTENT_SX } from 'src/sections/home/home-section-styles';
import {
  PARTNER_HERO_BODY_SX,
  PARTNER_HERO_EYEBROW_SX,
  PARTNER_HERO_TITLE_SX,
} from 'src/sections/partner-with-isca/partner-with-isca-typography';

import heroEarthImage from 'src/assets/international/hero-earth.png';
import globalLearningImage from 'src/assets/international/global-learning.png';

import { CONFIG } from 'src/config-global';
import { getBackendOrigin } from 'src/lib/env';
import { IntlFooter } from '../intl-footer';
import { INTL_REGIONS, setStoredIntlRegion } from '../intl-region';
import {
  INTL_LANDING_DEFAULTS,
  normalizeIntlLandingContent,
} from '../intl-landing-defaults';
import { getInternationalLandingContent } from 'src/services/intl-landing.service';

// Next.js static imports are `{ src, width, height }` — use the string path for <img>.
const heroEarthSrc = typeof heroEarthImage === 'string' ? heroEarthImage : heroEarthImage?.src;
const globalLearningSrc =
  typeof globalLearningImage === 'string' ? globalLearningImage : globalLearningImage?.src;

// ----------------------------------------------------------------------

const NAVY = '#002060';
const RED = '#C00000';
const HERO_PAGE_BG = '#f4f7fb';

/**
 * Uploads live at `/uploads/...` on the backend (not under `/api`).
 * With NEXT_PUBLIC_API_PROXY, Next rewrites same-origin `/uploads/*` to BACKEND_ORIGIN.
 */
function resolveAssetUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith('/_next/')) return value;

  const path = value.startsWith('/') ? value : `/${value}`;

  // Never prefix /uploads with /api — that 404s.
  if (path.startsWith('/uploads/')) {
    if (typeof window !== 'undefined') return path;
    const origin = getBackendOrigin();
    return origin ? `${origin}${path}` : path;
  }

  const serverUrl = String(CONFIG.site.serverUrl || '').replace(/\/$/, '');
  const assetBase = serverUrl.replace(/\/api\/?$/, '');
  if (assetBase && assetBase !== serverUrl) {
    return `${assetBase}${path}`;
  }
  // Proxy mode (`/api`): keep same-origin paths
  if (!assetBase || assetBase === '') return path;
  return `${assetBase}${path}`;
}

// ----------------------------------------------------------------------

export function InternationalLandingView() {
  const router = useRouter();
  const regions = INTL_REGIONS;
  const [content, setContent] = useState(() => normalizeIntlLandingContent(INTL_LANDING_DEFAULTS));
  const [navigatingId, setNavigatingId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await getInternationalLandingContent();
      if (active) setContent(next);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectRegion = (next) => {
    if (navigatingId) return;
    setNavigatingId(next?.id || 'pending');
    setStoredIntlRegion(next);
    router.push(paths.dashboard);
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        overflowY: 'visible',
        flex: '0 0 auto',
        bgcolor: '#f4f7fb',
        color: NAVY,
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
      <HeroSection
        regions={regions}
        onSelectRegion={handleSelectRegion}
        hero={content.hero}
        navigatingId={navigatingId}
      />
      <GlobalSection globalLearning={content.globalLearning} />
      <TrustBar trustItems={content.trustItems} />
      <IntlFooter regions={regions} footer={content.footer} />
    </Box>
  );
}

// ----------------------------------------------------------------------
/** Same section shell as Partner with ISCA / Home. */
function SectionWrap({ id, children, sx, contentSx }) {
  return (
    <Box id={id} component="section" sx={{ scrollMarginTop: '80px', ...sx }}>
      <DashboardContent sx={{ ...HOME_DASHBOARD_CONTENT_SX, py: 0, ...contentSx }}>
        {children}
      </DashboardContent>
    </Box>
  );
}

/** Mobile/tablet hero visual — fills the card width (no side black bars). */
function HeroMobileImage({ imageSrc }) {
  if (!imageSrc) return null;

  return (
    <Box
      sx={{
        display: { xs: 'block', md: 'none' },
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        aspectRatio: '16 / 9',
        maxHeight: { xs: 220, sm: 280 },
        border: `1px solid ${alpha(NAVY, 0.1)}`,
        bgcolor: '#000b1e',
      }}
    >
      <Box
        component="img"
        src={imageSrc}
        alt=""
        loading="eager"
        decoding="async"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center center',
          display: 'block',
        }}
      />
    </Box>
  );
}

/** Simple full-bleed hero image on the right — no glow, rings, or stars. */
function HeroFullWidthBackdrop({ imageSrc }) {
  if (!imageSrc) return null;

  return (
    <Box
      aria-hidden
      sx={{
        display: { xs: 'none', md: 'block' },
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        bgcolor: HERO_PAGE_BG,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: { md: '72%', lg: '68%' },
          bgcolor: '#000b1e',
        }}
      />

      <Box
        component="img"
        src={imageSrc}
        alt=""
        loading="eager"
        decoding="async"
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: { md: '78%', lg: '72%' },
          // Taller than the section so we can shift down without a gap/strip at the top
          height: '118%',
          objectFit: 'cover',
          // Lower the focal point a bit (was sitting too high), keep top covered
          objectPosition: 'right 58%',
          display: 'block',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(
              90deg,
              ${HERO_PAGE_BG} 0%,
              ${HERO_PAGE_BG} 30%,
              rgba(244, 247, 251, 0.92) 40%,
              rgba(244, 247, 251, 0.45) 50%,
              rgba(244, 247, 251, 0.1) 56%,
              transparent 62%,
              transparent 100%
            )
          `,
        }}
      />
    </Box>
  );
}

function HeroSection({ regions = INTL_REGIONS, onSelectRegion, hero, navigatingId = null }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 4;
  const totalPages = Math.max(1, Math.ceil((regions?.length || 0) / PAGE_SIZE));
  const showNav = (regions?.length || 0) > PAGE_SIZE;
  const heroCopy = hero || INTL_LANDING_DEFAULTS.hero;
  const heroImageSrc = resolveAssetUrl(heroCopy.heroImageUrl) || heroEarthSrc;

  useEffect(() => {
    setPage(0);
  }, [regions]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const visibleRegions = (regions || []).slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        bgcolor: HERO_PAGE_BG,
        minHeight: { xs: 'auto', md: 620 },
        background: {
          xs: `linear-gradient(180deg, ${alpha(NAVY, 0.04)} 0%, ${HERO_PAGE_BG} 28%)`,
          md: HERO_PAGE_BG,
        },
      }}
    >
      <HeroFullWidthBackdrop imageSrc={heroImageSrc} />

      <DashboardContent
        variant="fullWidth"
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: { xs: 'auto', md: 620 },
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
          overflowY: 'visible',
          boxSizing: 'border-box',
          px: { xs: 2, sm: 3, md: 3, lg: 'var(--layout-dashboard-content-px, 24px)' },
          pt: { xs: 2.5, md: 4 },
          pb: { xs: 3, md: 4 },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            display: 'flex',
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: '100%',
            pb: { xs: 1, md: 2 },
          }}
        >
          <Box sx={{ width: { xs: '100%', md: '46%', lg: '40%' }, minWidth: 0, pr: { md: 1 } }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 2, sm: 2.5, md: 3 },
                width: '100%',
                maxWidth: '100%',
              }}
            >
              <Typography component="span" sx={PARTNER_HERO_EYEBROW_SX}>
                {heroCopy.eyebrow}
              </Typography>

              <Typography
                component="h1"
                sx={{
                  ...PARTNER_HERO_TITLE_SX,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 0.5, sm: 0.625, md: 0.75 },
                }}
              >
                <Box component="span" sx={{ display: 'block', color: 'secondary.main' }}>
                  {heroCopy.titleLine1}
                </Box>
                <Box component="span" sx={{ display: 'block', color: 'primary.main' }}>
                  {heroCopy.titleLine2}
                </Box>
              </Typography>

              <Typography sx={{ ...PARTNER_HERO_BODY_SX, maxWidth: '100%', m: 0 }}>
                {heroCopy.body}
              </Typography>

              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <HeroMobileImage imageSrc={heroImageSrc} />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 0.75, sm: 1 },
                  width: '100%',
                  maxWidth: '100%',
                }}
              >
                {showNav ? (
                  <Box
                    component="button"
                    type="button"
                    aria-label="Previous languages"
                    onClick={goPrev}
                    disabled={page === 0}
                    sx={{
                      flexShrink: 0,
                      width: { xs: 36, sm: 40 },
                      height: { xs: 36, sm: 40 },
                      borderRadius: '50%',
                      border: `1.5px solid ${alpha(NAVY, 0.16)}`,
                      bgcolor: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: page === 0 ? 'default' : 'pointer',
                      opacity: page === 0 ? 0.35 : 1,
                      color: NAVY,
                      p: 0,
                    }}
                  >
                    <Iconify icon="eva:arrow-ios-back-fill" width={20} />
                  </Box>
                ) : null}

                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: { xs: 1.25, sm: 1.5 },
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {visibleRegions.map((r) => {
                    const isLoading = navigatingId === r.id;
                    return (
                      <Box
                        key={r.id}
                        component="button"
                        type="button"
                        disabled={Boolean(navigatingId)}
                        onClick={() => onSelectRegion(r)}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          minHeight: { xs: 112, sm: 120 },
                          px: 1.5,
                          py: 2,
                          width: '100%',
                          bgcolor: '#fff',
                          border: `1.5px solid ${isLoading ? RED : alpha(NAVY, 0.14)}`,
                          borderRadius: '12px',
                          cursor: navigatingId ? 'wait' : 'pointer',
                          fontFamily: 'inherit',
                          opacity: navigatingId && !isLoading ? 0.55 : 1,
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation',
                        }}
                      >
                        {isLoading ? (
                          <CircularProgress size={28} thickness={4} sx={{ color: NAVY, my: 0.75 }} />
                        ) : (
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              bgcolor: alpha(NAVY, 0.05),
                              border: `1px solid ${alpha(NAVY, 0.1)}`,
                              display: 'grid',
                              placeItems: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            {r.flagCode ? (
                              <Box
                                component="img"
                                src={`https://flagcdn.com/w160/${r.flagCode}.png`}
                                srcSet={`https://flagcdn.com/w320/${r.flagCode}.png 2x`}
                                alt={`${r.label} flag`}
                                loading="lazy"
                                sx={{
                                  width: 30,
                                  height: 22,
                                  objectFit: 'cover',
                                  borderRadius: '3px',
                                }}
                              />
                            ) : (
                              <Iconify icon="solar:global-bold-duotone" width={24} sx={{ color: NAVY }} />
                            )}
                          </Box>
                        )}
                        <Typography
                          sx={{
                            fontWeight: 800,
                            fontSize: { xs: 13, sm: 14 },
                            color: NAVY,
                            lineHeight: 1.2,
                            textAlign: 'center',
                          }}
                        >
                          {isLoading ? 'Opening…' : r.label}
                        </Typography>
                        {!isLoading ? (
                          <Typography
                            sx={{
                              fontSize: { xs: 11, sm: 12 },
                              color: alpha(NAVY, 0.72),
                              fontWeight: 500,
                              lineHeight: 1.2,
                              textAlign: 'center',
                            }}
                          >
                            {r.nativeLabel}
                          </Typography>
                        ) : null}
                      </Box>
                    );
                  })}
                </Box>

                {showNav ? (
                  <Box
                    component="button"
                    type="button"
                    aria-label="Next languages"
                    onClick={goNext}
                    disabled={page >= totalPages - 1}
                    sx={{
                      flexShrink: 0,
                      width: { xs: 36, sm: 40 },
                      height: { xs: 36, sm: 40 },
                      borderRadius: '50%',
                      border: `1.5px solid ${alpha(NAVY, 0.16)}`,
                      bgcolor: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                      opacity: page >= totalPages - 1 ? 0.35 : 1,
                      color: NAVY,
                      p: 0,
                    }}
                  >
                    <Iconify icon="eva:arrow-ios-forward-fill" width={20} />
                  </Box>
                ) : null}
              </Box>
            </Box>
          </Box>
        </Box>
      </DashboardContent>
    </Box>
  );
}

function GlobalSection({ globalLearning }) {
  const section = globalLearning || INTL_LANDING_DEFAULTS.globalLearning;
  const imageSrc = resolveAssetUrl(section.imageUrl) || globalLearningSrc;
  const points = Array.isArray(section.points) ? section.points : [];
  const sideCard = section.sideCard || INTL_LANDING_DEFAULTS.globalLearning.sideCard;

  return (
    <SectionWrap sx={{ py: { xs: 3, md: 4 } }}>
      <Box
        sx={{
          border: `1px solid ${alpha(NAVY, 0.12)}`,
          borderRadius: '14px',
          bgcolor: '#f4f7fb',
          p: { xs: 2.5, md: 3.5 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.8fr 1fr' },
          gap: { xs: 3, md: 3 },
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{
              m: 0,
              mb: 2,
              fontWeight: 800,
              fontSize: { xs: 22, md: 26 },
              color: NAVY,
              lineHeight: 1.25,
            }}
          >
            {section.title}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {points.map((point) => (
              <Box key={point} sx={{ display: 'flex', gap: 1.1, alignItems: 'flex-start' }}>
                <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: RED, mt: '2px' }} />
                <Typography sx={{ fontSize: 14.5, color: alpha(NAVY, 0.85), lineHeight: 1.4 }}>
                  {point}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            borderRadius: '12px',
            overflow: 'hidden',
            minHeight: { xs: 180, md: 200 },
            aspectRatio: { xs: '16 / 10', md: 'auto' },
            alignSelf: 'stretch',
            border: `1px solid ${alpha(NAVY, 0.1)}`,
          }}
        >
          <Box
            component="img"
            src={imageSrc}
            alt=""
            loading="lazy"
            decoding="async"
            sx={{
              width: '100%',
              height: '100%',
              minHeight: { md: 200 },
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </Box>

        <Box
          sx={{
            bgcolor: alpha(NAVY, 0.06),
            borderRadius: '12px',
            p: 2.5,
            minHeight: 180,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Iconify icon={sideCard.icon} width={32} sx={{ color: NAVY, mb: 1.5 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: NAVY, mb: 1, lineHeight: 1.3 }}>
            {sideCard.title}
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: alpha(NAVY, 0.75), lineHeight: 1.5 }}>
            {sideCard.body}
          </Typography>
        </Box>
      </Box>
    </SectionWrap>
  );
}

function TrustBar({ trustItems }) {
  const items =
    Array.isArray(trustItems) && trustItems.length ? trustItems : INTL_LANDING_DEFAULTS.trustItems;

  return (
    <SectionWrap
      sx={{
        borderTop: `1px solid ${alpha(NAVY, 0.1)}`,
        borderBottom: `1px solid ${alpha(NAVY, 0.1)}`,
        bgcolor: '#fff',
        py: { xs: 3, md: 3.5 },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr 1fr',
            md:
              items.length <= 4
                ? `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`
                : 'repeat(4, minmax(0, 1fr))',
          },
          alignItems: 'center',
        }}
      >
        {items.map((item, index) => (
          <Box
            key={`${item.line1}-${item.line2}`}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              justifyContent: { xs: 'center', md: 'flex-start' },
              gap: { xs: 1.25, md: 1.5 },
              textAlign: { xs: 'center', md: 'left' },
              px: { xs: 1.5, md: 2.5 },
              py: { xs: 1.5, md: 0.5 },
              borderRight: {
                xs: 'none',
                md: index < items.length - 1 ? `1px solid ${alpha(NAVY, 0.14)}` : 'none',
              },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                bgcolor: alpha(item.accent, 0.1),
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Iconify icon={item.icon} width={26} sx={{ color: item.accent }} />
            </Box>
            <Typography
              sx={{
                m: 0,
                fontSize: { xs: 12.5, md: 13.5 },
                fontWeight: 700,
                color: item.accent,
                lineHeight: 1.3,
                letterSpacing: '0.01em',
              }}
            >
              {item.line1}
              <Box component="br" sx={{ display: { xs: 'none', md: 'block' } }} />
              <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                {' '}
              </Box>
              {item.line2}
            </Typography>
          </Box>
        ))}
      </Box>
    </SectionWrap>
  );
}
