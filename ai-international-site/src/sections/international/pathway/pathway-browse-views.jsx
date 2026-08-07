'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { layoutClasses } from 'src/layouts/classes';
import { frontendContentSx } from 'src/layouts/main/frontend-content-layout';
import { HOME_DASHBOARD_CONTENT_SX } from 'src/sections/home/home-section-styles';
import { getStoredIntlRegion } from '../intl-region';
import { MODULES } from '../pathway/pathway-modules';
import { usePathwayModuleVideos } from '../pathway/use-pathway-module-videos';
import { FOUNDATION, fmtMinutes, resolveModuleMinutes } from '../pathway/pathway-constants';

// ----------------------------------------------------------------------

const NAVY = '#002060';
const RED = '#C00000';

const PILLAR_META = {
  '01': {
    title: 'Pillar 1 — Foundations',
    blurb: 'AI basics, prompting, documents and everyday workflows.',
    color: '#1d4ed8',
    bg: '#e7edfc',
  },
  '02': {
    title: 'Pillar 2 — Applied practice',
    blurb: 'Role-ready tools and finance workflows.',
    color: '#b91c1c',
    bg: '#fbe7e7',
  },
  '03': {
    title: 'Pillar 3 — Governance & strategy',
    blurb: 'Risk, ethics, vendors and board-level decisions.',
    color: '#15803d',
    bg: '#e4f3ea',
  },
};

function useModulesCatalog() {
  const { minutesByCode, modulesByCode } = usePathwayModuleVideos();

  return useMemo(() => {
    const base = Object.fromEntries(MODULES.map((m) => [m.code, m]));
    Object.entries(modulesByCode || {}).forEach(([code, row]) => {
      base[code] = {
        ...(base[code] || {}),
        code,
        title: row.title || base[code]?.title || code,
        pillar: String(row.pillar || base[code]?.pillar || '01').padStart(2, '0'),
        minutes: Number(row.minutes) > 0 ? Number(row.minutes) : base[code]?.minutes || 0,
        bullets: Array.isArray(row.bullets) ? row.bullets : base[code]?.bullets || [],
      };
    });
    return { modulesLookup: base, minutesByCode };
  }, [modulesByCode, minutesByCode]);
}

function ModuleRow({ module, minutes }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        px: 2,
        py: 1.75,
        bgcolor: '#fff',
        border: `1px solid ${alpha(NAVY, 0.1)}`,
        borderRadius: '12px',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11.5,
            color: NAVY,
            fontWeight: 600,
            letterSpacing: '0.03em',
          }}
        >
          {module.code}
        </Typography>
        <Typography sx={{ mt: 0.35, fontWeight: 700, fontSize: 15, color: NAVY, lineHeight: 1.3 }}>
          {module.title}
        </Typography>
        {Array.isArray(module.bullets) && module.bullets.length ? (
          <Typography
            sx={{
              mt: 0.75,
              color: alpha(NAVY, 0.65),
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {module.bullets.slice(0, 2).join(' · ')}
          </Typography>
        ) : null}
      </Box>
      <Typography
        sx={{
          flex: 'none',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 12,
          color: alpha(NAVY, 0.55),
          fontWeight: 600,
        }}
      >
        {fmtMinutes(minutes)}
      </Typography>
    </Box>
  );
}

