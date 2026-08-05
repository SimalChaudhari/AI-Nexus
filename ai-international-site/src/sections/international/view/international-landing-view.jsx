'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Logo } from 'src/components/logo';
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

import { INTL_REGIONS, fetchIntlRegions, setStoredIntlRegion } from '../intl-region';

// Next.js static imports are `{ src, width, height }` — use the string path for <img>.
const heroEarthSrc = typeof heroEarthImage === 'string' ? heroEarthImage : heroEarthImage?.src;
const globalLearningSrc =
  typeof globalLearningImage === 'string' ? globalLearningImage : globalLearningImage?.src;

// ----------------------------------------------------------------------

const NAVY = '#002060';
const RED = '#C00000';
const HERO_IMAGE_WIDTH = '58%';

const TRUST_ITEMS = [
  {
    icon: 'solar:diploma-linear',
    lines: ['Industry-Recognized', 'Certificates'],
    accent: '#002060',
  },
  {
    icon: 'solar:shield-check-linear',
    lines: ['Verifiable Digital', 'Credentials'],
    accent: '#C00000',
  },
  {
    icon: 'solar:clock-circle-linear',
    lines: ['Flexible Learning', 'Anytime, Anywhere'],
    accent: '#0f766e',
  },
  {
    icon: 'solar:medal-ribbons-star-linear',
    lines: ['CPE Hours', 'Eligible'],
    accent: '#185FA5',
  },
];

const GLOBAL_POINTS = [
  'Localized content in your language',
  'Relevant to your market and regulations',
  'Recognized credentials that travel with you',
  "Built by ISCA — Asia's trusted accountancy body",
];

// ----------------------------------------------------------------------

