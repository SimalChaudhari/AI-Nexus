'use client';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { layoutClasses } from 'src/layouts/classes';
import { frontendContentSx } from 'src/layouts/main/frontend-content-layout';
import { HOME_DASHBOARD_CONTENT_SX } from 'src/sections/home/home-section-styles';
import { INTL_NAVY, INTL_NAVY_DEEP, INTL_RED, INTL_SOFT_BG } from 'src/theme/intl-brand';
import { usePathwayModuleVideos } from '../pathway/use-pathway-module-videos';
import { DEFAULT_FOUNDATION_NOTE } from '../pathway/pathway-constants';
import {
  PathwayBrowseList,
  PathwayPlannerView,
} from '../pathway/pathway-planner-view';
import { IntlFooter } from '../intl-footer';
import { INTL_REGIONS } from '../intl-region';

// ----------------------------------------------------------------------

const NAVY = INTL_NAVY;

const SECTION_LINKS = [
  { id: 'student', label: 'Student', icon: 'solar:bookmark-square-bold-duotone' },
  { id: 'roles', label: 'By role', icon: 'solar:users-group-rounded-bold-duotone' },
  { id: 'users', label: 'Pillars', icon: 'solar:widget-bold-duotone' },
];

const PILLAR_META = {
  '01': {
    title: 'Pillar 1 — Foundations',
    blurb: 'AI basics, prompting, documents and everyday workflows.',
    tierKey: 'tf',
  },
  '02': {
    title: 'Pillar 2 — Applied practice',
    blurb: 'Role-ready tools and finance workflows.',
    tierKey: 't3',
  },
  '03': {
    title: 'Pillar 3 — Governance & strategy',
    blurb: 'Risk, ethics, vendors and board-level decisions.',
    tierKey: 't2',
  },
};

function normalizePillar(value) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '01';
  return digits.padStart(2, '0').slice(-2);
}

/** Database modules only (intl_pathway_modules via /intl-pathway/planner). */
function useDbModulesCatalog() {
  const { videoUrlsByCode, minutesByCode, modulesByCode, loading } = usePathwayModuleVideos();

  const dbModules = useMemo(() => {
    const rows = Object.values(modulesByCode || {})
      .filter((row) => row && String(row.code || '').trim())
      .map((row) => ({
        code: String(row.code).trim(),
        title: String(row.title || row.code).trim(),
        pillar: normalizePillar(row.pillar),
        minutes: Number(row.minutes) > 0 ? Number(row.minutes) : 0,
        bullets: Array.isArray(row.bullets) ? row.bullets : [],
        sortOrder: Number(row.sortOrder) || 0,
        videoUrl: String(row.videoUrl || '').trim() || '',
      }))
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.code.localeCompare(b.code);
      });

    const modulesLookup = Object.fromEntries(rows.map((m) => [m.code, m]));
    return { rows, modulesLookup };
  }, [modulesByCode]);

  return {
    dbModules: dbModules.rows,
    modulesLookup: dbModules.modulesLookup,
    minutesByCode,
    videoUrlsByCode,
    loading,
  };
}