function ViewShell({ title, subtitle, children }) {
  const [region, setRegion] = useState(null);
  useEffect(() => {
    setRegion(getStoredIntlRegion());
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        bgcolor: '#f4f7fb',
        color: NAVY,
        minHeight: '100%',
        pb: 10,
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
      <DashboardContent sx={{ ...HOME_DASHBOARD_CONTENT_SX, pt: { xs: 4, md: 5 }, pb: 0 }}>
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <Button
            component={Link}
            href={paths.dashboard}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
            sx={{
              textTransform: 'none',
              color: alpha(NAVY, 0.65),
              px: 0,
              minWidth: 0,
              '&:hover': { bgcolor: 'transparent', color: NAVY },
            }}
          >
            Dashboard
          </Button>
        </Box>

        <Box sx={{ pb: 3, borderBottom: `1px solid ${alpha(NAVY, 0.12)}`, mb: 3.5 }}>
          <Typography
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11.5,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: RED,
              fontWeight: 500,
            }}
          >
            AI Fluency
            {region?.label ? ` · ${region.label}` : ''}
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: '"Newsreader", "Georgia", serif',
              fontWeight: 500,
              fontSize: { xs: 28, md: 40 },
              lineHeight: 1.08,
              mt: 1.25,
              color: NAVY,
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ mt: 1.25, maxWidth: 680, color: alpha(NAVY, 0.7), fontSize: 15, lineHeight: 1.55 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>

        {children}
      </DashboardContent>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function PathwayStudentView() {
  const { modulesLookup, minutesByCode } = useModulesCatalog();

  const sections = useMemo(() => {
    const foundationSet = new Set(FOUNDATION);
    const foundation = FOUNDATION.map((code) => modulesLookup[code]).filter(Boolean);
    const rest = Object.values(modulesLookup)
      .filter((m) => m?.code && !foundationSet.has(m.code))
      .sort((a, b) => String(a.code).localeCompare(String(b.code)));
    return [
      {
        id: 'foundation',
        title: 'Start here — Foundation',
        blurb: 'Recommended for every student before moving deeper.',
        modules: foundation,
      },
      {
        id: 'continue',
        title: 'Continue the series',
        blurb: 'The remaining modules in curriculum order.',
        modules: rest,
      },
    ];
  }, [modulesLookup]);

  return (
    <ViewShell
      title="Student path"
      subtitle="Same AI Fluency modules, organised as a guided student journey."
    >
      <Box sx={{ display: 'grid', gap: 3.5 }}>
        {sections.map((section) => (
          <Box key={section.id}>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: NAVY }}>{section.title}</Typography>
            <Typography sx={{ mt: 0.5, mb: 1.75, color: alpha(NAVY, 0.65), fontSize: 14 }}>
              {section.blurb}
            </Typography>
            <Box sx={{ display: 'grid', gap: 1.25 }}>
              {section.modules.map((m) => (
                <ModuleRow
                  key={m.code}
                  module={m}
                  minutes={resolveModuleMinutes(m.code, minutesByCode, modulesLookup)}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </ViewShell>
  );
}

export function PathwayPillarsView() {
  const { modulesLookup, minutesByCode } = useModulesCatalog();

  const pillars = useMemo(() => {
    const groups = { '01': [], '02': [], '03': [] };
    Object.values(modulesLookup)
      .filter((m) => m?.code)
      .sort((a, b) => String(a.code).localeCompare(String(b.code)))
      .forEach((m) => {
        const key = String(m.pillar || '01').padStart(2, '0');
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
      });
    return Object.keys(groups)
      .sort()
      .map((key) => ({
        key,
        meta: PILLAR_META[key] || {
          title: `Pillar ${Number(key)}`,
          blurb: '',
          color: NAVY,
          bg: alpha(NAVY, 0.06),
        },
        modules: groups[key],
      }))
      .filter((g) => g.modules.length);
  }, [modulesLookup]);

  return (
    <ViewShell
      title="Users (Pillars)"
      subtitle="Same AI Fluency modules, organised by Pillar 1, 2 and 3."
    >
      <Box sx={{ display: 'grid', gap: 3.5 }}>
        {pillars.map((pillar) => (
          <Box key={pillar.key}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1.25,
                py: 0.5,
                borderRadius: '8px',
                bgcolor: pillar.meta.bg,
                color: pillar.meta.color,
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                mb: 1,
              }}
            >
              Pillar {Number(pillar.key)}
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: NAVY }}>{pillar.meta.title}</Typography>
            {pillar.meta.blurb ? (
              <Typography sx={{ mt: 0.5, mb: 1.75, color: alpha(NAVY, 0.65), fontSize: 14 }}>
                {pillar.meta.blurb}
              </Typography>
            ) : (
              <Box sx={{ mb: 1.75 }} />
            )}
            <Box sx={{ display: 'grid', gap: 1.25 }}>
              {pillar.modules.map((m) => (
                <ModuleRow
                  key={m.code}
                  module={m}
                  minutes={resolveModuleMinutes(m.code, minutesByCode, modulesLookup)}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </ViewShell>
  );
}
