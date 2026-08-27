'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Logo } from 'src/components/logo';
import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { HOME_DASHBOARD_CONTENT_SX } from 'src/sections/home/home-section-styles';
import { INTL_NAVY, INTL_RED } from 'src/theme/intl-brand';
import { navigateToAuthPath } from 'src/utils/intl-auth-navigate';

import { INTL_REGIONS } from './intl-region';
import { INTL_LANDING_DEFAULTS } from './intl-landing-defaults';

// ----------------------------------------------------------------------

const NAVY = INTL_NAVY;
const RED = INTL_RED;

function formatCopyright(text) {
  return String(text || '').replace(/\{year\}/g, String(new Date().getFullYear()));
}

function resolveFooterLinkHref(link) {
  const href = String(link?.href || '').trim();
  if (href) return href;
  const label = String(link?.label || '').trim().toLowerCase();
  if (label === 'sign in' || label === 'signin' || label === 'log in' || label === 'login') {
    return paths.auth.signIn;
  }
  if (
    label === 'sign up' ||
    label === 'signup' ||
    label === 'register' ||
    label === 'create an account'
  ) {
    return paths.auth.signUp;
  }
  if (label === 'ai fluency' || label === 'dashboard') {
    return paths.dashboard;
  }
  return '';
}

function SectionWrap({ children, sx }) {
  return (
    <Box component="section" sx={sx}>
      <DashboardContent sx={{ ...HOME_DASHBOARD_CONTENT_SX, py: 0 }}>{children}</DashboardContent>
    </Box>
  );
}

const FOOTER_COL_ORDER = ['Resources', 'Legal', 'Platform'];

function orderFooterColumns(columns) {
  const list = Array.isArray(columns) ? [...columns] : [];
  const rank = (title) => {
    const index = FOOTER_COL_ORDER.findIndex(
      (name) => name.toLowerCase() === String(title || '').trim().toLowerCase()
    );
    return index === -1 ? FOOTER_COL_ORDER.length : index;
  };
  return list.sort((a, b) => rank(a.title) - rank(b.title));
}

function LanguageBlock({ lang, onChangeLang, regions, fullWidth = false }) {
  return (
    <Box sx={{ minWidth: 0, width: fullWidth ? '100%' : 'auto', maxWidth: '100%' }}>
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
        fullWidth={fullWidth}
        value={lang}
        onChange={(e) => onChangeLang(e.target.value)}
        startAdornment={
          <Iconify
            icon="solar:global-bold-duotone"
            width={16}
            sx={{ mr: 1, color: NAVY, flexShrink: 0 }}
          />
        }
        sx={{
          minWidth: 0,
          maxWidth: '100%',
          bgcolor: '#fff',
          '& .MuiSelect-select': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(NAVY, 0.2) },
        }}
      >
        {regions.map((r) => (
          <MenuItem key={r.id} value={r.id}>
            {r.nativeLabel && r.nativeLabel !== r.label
              ? `${r.label} · ${r.nativeLabel}`
              : r.label}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}

export function IntlFooter({ regions = INTL_REGIONS, footer }) {
  const router = useRouter();
  const [lang, setLang] = useState(regions[0]?.id || 'en');
  const footerCopy = footer || INTL_LANDING_DEFAULTS.footer;
  const cols = orderFooterColumns(footerCopy.columns);
  const social = Array.isArray(footerCopy.social) ? footerCopy.social : [];

  useEffect(() => {
    if (!regions.some((r) => r.id === lang) && regions[0]?.id) {
      setLang(regions[0].id);
    }
  }, [regions, lang]);

  return (
    <Box component="footer" sx={{ borderTop: `1px solid ${alpha(NAVY, 0.1)}`, bgcolor: '#fff' }}>
      <SectionWrap sx={{ py: { xs: 4, md: 5 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: '1.3fr 1fr 1fr 1fr 1fr' },
            columnGap: { xs: 2, sm: 3 },
            rowGap: { xs: 3, sm: 3 },
          }}
        >
          <Box sx={{ minWidth: 0, order: 0 }}>
            <Logo
              href={paths.international}
              sx={{
                mb: 1.25,
                width: 'auto',
                maxWidth: { xs: 112, sm: 124, md: 136 },
                height: { xs: 34, sm: 36, md: 40 },
                maxHeight: 42,
                objectFit: 'contain',
                objectPosition: 'left center',
              }}
            />
            <Typography
              sx={{ fontSize: 13, color: alpha(NAVY, 0.7), lineHeight: 1.5, mb: 2, maxWidth: 240 }}
            >
              {footerCopy.tagline}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {social.map((item) => {
                const clickable = Boolean(item.href);
                return (
                  <Box
                    key={item.icon}
                    component={clickable ? 'a' : 'div'}
                    href={clickable ? item.href : undefined}
                    target={clickable ? '_blank' : undefined}
                    rel={clickable ? 'noopener noreferrer' : undefined}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: `1px solid ${alpha(NAVY, 0.16)}`,
                      display: 'grid',
                      placeItems: 'center',
                      textDecoration: 'none',
                      color: 'inherit',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon={item.icon} width={14} sx={{ color: NAVY }} />
                  </Box>
                );
              })}
            </Box>
          </Box>

          {cols.map((col) => (
            <Box key={col.title} sx={{ minWidth: 0, order: { xs: 2, sm: 0 } }}>
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
                {(col.links || []).map((link) => {
                  const href = resolveFooterLinkHref(link);
                  const isInternal = href.startsWith('/');
                  return (
                    <Typography
                      key={link.label}
                      component={href ? 'a' : 'span'}
                      href={href || undefined}
                      target={!isInternal && href ? '_blank' : undefined}
                      rel={!isInternal && href ? 'noopener noreferrer' : undefined}
                      onClick={
                        isInternal
                          ? (e) => {
                              e.preventDefault();
                              navigateToAuthPath(router, href);
                            }
                          : undefined
                      }
                      sx={{
                        fontSize: 13.5,
                        color: alpha(NAVY, 0.72),
                        textDecoration: 'none',
                        cursor: href ? 'pointer' : 'default',
                        wordBreak: 'break-word',
                        '&:hover': href ? { color: RED } : undefined,
                      }}
                    >
                      {link.label}
                    </Typography>
                  );
                })}
              </Box>
            </Box>
          ))}

          <Box sx={{ minWidth: 0, order: { xs: 1, sm: 0 } }}>
            <LanguageBlock lang={lang} onChangeLang={setLang} regions={regions} fullWidth />
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
            {formatCopyright(footerCopy.copyrightText)}
          </Typography>
          <Typography sx={{ color: alpha('#fff', 0.7), fontSize: 12 }}>
            In partnership with industry programmes · IMDA
          </Typography>
        </DashboardContent>
      </Box>
    </Box>
  );
}