function SectionBlock({ eyebrow, title, subtitle, children, sx, hidden }) {
  return (
    <Box
      component="section"
      aria-hidden={hidden || undefined}
      sx={[
        {
          py: { xs: 4, md: 5.5 },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        hidden ? { display: 'none' } : null,
      ]}
    >
      <Stack spacing={0.75} sx={{ mb: subtitle ? 1.25 : 2.5 }}>
        <Typography
          sx={{
            color: alpha(NAVY, 0.62),
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </Typography>
        <Typography
          component="h2"
          sx={{
            m: 0,
            fontWeight: 800,
            fontSize: { xs: 22, md: 28 },
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: NAVY,
          }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            width: 48,
            height: 3,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${INTL_RED} 0%, ${NAVY} 100%)`,
          }}
        />
      </Stack>
      {subtitle ? (
        <Typography
          sx={{
            m: 0,
            mb: 3,
            maxWidth: 720,
            color: alpha(NAVY, 0.72),
            fontSize: { xs: 14.5, md: 15.5 },
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}

const SECTION_IDS = new Set(SECTION_LINKS.map((item) => item.id));

function readInitialSection() {
  if (typeof window === 'undefined') return 'student';
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('view');
  if (SECTION_IDS.has(fromQuery)) return fromQuery;
  const hash = window.location.hash?.replace('#', '');
  if (SECTION_IDS.has(hash)) return hash;
  return 'student';
}

function setSectionInUrl(id) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('view', id);
  url.hash = '';
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

// ----------------------------------------------------------------------

export function IntlDashboardView() {
  const [activeSection, setActiveSection] = useState('student');
  const { dbModules, modulesLookup, minutesByCode, videoUrlsByCode, loading } =
    useDbModulesCatalog();

  useEffect(() => {
    // Prefer ?view= / legacy #hash. Do not rewrite URL on mount (avoids route flicker).
    const initial = readInitialSection();
    setActiveSection(initial);
    if (typeof window !== 'undefined' && window.location.hash) {
      const url = new URL(window.location.href);
      url.hash = '';
      if (!url.searchParams.get('view') && SECTION_IDS.has(initial)) {
        url.searchParams.set('view', initial);
      }
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    }
  }, []);

  const selectSection = (id) => {
    setActiveSection(id);
    setSectionInUrl(id);
  };

  const studentSections = useMemo(() => {
    const codes = dbModules.filter((m) => m.pillar === '01').map((m) => m.code);
    return [
      {
        key: 'pillar-01',
        name: 'Pillar 1 — Foundations',
        tierKey: 'tf',
        note: DEFAULT_FOUNDATION_NOTE,
        codes,
      },
    ];
  }, [dbModules]);

  const usersSections = useMemo(() => {
    const groups = {};
    dbModules.forEach((m) => {
      if (!groups[m.pillar]) groups[m.pillar] = [];
      groups[m.pillar].push(m.code);
    });

    return Object.keys(groups)
      .sort()
      .map((key) => {
        const meta = PILLAR_META[key] || {
          title: `Pillar ${Number(key)}`,
          blurb: '',
          tierKey: 'tf',
        };
        return {
          key: `pillar-${key}`,
          name: meta.title,
          tierKey: meta.tierKey,
          note: meta.blurb,
          codes: groups[key],
        };
      });
  }, [dbModules]);

  const emptyDbNote = !loading && dbModules.length === 0;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        bgcolor: INTL_SOFT_BG,
        color: NAVY,
        minHeight: '100%',
        pb: 0,
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
      {/* Page hero header */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderBottom: `1px solid ${alpha(NAVY, 0.08)}`,
          background: `
            radial-gradient(ellipse 70% 80% at 100% 0%, ${alpha(NAVY, 0.08)} 0%, transparent 55%),
            linear-gradient(180deg, #ffffff 0%, ${INTL_SOFT_BG} 100%)
          `,
        }}
      >
        <DashboardContent sx={{ ...HOME_DASHBOARD_CONTENT_SX, pt: { xs: 2.5, md: 3.5 }, pb: { xs: 3, md: 4 } }}>
          <Box sx={{ maxWidth: 640 }}>
            <Typography
              sx={{
                mb: 1.25,
                display: 'inline-flex',
                alignItems: 'center',
                px: 1.25,
                py: 0.4,
                borderRadius: 1,
                bgcolor: alpha(NAVY, 0.06),
                color: NAVY,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Learning dashboard
            </Typography>

            <Typography
              component="h1"
              sx={{
                m: 0,
                fontWeight: 800,
                fontSize: { xs: 30, sm: 36, md: 42 },
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: NAVY,
              }}
            >
              AI Fluency
            </Typography>

            <Typography
              sx={{
                mt: 1.5,
                m: 0,
                color: alpha(NAVY, 0.72),
                fontSize: { xs: 15, md: 16 },
                lineHeight: 1.6,
              }}
            >
              Practical AI learning for accountancy professionals — browse by student path, role, or
              pillar.
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ mt: { xs: 2.5, md: 3 } }}
          >
            {SECTION_LINKS.map((item) => {
              const active = activeSection === item.id;
              return (
                <Button
                  key={item.id}
                  variant="outlined"
                  size="small"
                  startIcon={<Iconify icon={item.icon} width={16} />}
                  onClick={() => selectSection(item.id)}
                  aria-pressed={active}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 999,
                    px: 1.75,
                    py: 0.75,
                    color: active ? INTL_NAVY_DEEP : NAVY,
                    borderColor: active ? INTL_RED : alpha(NAVY, 0.18),
                    bgcolor: active ? '#fff' : alpha('#fff', 0.8),
                    boxShadow: active ? `0 0 0 1px ${alpha(INTL_RED, 0.25)}` : 'none',
                    '&:hover': {
                      borderColor: INTL_RED,
                      bgcolor: '#fff',
                      color: INTL_NAVY_DEEP,
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>
        </DashboardContent>
      </Box>

      <DashboardContent sx={{ ...HOME_DASHBOARD_CONTENT_SX, pt: 0, pb: 0 }}>
        <SectionBlock
          hidden={activeSection !== 'student'}
          eyebrow="01 · Foundations"
          title="Student"
          subtitle="Pillar 1 modules from the database — open any card to watch its video."
        >
          {loading ? (
            <Typography sx={{ color: alpha(NAVY, 0.65) }}>Loading modules from database…</Typography>
          ) : emptyDbNote || !studentSections[0]?.codes?.length ? (
            <Typography sx={{ color: alpha(NAVY, 0.65) }}>
              No Pillar 1 modules found in the database yet.
            </Typography>
          ) : (
            <PathwayBrowseList
              heading={
                <>
                  Path for the{' '}
                  <Box component="span" sx={{ color: INTL_NAVY_DEEP, fontStyle: 'italic' }}>
                    Student
                  </Box>
                </>
              }
              blurb="Only Pillar 1 modules saved in the database are shown here. Sign up to watch videos."
              sections={studentSections}
              videoUrlsByCode={videoUrlsByCode}
              minutesByCode={minutesByCode}
              modulesLookup={modulesLookup}
              requireAuth
              returnTo={`${paths.dashboard}?view=student`}
            />
          )}
        </SectionBlock>

        <SectionBlock
          hidden={activeSection !== 'roles'}
          eyebrow="02 · Recommended path"
          title="AI Fluency by role"
          subtitle="Choose your role and build a recommended pathway for your practice."
          sx={{
            bgcolor: alpha(NAVY, 0.03),
            mx: { xs: -1.25, sm: -2, md: -3, lg: -4 },
            px: { xs: 1.25, sm: 2, md: 3, lg: 4 },
            borderRadius: { md: 2 },
            borderTop: `1px solid ${alpha(NAVY, 0.06)}`,
            borderBottom: `1px solid ${alpha(NAVY, 0.06)}`,
          }}
        >
          <PathwayPlannerView embedded />
        </SectionBlock>

        <SectionBlock
          hidden={activeSection !== 'users'}
          eyebrow="03 · Full catalogue"
          title="Users (Pillars)"
          subtitle="All pillars and modules from the database — whatever is saved is what you see."
        >
          {loading ? (
            <Typography sx={{ color: alpha(NAVY, 0.65) }}>Loading modules from database…</Typography>
          ) : emptyDbNote ? (
            <Typography sx={{ color: alpha(NAVY, 0.65) }}>
              No pathway modules found in the database yet.
            </Typography>
          ) : (
            <PathwayBrowseList
              heading={
                <>
                  Browse by{' '}
                  <Box component="span" sx={{ color: INTL_NAVY_DEEP, fontStyle: 'italic' }}>
                    Pillar
                  </Box>
                </>
              }
              blurb="Every module from the database, grouped by its pillar. Sign up to watch videos."
              sections={usersSections}
              videoUrlsByCode={videoUrlsByCode}
              minutesByCode={minutesByCode}
              modulesLookup={modulesLookup}
              requireAuth
              returnTo={`${paths.dashboard}?view=users`}
            />
          )}
        </SectionBlock>
      </DashboardContent>

      <IntlFooter regions={INTL_REGIONS} />
    </Box>
  );
}
