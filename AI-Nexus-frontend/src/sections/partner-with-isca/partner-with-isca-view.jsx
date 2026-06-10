import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
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
  PARTNER_MOCKUP_AVATAR_SX,
  PARTNER_MOCKUP_HEADER_LOGO_SX,
  PARTNER_MOCKUP_HEADER_SUB_SX,
  PARTNER_MOCKUP_HEADER_TITLE_SX,
  PARTNER_MOCKUP_LABEL_SX,
  PARTNER_MOCKUP_META_SX,
  PARTNER_MOCKUP_NAME_SX,
  PARTNER_MOCKUP_PILL_SX,
  PARTNER_MOCKUP_STAT_VALUE_SX,
  PARTNER_MOCKUP_TAB_SX,
  PARTNER_SECTION_TITLE_LEFT_SX,
  PARTNER_SECTION_TITLE_SX,
  PARTNER_STAT_LABEL_SX,
  PARTNER_STAT_VALUE_SX,
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
  STAFF_AVATAR_TONES,
  STATUS_PILL_TONES,
} from './partner-with-isca-theme';

// ----------------------------------------------------------------------

const ASSET_BASE_URL = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');

const MOCKUP_VALUE_TONE_COLORS = {
  navy: 'secondary.main',
  green: '#0F6E56',
  amber: '#BA7517',
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

const HERO_ACTION_BUTTON_SX = {
  justifyContent: 'space-between',
  alignItems: 'center',
  textAlign: 'left',
  textTransform: 'none',
  width: 1,
  height: 1,
  minHeight: { xs: 48, md: 52 },
  minWidth: 0,
  overflow: 'hidden',
  ...PARTNER_BUTTON_TEXT_SX,
  lineHeight: 1.25,
  py: 1.5,
  px: { xs: 1.5, md: 1.75 },
  borderRadius: '8px',
  boxShadow: 'none',
  border: '1.5px solid',
  '& .MuiButton-endIcon': {
    flexShrink: 0,
    ml: 1,
  },
};

function ActionButton({ children, variant = 'red', href, onClick, component, ...other }) {
  const isRed = variant === 'red';

  return (
    <Button
      component={component}
      href={href}
      onClick={onClick}
      fullWidth
      endIcon={<Iconify icon="solar:arrow-right-linear" width={15} />}
      sx={{
        ...HERO_ACTION_BUTTON_SX,
        borderColor: isRed ? 'primary.main' : (theme) => alpha(theme.palette.secondary.main, 0.45),
        bgcolor: isRed ? 'primary.main' : '#fff',
        color: isRed ? 'primary.contrastText' : 'secondary.main',
        '&:hover': {
          bgcolor: isRed ? 'primary.dark' : (theme) => alpha(theme.palette.secondary.main, 0.04),
          borderColor: isRed ? 'primary.dark' : 'secondary.main',
          boxShadow: 'none',
        },
      }}
      {...other}
    >
      <Box
        component="span"
        sx={{
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </Box>
    </Button>
  );
}

function HeroSection({ hero }) {
  const heroImageUrl = resolveAssetUrl(hero?.heroImageUrl);
  const hasHeroImage = Boolean(heroImageUrl);
  const placeholderLines = String(hero?.placeholderText || '')
    .split('\n')
    .filter(Boolean);

  return (
    <Box
      component="section"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        alignItems: { md: hasHeroImage ? 'stretch' : 'stretch' },
        minHeight: hasHeroImage ? 'auto' : { xs: 'auto', md: 520 },
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          py: { xs: 5, md: 9 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <DashboardContent sx={{ ...HOME_DASHBOARD_CONTENT_SX, py: 0 }}>
          <Stack spacing={{ xs: 2, md: 2.5 }}>
            <Typography component="span" sx={PARTNER_HERO_EYEBROW_SX}>
              {hero?.eyebrow}
            </Typography>

            <Typography component="h1" sx={PARTNER_HERO_TITLE_SX}>
              <Box component="span" sx={{ display: 'block' }}>
                {hero?.headline}
              </Box>
              <Box component="span" sx={{ display: 'block', color: 'primary.main' }}>
                {hero?.headlineAccent}
              </Box>
            </Typography>

            <RichTextContent
              html={hero?.description}
              sx={{
                ...PARTNER_HERO_BODY_SX,
                '& p': { m: 0 },
              }}
            />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 1.5,
                width: 1,
                maxWidth: 540,
                pt: 0.5,
                alignItems: 'stretch',
              }}
            >
              {(hero?.actions || []).map((action) => {
                const label = String(action?.label || '').trim();
                if (!label) return null;

                const scrollTo = String(action?.scrollTo || '').trim();
                const href = String(action?.href || '').trim();
                const variant = action?.variant === 'red' ? 'red' : 'outline';

                if (scrollTo) {
                  return (
                    <ActionButton
                      key={`${label}-${scrollTo}`}
                      variant={variant}
                      onClick={() => scrollToSection(scrollTo)}
                    >
                      {label}
                    </ActionButton>
                  );
                }

                if (href) {
                  return (
                    <ActionButton
                      key={`${label}-${href}`}
                      variant={variant}
                      component={RouterLink}
                      href={href}
                    >
                      {label}
                    </ActionButton>
                  );
                }

                return null;
              })}
            </Box>
          </Stack>
        </DashboardContent>
      </Box>

      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: hasHeroImage ? 'transparent' : '#dde8f5',
          alignSelf: 'stretch',
          minHeight: hasHeroImage ? 'auto' : { xs: 320, md: 520 },
          display: hasHeroImage ? 'block' : 'flex',
          alignItems: hasHeroImage ? undefined : 'center',
          justifyContent: hasHeroImage ? undefined : 'center',
          lineHeight: hasHeroImage ? 0 : undefined,
        }}
      >
        {hasHeroImage ? (
          <Box
            component="img"
            src={heroImageUrl}
            alt=""
            sx={{
              display: 'block',
              width: 1,
              height: { xs: 'auto', md: '100%' },
              minHeight: { md: '100%' },
              maxHeight: { xs: 420, md: 'none' },
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        ) : (
          <Stack spacing={1.5} alignItems="center" sx={{ p: 6, textAlign: 'center', color: '#7a9abc' }}>
            <Iconify icon="solar:gallery-bold-duotone" width={56} sx={{ opacity: 0.4 }} />
            <Typography sx={{ ...PARTNER_BODY_MD_SX, opacity: 0.7, textAlign: 'center' }}>
              {placeholderLines.map((line, index) => (
                <Box key={`${line}-${index}`} component="span" sx={{ display: 'block' }}>
                  {line}
                </Box>
              ))}
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function StatsBar({ stats }) {
  const rows = Array.isArray(stats) ? stats : [];

  return (
    <PartnerLayoutSection sx={{ bgcolor: ISCA_DARK_NAVY, py: 3.5, scrollMarginTop: 0 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          gap: { xs: 2, lg: 0 },
        }}
      >
        {rows.map((stat, index) => (
          <Stack
            key={`${stat.title}-${index}`}
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{
              px: { lg: index === 0 ? 0 : 3.5 },
              borderRight: {
                lg: index < rows.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none',
              },
            }}
          >
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: '10px',
                bgcolor: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Iconify icon={stat.icon} width={22} sx={{ color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ ...PARTNER_STAT_VALUE_SX, color: '#fff' }}>
                {stat.title}
              </Typography>
              {stat.label ? (
                <Typography sx={{ ...PARTNER_STAT_LABEL_SX, color: 'rgba(255,255,255,0.72)' }}>
                  {stat.label}
                </Typography>
              ) : null}
            </Box>
          </Stack>
        ))}
      </Box>
    </PartnerLayoutSection>
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
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
          gap: 2.5,
        }}
      >
        {items.map((item) => {
          const tone = BENEFIT_ICON_TONES[item.iconTone] || BENEFIT_ICON_TONES.navy;

          return (
            <Box
              key={item.title}
              sx={{
                bgcolor: '#fff',
                border: `1.5px solid ${ISCA_BORDER}`,
                borderRadius: '12px',
                p: 3.5,
                transition: 'border-color 0.15s, transform 0.15s',
                '&:hover': {
                  borderColor: ISCA_RED,
                  transform: 'translateY(-3px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: tone.bg,
                  color: tone.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <Iconify icon={item.icon} width={22} />
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

const STAFF_TABLE_COLUMNS = 'minmax(120px, 1.4fr) minmax(88px, 1fr) minmax(68px, auto) minmax(56px, auto)';

function StaffActivityRowCard({ row }) {
  const avatarTone = STAFF_AVATAR_TONES[row.initials] || STAFF_AVATAR_TONES.MC;
  const pillTone = STATUS_PILL_TONES[row.statusTone] || STATUS_PILL_TONES.none;

  return (
    <Box
      sx={{
        p: 1.5,
        borderBottom: `1px solid #f4f6fa`,
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Stack direction="row" spacing={1.125} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1.125} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              bgcolor: avatarTone.bg,
              color: avatarTone.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...PARTNER_MOCKUP_AVATAR_SX,
              flexShrink: 0,
            }}
          >
            {row.initials}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ ...PARTNER_MOCKUP_NAME_SX, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.name}
            </Typography>
            <Typography sx={PARTNER_MOCKUP_META_SX}>{row.role}</Typography>
          </Box>
        </Stack>
        <Box
          component="span"
          sx={{
            ...PARTNER_MOCKUP_PILL_SX,
            px: 1,
            py: 0.25,
            borderRadius: '10px',
            bgcolor: pillTone.bg,
            color: pillTone.color,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {row.status}
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
        <Box sx={{ flex: 1, height: 5, bgcolor: ISCA_BORDER, borderRadius: '3px', overflow: 'hidden' }}>
          <Box
            sx={{
              width: `${row.progress}%`,
              height: '100%',
              bgcolor: row.progressColor,
              borderRadius: '3px',
            }}
          />
        </Box>
        <Typography sx={{ ...PARTNER_MOCKUP_META_SX, minWidth: 32 }}>{row.progress}%</Typography>
      </Stack>

      {row.cert === 'download' ? (
        <Typography component="span" sx={{ ...PARTNER_MOCKUP_META_SX, color: 'primary.main', fontWeight: 700 }}>
          Download certificate
        </Typography>
      ) : (
        <Typography sx={PARTNER_MOCKUP_META_SX}>Certificate pending</Typography>
      )}
    </Box>
  );
}

function StaffActivityTable({ staffRows }) {
  const rows = Array.isArray(staffRows) ? staffRows : [];

  return (
    <>
      <Box
        sx={{
          display: { xs: 'block', sm: 'none' },
          border: `1px solid ${ISCA_BORDER}`,
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        {rows.map((row) => (
          <StaffActivityRowCard key={row.name} row={row} />
        ))}
      </Box>

      <Box
        sx={{
          display: { xs: 'none', sm: 'block' },
          border: `1px solid ${ISCA_BORDER}`,
          borderRadius: '10px',
          overflow: 'hidden',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Box sx={{ minWidth: 380 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: STAFF_TABLE_COLUMNS,
              gap: 1,
              px: 1.75,
              py: 1,
              bgcolor: '#f8f9fc',
              borderBottom: `1px solid ${ISCA_BORDER}`,
            }}
          >
            {['Staff', 'Progress', 'Status', 'Cert.'].map((label) => (
              <Typography key={label} sx={{ ...PARTNER_MOCKUP_LABEL_SX, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                {label}
              </Typography>
            ))}
          </Box>

          {rows.map((row) => {
            const avatarTone = STAFF_AVATAR_TONES[row.initials] || STAFF_AVATAR_TONES.MC;
            const pillTone = STATUS_PILL_TONES[row.statusTone] || STATUS_PILL_TONES.none;

            return (
              <Box
                key={row.name}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: STAFF_TABLE_COLUMNS,
                  gap: 1,
                  px: 1.75,
                  py: 1.125,
                  alignItems: 'center',
                  borderBottom: `1px solid #f4f6fa`,
                  '&:last-of-type': { borderBottom: 'none' },
                  '&:hover': { bgcolor: '#fafbfd' },
                }}
              >
                <Stack direction="row" spacing={1.125} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: avatarTone.bg,
                      color: avatarTone.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...PARTNER_MOCKUP_AVATAR_SX,
                      flexShrink: 0,
                    }}
                  >
                    {row.initials}
                  </Box>
                  <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                    <Typography sx={{ ...PARTNER_MOCKUP_NAME_SX, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.name}
                    </Typography>
                    <Typography sx={{ ...PARTNER_MOCKUP_META_SX, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.role}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={0.625} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box sx={{ flex: 1, minWidth: 40, height: 5, bgcolor: ISCA_BORDER, borderRadius: '3px', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        width: `${row.progress}%`,
                        height: '100%',
                        bgcolor: row.progressColor,
                        borderRadius: '3px',
                      }}
                    />
                  </Box>
                  <Typography sx={{ ...PARTNER_MOCKUP_META_SX, minWidth: 28, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {row.progress}%
                  </Typography>
                </Stack>

                <Box
                  component="span"
                  sx={{
                    ...PARTNER_MOCKUP_PILL_SX,
                    px: 1,
                    py: 0.25,
                    borderRadius: '10px',
                    bgcolor: pillTone.bg,
                    color: pillTone.color,
                    whiteSpace: 'nowrap',
                    width: 'fit-content',
                  }}
                >
                  {row.status}
                </Box>

                {row.cert === 'download' ? (
                  <Typography
                    component="span"
                    sx={{ ...PARTNER_MOCKUP_META_SX, color: 'primary.main', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Download
                  </Typography>
                ) : (
                  <Typography sx={{ ...PARTNER_MOCKUP_META_SX, color: 'text.disabled', whiteSpace: 'nowrap' }}>
                    —
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </>
  );
}

function DashboardMockup({ mockup }) {
  const tabs = Array.isArray(mockup?.tabs) ? mockup.tabs : [];
  const summaryStats = Array.isArray(mockup?.summaryStats) ? mockup.summaryStats : [];

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: '1.5px solid #dde4f0',
        borderRadius: '14px',
        overflow: 'hidden',
        minWidth: 0,
        width: 1,
      }}
    >
      <Box
        sx={{
          bgcolor: ISCA_DARK_NAVY,
          px: 2.5,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              bgcolor: ISCA_RED,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...PARTNER_MOCKUP_HEADER_LOGO_SX,
              color: '#fff',
            }}
          >
            {mockup?.companyLogoText}
          </Box>
          <Box>
            <Typography sx={PARTNER_MOCKUP_HEADER_TITLE_SX}>{mockup?.companyName}</Typography>
            <Typography sx={PARTNER_MOCKUP_HEADER_SUB_SX}>{mockup?.companySub}</Typography>
          </Box>
        </Stack>
        <Box
          component="span"
          sx={{
            fontFamily: 'monospace',
            ...PARTNER_MOCKUP_HEADER_LOGO_SX,
            color: '#ff8a96',
            bgcolor: 'rgba(232,25,44,0.2)',
            border: '1px solid rgba(232,25,44,0.3)',
            borderRadius: '4px',
            px: 1.25,
            py: 0.375,
            whiteSpace: 'nowrap',
          }}
        >
          {mockup?.companyCode}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', borderBottom: `1px solid ${ISCA_BORDER}`, bgcolor: '#fff' }}>
        {tabs.map((tab, index) => (
          <Box
            key={tab}
            sx={{
              px: 2.25,
              py: 1.25,
              ...PARTNER_MOCKUP_TAB_SX,
              color: index === 0 ? 'primary.main' : 'text.secondary',
              borderBottom: index === 0 ? (theme) => `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
            }}
          >
            {tab}
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 2.5 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
            gap: 1.25,
            mb: 2.5,
          }}
        >
          {summaryStats.map((stat) => (
            <Box
              key={stat.label}
              sx={{
                bgcolor: '#f8f9fc',
                border: `1px solid ${ISCA_BORDER}`,
                borderRadius: '10px',
                p: '12px 14px',
              }}
            >
              <Typography sx={{ ...PARTNER_MOCKUP_LABEL_SX, mb: 0.5 }}>
                {stat.label}
              </Typography>
              <Typography
                sx={{
                  ...PARTNER_MOCKUP_STAT_VALUE_SX,
                  color: MOCKUP_VALUE_TONE_COLORS[stat.valueTone] || 'secondary.main',
                }}
              >
                {stat.value}
              </Typography>
              <Typography
                sx={{
                  ...PARTNER_MOCKUP_META_SX,
                  mt: 0.25,
                  color: stat.subColor,
                  fontWeight: String(stat.subColor).includes('primary') ? 600 : 400,
                }}
              >
                {stat.sub}
              </Typography>
            </Box>
          ))}
        </Box>

        <Typography sx={{ ...PARTNER_MOCKUP_LABEL_SX, mb: 1.25, letterSpacing: '0.6px' }}>
          {mockup?.overallCompletionLabel}
        </Typography>
        <Box sx={{ mb: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
            <Typography sx={{ ...PARTNER_MOCKUP_META_SX, fontSize: 13 }}>
              {mockup?.overallCompletionSubtitle}
            </Typography>
            <Typography sx={{ ...PARTNER_MOCKUP_META_SX, fontSize: 13, fontWeight: 700, color: 'secondary.main' }}>
              {mockup?.overallCompletionPercent}
            </Typography>
          </Stack>
          <Box sx={{ height: 8, bgcolor: ISCA_BORDER, borderRadius: '4px', overflow: 'hidden' }}>
            <Box
              sx={{
                width: `${Math.max(0, Math.min(100, Number.parseFloat(String(mockup?.overallCompletionPercent || '0')) || 0))}%`,
                height: '100%',
                bgcolor: ISCA_RED,
                borderRadius: '4px',
              }}
            />
          </Box>
        </Box>

        <Typography sx={{ ...PARTNER_MOCKUP_LABEL_SX, mb: 1.25, letterSpacing: '0.6px' }}>
          {mockup?.staffActivityLabel}
        </Typography>

        <StaffActivityTable staffRows={mockup?.staffRows} />
      </Box>
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
          gridTemplateColumns: { xs: '1fr', md: '1fr 1.6fr' },
          gap: { xs: 5, md: 8 },
          alignItems: 'start',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Eyebrow align="left">{section?.eyebrow}</Eyebrow>
          <Typography component="h2" sx={PARTNER_SECTION_TITLE_LEFT_SX}>
            {section?.title}
          </Typography>
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
          <DashboardMockup mockup={section?.mockup} />
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
                ...PARTNER_EYEBROW_SX,
                position: { xs: 'static', md: 'absolute' },
                top: 20,
                right: 24,
                mb: { xs: 2, md: 0 },
                textAlign: { xs: 'center', md: 'right' },
                fontSize: 12,
                letterSpacing: 'normal',
                textTransform: 'none',
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
                      letterSpacing: '0.1em',
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
            sx={{
              ...PARTNER_EYEBROW_SX,
              display: 'inline-flex',
              alignItems: 'center',
              border: '1.5px solid rgba(232,25,44,0.5)',
              color: '#ff8a96',
              px: 1.75,
              py: 0.5,
              borderRadius: '20px',
              letterSpacing: '0.1em',
              mb: 2.5,
            }}
          >
            {section?.eyebrow}
          </Box>

          <Typography component="h2" sx={PARTNER_CTA_TITLE_SX}>
            {section?.title}
          </Typography>

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
              endIcon={<Iconify icon="solar:arrow-right-linear" width={16} />}
              sx={{
                textTransform: 'none',
                ...PARTNER_BUTTON_TEXT_SX,
                py: 1.75,
                px: 3.5,
                borderRadius: '7px',
                bgcolor: ISCA_RED,
                color: '#fff',
                border: `2px solid ${ISCA_RED}`,
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
        bgcolor: '#ffffff',
        color: 'text.primary',
        fontFamily: PAGE_FONT_FAMILY,
        lineHeight: 1.6,
        scrollBehavior: 'smooth',
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
      <HeroSection hero={content.hero} />

      <StatsBar stats={content.stats} />
      <BenefitsSection section={content.benefits} />
      <DashboardSection section={content.dashboard} />
      <HowItWorksSection section={content.howItWorks} />
      <FaqSection section={content.faq} />
      <CtaSection section={content.cta} />

      <HomeFooter sx={{ mt: 0 }} />
    </Box>
  );
}