export function InternationalLandingView() {
  const router = useRouter();
  const [regions, setRegions] = useState(INTL_REGIONS);
  const [loadingRegions, setLoadingRegions] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingRegions(true);
      const next = await fetchIntlRegions();
      if (active) {
        setRegions(next);
        setLoadingRegions(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectRegion = (next) => {
    setStoredIntlRegion(next);
    router.push(paths.internationalAiFluency);
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        overflowY: 'visible',
        flex: '0 0 auto',
        bgcolor: '#ffffff',
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
        loadingRegions={loadingRegions}
        onSelectRegion={handleSelectRegion}
      />
      <GlobalSection />
      <TrustBar />
      <IntlFooter regions={regions} />
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

/** Mobile-only hero visual — full-width card below copy (same as Home / Partner). */
function HeroMobileImage({ imageSrc }) {
  if (!imageSrc) return null;

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
        src={imageSrc}
        alt=""
        loading="eager"
        decoding="async"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          display: 'block',
        }}
      />
    </Box>
  );
}

/** Desktop: hero image right; left white fades into image (same as Home / Partner). */
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
        width: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        bgcolor: '#ffffff',
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
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: { md: 24 },
          width: HERO_IMAGE_WIDTH,
          overflow: 'hidden',
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
            objectPosition: { xs: 'center', md: '62% 45%' },
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

function HeroSection({ regions = INTL_REGIONS, loadingRegions = false, onSelectRegion }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 4;
  const totalPages = Math.max(1, Math.ceil((regions?.length || 0) / PAGE_SIZE));
  const showNav = (regions?.length || 0) > PAGE_SIZE;

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
        overflowX: 'hidden',
        overflowY: 'visible',
        bgcolor: '#ffffff',
        minHeight: { xs: 'auto', md: 560 },
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
          pb: { xs: 3, md: 4 },
        }}
      >
        <HeroFullWidthBackdrop imageSrc={heroEarthSrc} />

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
          <Box sx={{ width: { xs: '100%', md: '48%', lg: '42%' }, minWidth: 0, pr: { md: 2 } }}>
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
                AI Nexus International
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
                  AI Fluency.
                </Box>
                <Box component="span" sx={{ display: 'block', color: 'primary.main' }}>
                  Global Impact.
                </Box>
              </Typography>

              <Typography sx={{ ...PARTNER_HERO_BODY_SX, maxWidth: '100%', m: 0 }}>
                Future-ready AI learning for accountancy and finance professionals — practical skills,
                recognized credentials, and career growth no matter where you practice.
              </Typography>

              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <HeroMobileImage imageSrc={heroEarthSrc} />
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
                      transition: 'border-color .2s, box-shadow .2s',
                      '&:hover':
                        page === 0
                          ? undefined
                          : {
                              borderColor: RED,
                              boxShadow: `0 4px 12px ${alpha(RED, 0.12)}`,
                            },
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
                  {loadingRegions && !regions.length ? (
                    <Box
                      sx={{
                        gridColumn: '1 / -1',
                        display: 'grid',
                        placeItems: 'center',
                        minHeight: 120,
                      }}
                    >
                      <CircularProgress size={28} sx={{ color: NAVY }} />
                    </Box>
                  ) : null}
                  {visibleRegions.map((r) => (
                    <Box
                      key={r.id}
                      component="button"
                      type="button"
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
                        border: `1.5px solid ${alpha(NAVY, 0.14)}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        boxShadow: `0 2px 10px ${alpha(NAVY, 0.04)}`,
                        transition: 'border-color .2s, box-shadow .2s, transform .2s',
                        '&:hover': {
                          borderColor: RED,
                          transform: 'translateY(-2px)',
                          boxShadow: `0 8px 22px ${alpha(RED, 0.12)}`,
                        },
                      }}
                    >
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
                              boxShadow: `0 1px 4px ${alpha('#000', 0.18)}`,
                            }}
                          />
                        ) : (
                          <Iconify icon="solar:global-bold-duotone" width={24} sx={{ color: NAVY }} />
                        )}
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: 13, sm: 14 },
                          color: NAVY,
                          lineHeight: 1.2,
                          textAlign: 'center',
                        }}
                      >
                        {r.label}
                      </Typography>
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
                    </Box>
                  ))}
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
                      transition: 'border-color .2s, box-shadow .2s',
                      '&:hover':
                        page >= totalPages - 1
                          ? undefined
                          : {
                              borderColor: RED,
                              boxShadow: `0 4px 12px ${alpha(RED, 0.12)}`,
                            },
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

function GlobalSection() {
  return (
    <SectionWrap sx={{ py: { xs: 3, md: 4 } }}>
      <Box
        sx={{
          border: `1px solid ${alpha(NAVY, 0.12)}`,
          borderRadius: '14px',
          bgcolor: '#f8fafc',
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
            A Global Learning Experience
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {GLOBAL_POINTS.map((point) => (
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
            boxShadow: `0 12px 28px ${alpha(NAVY, 0.1)}`,
            border: `1px solid ${alpha(NAVY, 0.08)}`,
          }}
        >
          <Box
            component="img"
            src={globalLearningSrc}
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
          <Iconify icon="solar:users-group-rounded-bold-duotone" width={32} sx={{ color: NAVY, mb: 1.5 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: NAVY, mb: 1, lineHeight: 1.3 }}>
            For Professionals. By Professionals.
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: alpha(NAVY, 0.75), lineHeight: 1.5 }}>
            Join a global community of accountancy and finance professionals building AI fluency for
            real-world impact.
          </Typography>
        </Box>
      </Box>
    </SectionWrap>
  );
}

function TrustBar() {
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
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          alignItems: 'center',
        }}
      >
        {TRUST_ITEMS.map((item, index) => (
          <Box
            key={item.lines.join(' ')}
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
                md: index < TRUST_ITEMS.length - 1 ? `1px solid ${alpha(NAVY, 0.14)}` : 'none',
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
              {item.lines[0]}
              <Box component="br" sx={{ display: { xs: 'none', md: 'block' } }} />
              <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                {' '}
              </Box>
              {item.lines[1]}
            </Typography>
          </Box>
        ))}
      </Box>
    </SectionWrap>
  );
}

function IntlFooter({ regions = INTL_REGIONS }) {
  const [lang, setLang] = useState(regions[0]?.id || 'en');

  useEffect(() => {
    if (!regions.some((r) => r.id === lang) && regions[0]?.id) {
      setLang(regions[0].id);
    }
  }, [regions, lang]);

  const cols = [
    {
      title: 'Platform',
      links: [
        { label: 'AI Fluency', href: paths.internationalAiFluency },
        { label: 'Register', href: paths.auth.signUp },
        { label: 'Sign in', href: paths.auth.signIn },
        { label: 'FFAQ', href: null },
        { label: 'Sustainability Qualifications', href: null },
        { label: 'Accountify', href: null },
        { label: 'Boardflix', href: null },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'About', href: null },
        { label: 'FAQs', href: null },
        { label: 'Help Centre', href: null },
        { label: 'Contact Us', href: null },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Use', href: null },
        { label: 'Privacy Policy', href: null },
        { label: 'Cookie Policy', href: null },
      ],
    },
  ];

  return (
    <Box component="footer" sx={{ borderTop: `1px solid ${alpha(NAVY, 0.1)}`, bgcolor: '#fff' }}>
      <SectionWrap sx={{ py: { xs: 4, md: 5 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1.3fr 1fr 1fr 1fr 1fr' },
            gap: 3,
          }}
        >
          <Box>
            <Logo
              href={paths.international}
              sx={{
                mb: 1.5,
                width: { xs: 120, md: 140 },
                maxWidth: 140,
                height: { xs: 44, md: 50 },
                maxHeight: 52,
              }}
            />
            <Typography sx={{ fontSize: 13, color: alpha(NAVY, 0.7), lineHeight: 1.5, mb: 2, maxWidth: 240 }}>
              Practical AI learning for accountancy and finance professionals worldwide.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              {['mdi:linkedin', 'mdi:youtube', 'solar:letter-bold'].map((icon) => (
                <Box
                  key={icon}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: `1px solid ${alpha(NAVY, 0.16)}`,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Iconify icon={icon} width={16} sx={{ color: NAVY }} />
                </Box>
              ))}
            </Box>
          </Box>

          {cols.map((col) => (
            <Box key={col.title}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: NAVY,
                  mb: 1.5,
                }}
              >
                {col.title}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {col.links.map((link) => (
                  <Typography
                    key={link.label}
                    component={link.href ? Link : 'span'}
                    href={link.href || undefined}
                    sx={{
                      fontSize: 13.5,
                      color: alpha(NAVY, 0.72),
                      textDecoration: 'none',
                      '&:hover': link.href ? { color: RED } : undefined,
                    }}
                  >
                    {link.label}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}

          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: NAVY,
                mb: 1.5,
              }}
            >
              Language
            </Typography>
            <Select
              size="small"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              startAdornment={<Iconify icon="solar:global-bold-duotone" width={16} sx={{ mr: 1, color: NAVY }} />}
              sx={{
                minWidth: 140,
                bgcolor: '#fff',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(NAVY, 0.2) },
              }}
            >
              {regions.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.nativeLabel && r.nativeLabel !== r.label ? `${r.label} · ${r.nativeLabel}` : r.label}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Box>
      </SectionWrap>

      <Box sx={{ bgcolor: NAVY, py: 1.75 }}>
        <DashboardContent
          sx={{
            ...HOME_DASHBOARD_CONTENT_SX,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ color: alpha('#fff', 0.85), fontSize: 12.5 }}>
            © {new Date().getFullYear()} ISCA · AI Nexus International
          </Typography>
          <Typography sx={{ color: alpha('#fff', 0.7), fontSize: 12 }}>
            In partnership with industry programmes · IMDA
          </Typography>
        </DashboardContent>
      </Box>
    </Box>
  );
}
