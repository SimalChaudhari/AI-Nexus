import { useState, useEffect, useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { RouterLink } from 'src/routes/components';
import { RichTextContent } from 'src/components/html-content';
import { appSettingsService } from 'src/services/app-settings.service';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';

import { EMPTY_HERO_DATA, buildHomeHeroData } from './home-hero-content';

// ----------------------------------------------------------------------

const CTA_LIME = '#d4f938';
const CTA_LIME_HOVER = '#c5ea2e';

function expandShortHex(hex) {
  const h = String(hex || '').trim();
  if (/^#[0-9A-Fa-f]{3}$/.test(h)) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return h;
}

function darkenHexColor(hex) {
  let h = expandShortHex(String(hex || '').trim());
  const m8 = /^#([0-9A-Fa-f]{8})$/.exec(h);
  if (m8) h = `#${m8[1].slice(0, 6)}`;
  const m = /^#([0-9A-Fa-f]{6})$/.exec(h);
  if (!m) return expandShortHex(hex);
  const num = parseInt(m[1], 16);
  const factor = 0.92;
  const r = Math.round(((num >> 16) & 0xff) * factor);
  const g = Math.round(((num >> 8) & 0xff) * factor);
  const b = Math.round((num & 0xff) * factor);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function parseHeroBoundary(str, endOfDay) {
  const t = String(str || '').trim();
  if (!t) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(t)
    ? new Date(`${t}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
    : new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/** When start/end date fields are set, event + stats show only within that window (local interpretation for YYYY-MM-DD). */
function isHeroScheduleActive(event) {
  const startRaw = String(event?.startDate || '').trim();
  const endRaw = String(event?.endDate || '').trim();
  if (!startRaw && !endRaw) return true;
  const now = Date.now();
  const startMs = parseHeroBoundary(startRaw, false);
  const endMs = parseHeroBoundary(endRaw, true);
  let lower = -Infinity;
  let upper = Infinity;
  if (startMs != null) lower = startMs;
  if (endMs != null) upper = endMs;
  return now >= lower && now <= upper;
}

/** Strict spacing tokens (fixed values for exact composition) */
const heroInsetBottom = { xs: 16, sm: 24, md: 32 };

function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || '').trim());
}

/** In-app path: ensure leading slash for React Router */
function normalizeAppPath(href) {
  const h = String(href || '').trim();
  if (!h || isExternalHref(h)) return h;
  return h.startsWith('/') ? h : `/${h}`;
}

const LEGACY_MARKER = '<!-- HERO_LEGACY_DETAILS -->';

function decodeHtmlEntities(input) {
  const value = String(input || '');
  if (!value) return '';
  if (typeof window === 'undefined') {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

/**
 * Remove duplicate / legacy appended blocks so description shows once.
 */
function dedupeHeroDescription(raw) {
  let text = String(raw || '').trim();
  if (!text) return '';

  if (text.includes(LEGACY_MARKER)) {
    text = text.split(LEGACY_MARKER)[0].trim();
  }

  // Plain text: drop compact duplicate block after structured "CTA Label" / "CTA Href" section
  if (text.includes('CTA Label:') && /\n\s*CTA:\s/i.test(text)) {
    const idx = text.search(/\n\s*CTA:\s/i);
    if (idx > 0) text = text.slice(0, idx).trim();
  }

  // HTML: remove second block after <hr> when both "CTA Label" and short "CTA:" paragraphs exist
  if (/<strong>CTA Label:<\/strong>/i.test(text) && /<p><strong>CTA:<\/strong>/i.test(text)) {
    const hrMatch = text.match(/<hr\s*\/?>\s*<p><strong>CTA:<\/strong>/i);
    if (hrMatch && hrMatch.index > 0) {
      text = text.slice(0, hrMatch.index).trim();
    }
  }

  return text;
}

function normalizeDescriptionHtml(value) {
  const raw = dedupeHeroDescription(value);
  if (!raw) return '';

  const decoded = raw.includes('&lt;') || raw.includes('&gt;') ? decodeHtmlEntities(raw) : raw;
  const hasHtmlTag = /<[a-z][\s\S]*>/i.test(decoded);

  if (hasHtmlTag) return decoded;

  return decoded
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function parseCountableValue(rawValue) {
  const raw = String(rawValue || '').trim();
  const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)(.*)$/);
  if (!match) return null;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return null;
  return {
    target: numeric,
    decimals: (match[1].split('.')[1] || '').length,
    suffix: match[2] || '',
  };
}

function formatAnimatedValue(meta, current) {
  if (!meta) return '';
  const safe = Number.isFinite(current) ? current : 0;
  const numberText =
    meta.decimals > 0 ? safe.toFixed(meta.decimals) : String(Math.round(safe));
  return `${numberText}${meta.suffix}`;
}

function isLikelyImagePath(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(s);
}

export function HomeHeroSection() {
  const [heroData, setHeroData] = useState(EMPTY_HERO_DATA);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [animatedStatValues, setAnimatedStatValues] = useState([]);
  const [typedHeadline, setTypedHeadline] = useState('');

  useEffect(() => {
    let active = true;

    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        const dynamicHeroData = buildHomeHeroData(settings);
        setHeroData(dynamicHeroData);
        setBackgroundImageUrl(dynamicHeroData.backgroundImageUrl || '');
      })
      .catch(() => {
        if (!active) return;
        setHeroData(EMPTY_HERO_DATA);
        setBackgroundImageUrl('');
      })
      .finally(() => {
        if (active) setSettingsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const { headline, description, cta, event: heroEvent, stats: heroStats } = heroData;
  const descriptionHtml = normalizeDescriptionHtml(description);
  const showHeadline = Boolean(headline);
  const eventItems = [
    {
      label: String(heroEvent?.startDateLabel || '').trim(),
      value: String(heroEvent?.startDate || '').trim(),
    },
    {
      label: String(heroEvent?.startTimeLabel || '').trim(),
      value: String(heroEvent?.startTime || '').trim(),
    },
  ].filter((item) => item.label || item.value);
  const showEventBlock = eventItems.length > 0;
  const visibleStats = useMemo(
    () =>
      heroStats.filter((row) => String(row?.value || '').trim() || String(row?.label || '').trim()),
    [heroStats]
  );
  const showStatsBlock = visibleStats.length > 0;
  const ctaBg = String(cta?.buttonColor || '').trim();
  const ctaFg = String(cta?.buttonTextColor || '').trim();
  const resolvedBg = ctaBg || CTA_LIME;
  const resolvedHoverBg = ctaBg ? darkenHexColor(ctaBg) : CTA_LIME_HOVER;
  const resolvedColor = ctaFg || 'grey.900';
  const ctaButtonSx = {
    flexShrink: 0,
    alignSelf: 'auto',
    mx: 0,
    py: { xs: 0.62, sm: 'clamp(0.95rem, 1.45vw, 1.35rem)' },
    px: { xs: 1.15, sm: 'clamp(1.15rem, 2.2vw, 2.2rem)' },
    borderRadius: 1,
    fontWeight: 700,
    fontSize: { xs: '0.66rem', sm: 'clamp(0.78rem, 1.15vw, 0.95rem)' },
    textTransform: 'none',
    whiteSpace: { xs: 'normal', sm: 'nowrap' },
    textAlign: 'center',
    color: resolvedColor,
    bgcolor: resolvedBg,
    boxShadow: 'none',
    width: 'auto',
    maxWidth: { xs: '100%', sm: 'none' },
    position: 'relative',
    overflow: 'hidden',
    isolation: 'isolate',
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      transform: 'translateX(-120%)',
      background:
        'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.38) 50%, rgba(255,255,255,0.12) 60%, transparent 100%)',
      animation: 'heroBtnProgress 2.2s linear infinite',
    },
    '@keyframes heroBtnProgress': {
      '0%': { transform: 'translateX(-120%)' },
      '100%': { transform: 'translateX(120%)' },
    },
    '@media (max-width:360px)': {
      py: 0.7,
      px: 1.35,
      fontSize: '0.68rem',
    },
    '@media (max-width:320px)': {
      py: 0.62,
      px: 1.1,
      fontSize: '0.64rem',
    },
    '&:hover': {
      bgcolor: resolvedHoverBg,
      boxShadow: 'none',
    },
  };
  const showDescription = Boolean(descriptionHtml);
  const showCta = Boolean(cta?.label?.trim() && cta?.href?.trim());
  const showImage = Boolean(backgroundImageUrl);

  useEffect(() => {
    const fullText = String(headline || '');
    if (!fullText) {
      setTypedHeadline('');
      return;
    }
    let index = 0;
    setTypedHeadline('');
    const timer = window.setInterval(() => {
      index += 1;
      setTypedHeadline(fullText.slice(0, index));
      if (index >= fullText.length) window.clearInterval(timer);
    }, 35);
    return () => window.clearInterval(timer);
  }, [headline]);

  useEffect(() => {
    if (!visibleStats.length) {
      setAnimatedStatValues([]);
      return;
    }

    const sourceValues = visibleStats.map((row) => String(row?.value || '').trim() || '—');
    const metas = sourceValues.map(parseCountableValue);
    setAnimatedStatValues(
      sourceValues.map((value, i) => (metas[i] ? formatAnimatedValue(metas[i], 0) : value))
    );

    const durationMs = 2400;
    const start = performance.now();
    let frameId = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setAnimatedStatValues(
        sourceValues.map((value, i) =>
          metas[i] ? formatAnimatedValue(metas[i], metas[i].target * eased) : value
        )
      );
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [visibleStats]);

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        alignSelf: 'stretch',
        overflow: 'hidden',
        bgcolor: 'transparent',
        paddingTop: 0,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          display: { xs: 'grid', sm: 'block' },
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'none' },
          gridTemplateRows: { xs: 'minmax(0, auto)', sm: 'none' },
          aspectRatio: { xs: '16 / 11', sm: 'auto', md: '16 / 9' },
          minHeight: {
            xs: 'auto',
            sm: 'clamp(500px, 74vh, 760px)',
          },
        }}
      >
        {/* Mobile: full image in layout + text overlaid in same grid cell (below) */}
        {showImage && (
          <Box
            component="img"
            src={backgroundImageUrl}
            alt=""
            loading="eager"
            decoding="async"
            sx={{
              display: { xs: 'block', sm: 'none' },
              gridColumn: { xs: 1, sm: 'auto' },
              gridRow: { xs: 1, sm: 'auto' },
              zIndex: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              alignSelf: 'start',
              justifySelf: 'stretch',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        )}

        {/* Desktop: cover image */}
        {showImage && (
          <Box
            component="img"
            src={backgroundImageUrl}
            alt=""
            loading="eager"
            decoding="async"
            sx={{
              display: { xs: 'none', sm: 'block' },
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        )}

        {!showImage && (
          <Box
            sx={{
              display: { xs: 'none', sm: 'block' },
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              bgcolor: '#0a0d14',
              zIndex: 0,
            }}
          />
        )}

        <Box
          aria-hidden
          sx={{
            gridColumn: { xs: 1, sm: 'auto' },
            gridRow: { xs: 1, sm: 'auto' },
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: {
              xs: 'linear-gradient(180deg, rgba(8, 10, 14, 0.22) 0%, rgba(8, 10, 14, 0.38) 55%, rgba(8, 10, 14, 0.5) 100%)',
              sm: 'linear-gradient(180deg, rgba(8, 10, 14, 0.45) 0%, rgba(8, 10, 14, 0.58) 45%, rgba(8, 10, 14, 0.68) 100%)',
            },
            pointerEvents: 'none',
          }}
        />

        <Box
          sx={{
            gridColumn: { xs: 1, sm: 'auto' },
            gridRow: { xs: 1, sm: 'auto' },
            position: { xs: 'relative', sm: 'absolute' },
            left: 0,
            top: 0,
            width: '100%',
            height: { xs: 'auto', sm: '100%' },
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            boxSizing: 'border-box',
            minHeight: 0,
            alignSelf: 'start',
          }}
        >

          <DashboardContent
            sx={{
              position: 'relative',
              zIndex: 1,
              flex: { xs: '0 0 auto', sm: 1 },
              width: '100%',
              maxWidth: '100%',
              minHeight: 0,
              maxHeight: { xs: 'none', sm: '100%' },
              height: { xs: 'auto', sm: '100%' },
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              overflowY: { xs: 'visible', sm: 'visible', md: 'hidden' },
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'auto',

              pt: {
                xs: 'calc(var(--layout-header-mobile-height, 84px) + 16px)',
                sm: 'calc(var(--layout-header-desktop-height, 104px) + 4px)',
                md: 'calc(var(--layout-header-desktop-height, 104px) + 78px)',
              },
              pb: heroInsetBottom,
              '@media (max-width:425px)': {
                pt: 'calc(var(--layout-header-mobile-height, 84px) + 14px)',
              },
            }}
          >
            <Stack
              spacing={0}
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', md: '640px' },
                alignSelf: 'flex-start',
                gap: { xs: '10px', sm: '20px', md: '24px' },
              }}
            >
              {showHeadline && (
                <Box>
                  <Typography
                    variant="h1"
                    sx={{
                      color: 'common.white',
                      ...HERO_TYPOGRAPHY.homeHeadline,
                      textWrap: 'balance',
                      maxWidth: { xs: '100%', sm: '24ch', md: '22ch', lg: '24ch' },
                      overflowWrap: 'anywhere',
                      pr: { xs: 0, sm: 0 },
                      whiteSpace: 'normal',
                      overflow: 'visible',
                      textOverflow: 'clip',
                      whiteSpace: 'normal',
                      textOverflow: 'clip',
                      overflow: 'visible',
                      '@media (max-width:360px)': {
                        fontSize: '0.94rem',
                        lineHeight: 1.16,
                      },
                      '@media (max-width:320px)': {
                        fontSize: '0.88rem',
                        lineHeight: 1.14,
                      },
                    }}
                  >
                    {typedHeadline}
                  </Typography>
                </Box>
              )}

              {showDescription && (
                <Box>
                  <Box
                    sx={{
                      display: { xs: 'none', sm: 'block' },
                      color: alpha('#fff', 0.72),
                      ...HERO_TYPOGRAPHY.homeDescription,
                      maxWidth: { xs: '100%', md: '50ch', lg: '54ch' },
                      pr: { xs: 0.5, sm: 0 },
                      '&, & *': { color: alpha('#fff', 0.72) },
                      '& p': { mb: 1, '&:last-child': { mb: 0 } },
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      '@media (max-width:360px)': {
                        fontSize: '0.78rem',
                        lineHeight: 1.5,
                      },
                      '@media (max-width:320px)': {
                        fontSize: '0.73rem',
                        lineHeight: 1.45,
                      },
                    }}
                  >
                    <RichTextContent html={descriptionHtml} />
                  </Box>
                </Box>
              )}

              {(showCta || showEventBlock) && (
                <Stack
                  direction={{ xs: 'row', sm: 'row' }}
                  alignItems={{ xs: 'center', sm: 'center' }}
                  sx={{
                    width: '100%',
                    maxWidth: '100%',
                    gap: { xs: 1, sm: 3 },
                    pt: { xs: 0.15, sm: 0.75 },
                    overflow: 'visible',
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    '@media (max-width:360px)': {
                      gap: 2,
                    },
                    '@media (max-width:320px)': {
                      gap: 1.7,
                    },
                  }}
                >
                  {showCta &&
                    (isExternalHref(cta.href) ? (
                      <Button
                        component="a"
                        href={String(cta.href).trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        size="large"
                        sx={{
                          ...ctaButtonSx,
                          display: 'inline-flex',
                          '@media (max-width:375px)': { display: 'none' },
                        }}
                      >
                        {cta.label}
                      </Button>
                    ) : (
                      <Button
                        component={RouterLink}
                        href={normalizeAppPath(cta.href)}
                        variant="contained"
                        size="large"
                        sx={{
                          ...ctaButtonSx,
                          display: 'inline-flex',
                          '@media (max-width:375px)': { display: 'none' },
                        }}
                      >
                        {cta.label}
                      </Button>
                    ))}

                  {showEventBlock && (
                    <Stack
                      direction="row"
                      flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
                      alignItems="center"
                      sx={{
                        display: { xs: 'flex', sm: 'flex' },
                        columnGap: { xs: 1.1, sm: 3 },
                        rowGap: { xs: 0.75, sm: 0 },
                        flexShrink: { xs: 1, sm: 0 },
                        '@media (max-width:375px)': {
                          display: 'none',
                        },
                        '@media (max-width:320px)': {
                          columnGap: 0.8,
                          rowGap: 0.55,
                        },
                      }}
                    >
                      {showCta && (
                        <Box
                          sx={{
                            width: '1px',
                            height: { xs: 24, sm: 34 },
                            bgcolor: alpha('#fff', 0.28),
                            display: { xs: 'none', sm: 'block' },
                          }}
                        />
                      )}
                      {eventItems.map((item, index) => (
                        <Stack
                          key={`hero-event-item-${index}`}
                          spacing={0.35}
                          sx={{
                            minWidth: { xs: 'auto', sm: 118 },
                            pl: index > 0 ? { xs: 1, sm: 2 } : 0,
                            borderLeft: index > 0 ? `1px solid ${alpha('#fff', 0.2)}` : 'none',
                            '@media (max-width:320px)': {
                              pl: index > 0 ? 0.75 : 0,
                            },
                            opacity: 0,
                            transform: 'translateY(8px)',
                            animation: 'heroDateIn 520ms ease forwards',
                            animationDelay: `${index * 120}ms`,
                            '@keyframes heroDateIn': {
                              '0%': { opacity: 0, transform: 'translateY(8px)' },
                              '100%': { opacity: 1, transform: 'translateY(0)' },
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: alpha('#fff', 0.74),
                              fontSize: {
                                xs: 'clamp(0.52rem, 1.9vw, 0.66rem)',
                                sm: 'clamp(0.68rem, 0.95vw, 0.78rem)',
                              },
                              fontWeight: 500,
                              lineHeight: 1.2,
                              '@media (max-width:320px)': {
                                fontSize: '0.56rem',
                              },
                            }}
                          >
                            {item.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: {
                                xs: 'clamp(0.68rem, 2.6vw, 0.88rem)',
                                sm: 'clamp(0.9rem, 1.55vw, 1.1rem)',
                              },
                              lineHeight: 1.25,
                              textShadow: '0 0 0 rgba(255,255,255,0)',
                              animation: 'heroDatePulse 2.1s ease-in-out infinite',
                              animationDelay: `${index * 160 + 400}ms`,
                              '@keyframes heroDatePulse': {
                                '0%, 100%': {
                                  opacity: 0.92,
                                  textShadow: '0 0 0 rgba(255,255,255,0)',
                                },
                                '50%': {
                                  opacity: 1,
                                  textShadow: '0 0 10px rgba(255,255,255,0.28)',
                                },
                              },
                              '@media (max-width:320px)': {
                                fontSize: '0.7rem',
                              },
                            }}
                          >
                            {item.value}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Stack>
              )}

              {showStatsBlock && (
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="flex-start"
                  flexWrap="nowrap"
                  sx={{
                    gap: 0,
                    pt: { xs: 0, sm: 1.1 },
                    width: '100%',
                    maxWidth: { xs: '100%', md: '100%' },
                    overflow: 'visible',
                    rowGap: 0,
                    columnGap: { xs: 0.55, sm: 0 },
                    '@media (max-width:320px)': {
                      pt: 0.55,
                      rowGap: 0.55,
                    },
                  }}
                >
                  {visibleStats.map((row, index) => (
                    <Stack
                      key={`hero-stat-${index}`}
                      direction="row"
                      alignItems="center"
                      sx={{
                        minWidth: 0,
                        flex: { xs: '0 0 auto', sm: '1 1 0%' },
                        px: { xs: 0.18, sm: 1.2 },
                      }}
                    >
                      <Box sx={{ minWidth: 0, width: { xs: 'auto', sm: '100%' }, textAlign: 'center', overflow: 'hidden' }}>
                        <Typography
                          component="div"
                          variant="h4"
                          sx={{
                            color: 'common.white',
                            fontWeight: 800,
                            fontSize: {
                              xs: 'clamp(0.78rem, 3.1vw, 1.1rem)',
                              sm: 'clamp(1.45rem, 2.5vw, 2rem)',
                              md: 'clamp(1.8rem, 1.9vw, 2.05rem)',
                            },
                            lineHeight: { xs: 1, sm: 1.02 },
                            '@media (max-width:320px)': {
                              fontSize: '0.88rem',
                            },
                          }}
                        >
                          {(animatedStatValues[index] ?? String(row.value || '').trim()) || '—'}
                        </Typography>
                        <Typography
                          variant="caption"
                          component="div"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.5,
                            mt: 0.28,
                            color: alpha('#fff', 0.72),
                            fontSize: {
                              xs: 'clamp(0.48rem, 1.6vw, 0.58rem)',
                              sm: 'clamp(0.72rem, 1.08vw, 0.92rem)',
                            },
                            fontWeight: 600,
                            lineHeight: 1.1,
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            overflowWrap: 'anywhere',
                            '@media (max-width:320px)': {
                              fontSize: '0.66rem',
                            },
                          }}
                        >
                          {String(row?.icon || '').trim() &&
                            (isLikelyImagePath(row.icon) ? (
                              <Box
                                component="img"
                                src={String(row.icon).trim()}
                                alt=""
                                sx={{
                                  width: { xs: 'clamp(10px, 2.6vw, 14px)', sm: 'clamp(18px, 2.2vw, 24px)' },
                                  height: { xs: 'clamp(10px, 2.6vw, 14px)', sm: 'clamp(18px, 2.2vw, 24px)' },
                                  objectFit: 'contain',
                                  display: 'inline-block',
                                }}
                              />
                            ) : (
                              <Box
                                component="span"
                                sx={{
                                  fontSize: {
                                    xs: 'clamp(0.56rem, 2vw, 0.74rem)',
                                    sm: 'clamp(0.95rem, 1.35vw, 1.15rem)',
                                  },
                                  lineHeight: 1,
                                  display: 'inline-block',
                                }}
                              >
                                {String(row.icon).trim()}
                              </Box>
                            ))}
                          {String(row.label || '').trim()}
                        </Typography>
                      </Box>
                      {index < visibleStats.length - 1 && (
                        <Box
                          sx={{
                            mx: { xs: 0.25, sm: 0.8 },
                            width: '1px',
                            height: { xs: 44, sm: 50 },
                            bgcolor: alpha('#fff', 0.25),
                            display: { xs: 'none', sm: 'block' },
                          }}
                        />
                      )}
                    </Stack>
                  ))}
                </Stack>
              )}

              {settingsLoaded &&
                !showHeadline &&
                !showDescription &&
                !showCta &&
                !showEventBlock &&
                !showStatsBlock && (
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.45) }}>
                  Configure the home hero in Admin → Settings → Hero.
                </Typography>
              )}

            </Stack>
          </DashboardContent>
        </Box>
      </Box>
    </Box>
  );
}
