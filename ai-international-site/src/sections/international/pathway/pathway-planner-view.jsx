'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { useIntlAuth } from 'src/auth/intl-auth-context';
import { isIntlAuthenticated } from 'src/auth/intl-session';
import { resolveAssetUrl } from 'src/utils/asset-url';
import { navigateToAuthPath } from 'src/utils/intl-auth-navigate';
import { getYouTubeVideoId } from 'src/utils/youtube';
import { buildSpotlightrEmbedUrl, parseSpotlightrUrl } from 'src/utils/spotlightr';

import { getStoredIntlRegion } from '../intl-region';
import { MODULES } from './pathway-modules';
import { ROLES } from './pathway-roles';
import { usePathwayModuleVideos } from './use-pathway-module-videos';
import {
  DEFAULT_FOUNDATION_NOTE,
  FOUNDATION,
  TARGET,
  TIER,
  autoSelect,
  fmtMinutes,
  resolveModuleMinutes,
  roleEntries,
  roleFoundation,
  sumSelectedMinutes,
} from './pathway-constants';
import { DashboardContent } from 'src/layouts/dashboard';
import { layoutClasses } from 'src/layouts/classes';
import { frontendContentSx } from 'src/layouts/main/frontend-content-layout';
import { HOME_DASHBOARD_CONTENT_SX } from 'src/sections/home/home-section-styles';

// ----------------------------------------------------------------------

const NAVY = '#002060';
const NAVY_DEEP = '#001545';
const RED = '#C00000';
const GREEN = '#0f766e';
const GREEN_LIGHT = '#d1fae5';

const tokens = {
  ink: '#0f1a2e',
  inkSoft: '#3d4f6f',
  inkFaint: '#7a8aa3',
  paper: '#f4f7fb',
  card: '#ffffff',
  line: '#d8dee8',
  pine: NAVY,
  pineDeep: NAVY_DEEP,
  accent: RED,
  green: GREEN,
  greenLight: GREEN_LIGHT,
  gold: '#a45a12',
  sky: '#eef3f9',
  shadow: '0 1px 2px rgba(0,32,96,.06), 0 8px 24px rgba(0,32,96,.08)',
};

const FSET = new Set(FOUNDATION);
const MODULES_BY_CODE = Object.fromEntries(MODULES.map((m) => [m.code, m]));

function useCanPlayIntlVideo() {
  const { user } = useIntlAuth();
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    setCanPlay(Boolean(user) || isIntlAuthenticated());
  }, [user]);

  return canPlay;
}

const CheckIcon = (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    sx={{ width: 13, height: 13, stroke: '#fff', strokeWidth: 3, fill: 'none', opacity: 0 }}
  >
    <polyline points="4 12 10 18 20 6" />
  </Box>
);

const LockIcon = (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    sx={{ width: 12, height: 12, stroke: '#fff', strokeWidth: 2, fill: 'none' }}
  >
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Box>
);

// ----------------------------------------------------------------------

export function PathwayPlannerView({ embedded = false }) {
  const [region, setRegion] = useState(null);
  const canPlayVideo = useCanPlayIntlVideo();
  const { videoUrlsByCode, minutesByCode, modulesByCode, roles: apiRoles } = usePathwayModuleVideos();
  const returnTo = embedded ? `${paths.dashboard}?view=roles` : paths.internationalAiFluencyRoles;
  const signupHref = `${paths.auth.signUp}?returnTo=${encodeURIComponent(returnTo)}`;
  const signInHref = `${paths.auth.signIn}?returnTo=${encodeURIComponent(returnTo)}`;
  const roles = apiRoles?.length
    ? apiRoles.map((r) => ({
        name: r.name,
        blurb: r.blurb || '',
        reqExclude: Array.isArray(r.reqExclude) ? r.reqExclude : [],
        reqAdd: Array.isArray(r.reqAdd) ? r.reqAdd : [],
        reqNote: r.reqNote || undefined,
        scores: r.scores && typeof r.scores === 'object' ? r.scores : {},
      }))
    : ROLES;

  useEffect(() => {
    setRegion(getStoredIntlRegion());
  }, []);

  const modulesLookup = useMemo(() => {
    const base = { ...MODULES_BY_CODE };
    Object.entries(modulesByCode || {}).forEach(([code, row]) => {
      base[code] = {
        ...(base[code] || {}),
        code,
        title: row.title || base[code]?.title || code,
        pillar: row.pillar || base[code]?.pillar || '01',
        minutes: Number(row.minutes) > 0 ? Number(row.minutes) : base[code]?.minutes || 0,
        bullets: Array.isArray(row.bullets) ? row.bullets : base[code]?.bullets || [],
      };
    });
    return base;
  }, [modulesByCode]);

  const [roleIdx, setRoleIdx] = useState(0);
  const [selected, setSelected] = useState(() => autoSelect(roles[0] || ROLES[0], MODULES_BY_CODE, FSET));
  const [lockedSet, setLockedSet] = useState(() => new Set(roleFoundation(roles[0] || ROLES[0])));
  const [openCodes, setOpenCodes] = useState(() => new Set());

  useEffect(() => {
    if (!roles.length) return;
    const role = roles[Math.min(roleIdx, roles.length - 1)] || roles[0];
    setLockedSet(new Set(roleFoundation(role)));
    setSelected(autoSelect(role, modulesLookup, FSET, minutesByCode));
    setOpenCodes(new Set());
    // Re-sync when catalog arrives from API
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRoles, modulesByCode, minutesByCode]);

  const totalMinutes = useMemo(
    () => sumSelectedMinutes(selected, minutesByCode, modulesLookup),
    [selected, minutesByCode, modulesLookup]
  );

  const catalogStats = useMemo(() => {
    const codes = Object.keys(modulesLookup);
    const pillars = new Set(codes.map((c) => String(modulesLookup[c]?.pillar || '')));
    const runtime = codes.reduce(
      (t, c) => t + resolveModuleMinutes(c, minutesByCode, modulesLookup),
      0
    );
    return {
      moduleCount: codes.length,
      pillarCount: pillars.size,
      runtimeLabel: fmtMinutes(runtime),
    };
  }, [modulesLookup, minutesByCode]);

  const pickRole = (i) => {
    const role = roles[i];
    if (!role) return;
    setRoleIdx(i);
    setLockedSet(new Set(roleFoundation(role)));
    setSelected(autoSelect(role, modulesLookup, FSET, minutesByCode));
    setOpenCodes(new Set());
  };

  const toggleModule = (code) => {
    if (lockedSet.has(code)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleOpen = (code) => {
    setOpenCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const resetPath = () => {
    if (roleIdx === null || !roles[roleIdx]) return;
    setSelected(autoSelect(roles[roleIdx], modulesLookup, FSET, minutesByCode));
    setOpenCodes(new Set());
  };

  const plannerBody = (
    <>
      {!embedded ? (
        <>
          <Box sx={{ mb: 2 }}>
            <Button
              component={Link}
              href={paths.dashboard}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
              sx={{
                textTransform: 'none',
                color: tokens.inkSoft,
                px: 0,
                minWidth: 0,
                gap: 0.25,
                '& .MuiButton-startIcon': { mr: 0.5 },
                '&:hover': { bgcolor: 'transparent', color: tokens.pine },
              }}
            >
              Dashboard
            </Button>
          </Box>

          <Box sx={{ pb: 3.25, borderBottom: `1px solid ${tokens.line}` }}>
            <Typography
              sx={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11.5,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: tokens.accent,
                fontWeight: 500,
              }}
            >
              ISCA AI Fluency Series · Pathway Planner
              {region?.label ? ` · ${region.label}` : ''}
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Newsreader", "Georgia", serif',
                fontWeight: 500,
                fontSize: { xs: 30, md: 46 },
                lineHeight: 1.04,
                mt: 1.5,
                mb: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              Build your{' '}
              <Box component="em" sx={{ fontStyle: 'italic', color: tokens.pineDeep }}>
                10-hour
              </Box>{' '}
              route to AI fluency
            </Typography>
            <Typography sx={{ maxWidth: 620, color: tokens.inkSoft, fontSize: 16 }}>
              Choose your role, and we add the modules that matter most for your work, fit to a ten-hour
              learning budget you can fine-tune.
            </Typography>
          </Box>
        </>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
          gap: { xs: 3, md: 4.75 },
          mt: embedded ? 0 : 4,
          alignItems: 'start',
        }}
      >
          {/* Outer column stretches with the path so sticky has room to pin */}
          <Box
            sx={{
              alignSelf: { md: 'stretch' },
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                position: { md: 'sticky' },
                top: { md: 24 },
                zIndex: { md: 2 },
                display: 'flex',
                flexDirection: 'column',
                gap: 2.75,
                maxHeight: { md: 'calc(100vh - 48px)' },
                overflowY: { md: 'auto' },
                overscrollBehavior: 'contain',
                pr: { md: 0.5 },
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <Box>
                <PanelLabel>Select your role</PanelLabel>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.875 }}>
                  {roles.map((role, i) => (
                    <Box
                      key={role.name}
                      component="button"
                      type="button"
                      onClick={() => pickRole(i)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        width: '100%',
                        textAlign: 'left',
                        bgcolor: i === roleIdx ? tokens.pine : tokens.card,
                        border: `1px solid ${i === roleIdx ? tokens.pine : tokens.line}`,
                        borderRadius: '11px',
                        px: 1.875,
                        py: 1.625,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        color: i === roleIdx ? '#fff' : tokens.ink,
                        boxShadow: i === roleIdx ? tokens.shadow : 'none',
                        transition: '.16s ease',
                        '&:hover': {
                          borderColor: tokens.pine,
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          fontFamily: '"IBM Plex Mono", monospace',
                          fontSize: 12,
                          color: i === roleIdx ? 'rgba(255,255,255,.65)' : tokens.inkFaint,
                          fontWeight: 500,
                          minWidth: 22,
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </Box>
                      <Box sx={{ fontWeight: 600, fontSize: 14.5 }}>{role.name}</Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              <BudgetMeter
                totalMinutes={totalMinutes}
                selectedCount={selected.size}
                showReset={roleIdx !== null}
                onReset={resetPath}
              />
            </Box>
          </Box>

          <Box>
            {roleIdx === null ? (
              <Box
                sx={{
                  bgcolor: tokens.card,
                  border: `1px dashed ${tokens.line}`,
                  borderRadius: '14px',
                  px: 3.75,
                  py: 6.75,
                  textAlign: 'center',
                  color: tokens.inkFaint,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"Newsreader", "Georgia", serif',
                    fontWeight: 500,
                    color: tokens.inkSoft,
                    fontSize: 22,
                    mb: 1,
                  }}
                >
                  No role selected yet
                </Typography>
                <Typography sx={{ fontSize: 15 }}>
                  Choose a role on the left to see a recommended set of modules totalling around ten
                  hours.
                </Typography>
              </Box>
            ) : (
              <RolePlan
                role={roles[roleIdx]}
                selected={selected}
                lockedSet={lockedSet}
                openCodes={openCodes}
                videoUrlsByCode={videoUrlsByCode}
                minutesByCode={minutesByCode}
                modulesLookup={modulesLookup}
                canPlayVideo={canPlayVideo}
                signupHref={signupHref}
                signInHref={signInHref}
                onToggle={toggleModule}
                onToggleOpen={toggleOpen}
              />
            )}
          </Box>
        </Box>

        <Typography
          sx={{
            mt: 5,
            pt: 2.5,
            borderTop: `1px solid ${tokens.line}`,
            fontSize: 12,
            color: tokens.inkFaint,
            lineHeight: 1.6,
          }}
        >
          <Box component="span" sx={{ fontFamily: '"IBM Plex Mono", monospace', color: tokens.inkSoft }}>
            {catalogStats.moduleCount} modules · {catalogStats.pillarCount} pillars ·{' '}
            {catalogStats.runtimeLabel} total runtime.
          </Box>{' '}
          Recommendations are curated from each module&apos;s content and runtime against the demands of
          your role. Tiers: <strong>Essential</strong> is core to your work ·{' '}
          <strong>Recommended</strong> strengthens it · <strong>Optional</strong> extends it. Toggle any
          module to reshape your plan.
        </Typography>
    </>
  );

  if (embedded) {
    return (
      <Box sx={{ width: '100%', color: tokens.ink, bgcolor: 'transparent' }}>
        {plannerBody}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'clip',
        bgcolor: tokens.paper,
        color: tokens.ink,
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
        {plannerBody}
      </DashboardContent>
    </Box>
  );
}

// ----------------------------------------------------------------------

function PanelLabel({ children }) {
  return (
    <Typography
      sx={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 11,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: tokens.inkFaint,
        mb: 1.5,
        fontWeight: 500,
      }}
    >
      {children}
    </Typography>
  );
}

function BudgetMeter({ totalMinutes, selectedCount, showReset, onReset }) {
  const BAR_MAX = 720;
  const scaled = Math.min((totalMinutes / BAR_MAX) * 100, 100);
  const over = totalMinutes > TARGET;
  const onTarget = Math.abs(totalMinutes - TARGET) <= 30 && totalMinutes > 0;
  const diff = totalMinutes - TARGET;

  // Exact split — no rounding of minutes.
  const totalSeconds = Math.round(Math.max(0, Number(totalMinutes) || 0) * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  let sub;
  if (totalMinutes === 0) sub = 'Pick a role to begin.';
  else if (onTarget)
    sub = (
      <>
        <strong>{selectedCount} modules</strong> · right on your ten-hour target.
      </>
    );
  else if (diff < 0)
    sub = (
      <>
        <strong>{selectedCount} modules</strong> · {fmtMinutes(-diff)} under target — room to add more.
      </>
    );
  else
    sub = (
      <>
        <strong>{selectedCount} modules</strong> · {fmtMinutes(diff)} over target — trim to tighten.
      </>
    );

  // Green when on target / under; primary red only when meaningfully over
  const fillColor = over && !onTarget ? tokens.accent : tokens.green;

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: `1px solid ${tokens.line}`,
        borderRadius: '14px',
        px: 2.25,
        pt: 2.25,
        pb: 2.25,
        boxShadow: tokens.shadow,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
        <Typography
          sx={{
            fontFamily: '"Newsreader", "Georgia", serif',
            fontSize: 19,
            fontWeight: 500,
            color: tokens.ink,
          }}
        >
          Your plan
        </Typography>
        <Typography
          sx={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11.5,
            color: tokens.inkFaint,
          }}
        >
          Target · {fmtMinutes(TARGET)}
        </Typography>
      </Box>

      <Typography
        sx={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 34,
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: tokens.ink,
          my: 1,
        }}
      >
        {hours > 0 && (
          <>
            {hours}
            <Box component="span" sx={{ fontSize: 15, color: tokens.inkFaint, ml: 0.375, mr: 0.75 }}>
              h
            </Box>
          </>
        )}
        {(minutes > 0 || hours === 0) && (
          <>
            {minutes}
            <Box component="span" sx={{ fontSize: 15, color: tokens.inkFaint, ml: 0.375 }}>
              m
            </Box>
          </>
        )}
      </Typography>

      <Typography sx={{ fontSize: 12.5, color: tokens.inkSoft, mb: 1.75 }}>{sub}</Typography>

      {/* Track + fill + tick (clip so nothing spills outside card) */}
      <Box sx={{ position: 'relative', height: 12, mb: showReset ? 2.5 : 0.5 }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: tokens.greenLight,
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: 1,
              width: `${scaled}%`,
              maxWidth: '100%',
              bgcolor: fillColor,
              minHeight: 12,
              // left rounded, right flat (like the reference)
              borderRadius: scaled >= 99 ? 20 : '20px 0 0 20px',
              transition: 'width .5s cubic-bezier(.2,.8,.2,1), background .3s',
            }}
          />
        </Box>

        <Box
          sx={{
            position: 'absolute',
            left: '83.333%',
            top: 0,
            bottom: 0,
            width: 2,
            bgcolor: tokens.ink,
            opacity: 0.55,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      </Box>

      {showReset && (
        <Button
          onClick={onReset}
          fullWidth
          sx={{
            mt: 0.5,
            border: `1px solid ${tokens.line}`,
            borderRadius: '9px',
            py: 1.125,
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11.5,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: tokens.inkSoft,
            bgcolor: 'transparent',
            boxShadow: 'none',
            '&:hover': {
              borderColor: tokens.pine,
              color: tokens.pine,
              bgcolor: 'transparent',
              boxShadow: 'none',
            },
          }}
        >
          ↺ Reset to recommended path
        </Button>
      )}
    </Box>
  );
}

function RolePlan({
  role,
  selected,
  lockedSet,
  openCodes,
  videoUrlsByCode,
  minutesByCode,
  modulesLookup,
  canPlayVideo = false,
  signupHref = paths.auth.signUp,
  signInHref = paths.auth.signIn,
  onToggle,
  onToggleOpen,
}) {
  const req = roleFoundation(role);
  const byTier = { 3: [], 2: [], 1: [] };
  roleEntries(role, FSET).forEach(([c, v]) => byTier[v].push(c));
  Object.values(byTier).forEach((a) => a.sort());
  const reqMin = sumSelectedMinutes(req, minutesByCode, modulesLookup);
  const note = role.reqNote || DEFAULT_FOUNDATION_NOTE;

  const tierMinutesLabel = (codes) => {
    const selectedInTier = codes.filter((c) => selected.has(c));
    const mins = sumSelectedMinutes(selectedInTier, minutesByCode, modulesLookup);
    return `${selectedInTier.length}/${codes.length} selected · ${fmtMinutes(mins)}`;
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 0.75,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Newsreader", "Georgia", serif',
            fontWeight: 500,
            fontSize: 26,
            letterSpacing: '-0.01em',
          }}
        >
          Recommended path for the{' '}
          <Box component="span" sx={{ color: tokens.pineDeep, fontStyle: 'italic' }}>
            {role.name}
          </Box>
        </Typography>
        <Typography
          sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: tokens.inkFaint }}
        >
          {req.length + roleEntries(role, FSET).length} modules mapped
        </Typography>
      </Box>
      <Typography sx={{ color: tokens.inkSoft, fontSize: 14.5, maxWidth: 640, mb: 2.75 }}>
        {role.blurb}
      </Typography>

      <TierSection
        tierKey="tf"
        name="Foundation · required"
        countLabel={`${req.length} modules · ${fmtMinutes(reqMin)}`}
        note={note}
      >
        {req.map((code) => (
          <ModuleCard
            key={code}
            code={code}
            locked
            selected={selected.has(code)}
            open={openCodes.has(code)}
            videoUrl={videoUrlsByCode?.[code] || ''}
            minutes={resolveModuleMinutes(code, minutesByCode, modulesLookup)}
            moduleMeta={modulesLookup?.[code]}
            canPlayVideo={canPlayVideo}
            signupHref={signupHref}
            signInHref={signInHref}
            onToggle={onToggle}
            onToggleOpen={onToggleOpen}
          />
        ))}
      </TierSection>

      {[3, 2, 1].map((t) => {
        const codes = byTier[t];
        if (!codes.length) return null;
        return (
          <TierSection
            key={t}
            tierKey={TIER[t].k}
            name={`${TIER[t].label} for ${role.name}`}
            countLabel={tierMinutesLabel(codes)}
          >
            {codes.map((code) => (
              <ModuleCard
                key={code}
                code={code}
                locked={false}
                selected={selected.has(code)}
                open={openCodes.has(code)}
                videoUrl={videoUrlsByCode?.[code] || ''}
                minutes={resolveModuleMinutes(code, minutesByCode, modulesLookup)}
                moduleMeta={modulesLookup?.[code]}
                canPlayVideo={canPlayVideo}
                signupHref={signupHref}
                signInHref={signInHref}
                onToggle={onToggle}
                onToggleOpen={onToggleOpen}
              />
            ))}
          </TierSection>
        );
      })}
    </Box>
  );
}

function TierSection({ tierKey, name, countLabel, note, children }) {
  const colorMap = {
    tf: tokens.ink,
    t3: tokens.gold,
    t2: tokens.pineDeep,
    t1: tokens.inkFaint,
  };
  const color = colorMap[tierKey] || tokens.ink;

  return (
    <Box sx={{ mb: 3.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, flex: 'none' }} />
        <Typography
          sx={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 12,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
            color,
          }}
        >
          {name}
        </Typography>
        <Box sx={{ flex: 1, height: 1, bgcolor: tokens.line }} />
        <Typography
          sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5, color: tokens.inkFaint }}
        >
          {countLabel}
        </Typography>
      </Box>
      {note && (
        <Typography sx={{ mt: -0.5, mb: 1.75, fontSize: 13, color: tokens.inkSoft, maxWidth: 640 }}>
          {note}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.125 }}>{children}</Box>
    </Box>
  );
}

function ModuleCard({
  code,
  locked,
  selected,
  open,
  videoUrl,
  minutes: minutesProp,
  moduleMeta,
  onToggle,
  onToggleOpen,
  browse = false,
  canPlayVideo = false,
  signupHref = paths.auth.signUp,
  signInHref = paths.auth.signIn,
}) {
  const m = moduleMeta || MODULES_BY_CODE[code] || { code, title: code, pillar: '01', minutes: 0 };
  const minutes = Number(minutesProp) > 0 ? Number(minutesProp) : Number(m.minutes) || 0;
  const pillarColors = {
    1: { color: '#1d4ed8', bg: '#e7edfc', border: '#c7d6f7' },
    2: { color: '#b91c1c', bg: '#fbe7e7', border: '#f3c9c9' },
    3: { color: '#15803d', bg: '#e4f3ea', border: '#c3e5cf' },
  };
  const pillar = pillarColors[+m.pillar] || pillarColors[1];
  const showAuthGate = !canPlayVideo;

  const handleRowClick = () => {
    if (browse) {
      onToggleOpen(code);
      return;
    }
    onToggle?.(code);
  };

  return (
    <Box
      sx={{
        bgcolor: !browse && locked ? '#eef3f9' : tokens.card,
        border: `1px solid ${!browse && selected ? tokens.pine : tokens.line}`,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: !browse && selected ? tokens.shadow : 'none',
        transition: '.16s ease',
      }}
    >
      <Box
        onClick={handleRowClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.75,
          px: 2,
          py: 1.75,
          cursor: browse ? 'pointer' : locked ? 'default' : 'pointer',
        }}
      >
        {!browse ? (
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: '6px',
              border: `1.5px solid ${selected || locked ? tokens.ink : tokens.line}`,
              flex: 'none',
              display: 'grid',
              placeItems: 'center',
              bgcolor: selected || locked ? (locked ? tokens.ink : tokens.pine) : '#fff',
              borderColor: selected || locked ? (locked ? tokens.ink : tokens.pine) : tokens.line,
              '& svg': { opacity: selected || locked ? 1 : 0 },
            }}
          >
            {locked ? LockIcon : CheckIcon}
          </Box>
        ) : null}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography
              component="span"
              sx={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11.5,
                color: tokens.pine,
                fontWeight: 500,
                letterSpacing: '0.03em',
              }}
            >
              {code}
            </Typography>
            <Box
              component="span"
              sx={{
                ml: 1,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 9,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                borderRadius: '4px',
                px: 0.75,
                py: 0.125,
                color: pillar.color,
                bgcolor: pillar.bg,
                border: `1px solid ${pillar.border}`,
              }}
            >
              Pillar {+m.pillar}
            </Box>
            {!browse && locked && (
              <Box
                component="span"
                sx={{
                  ml: 1,
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: tokens.accent,
                  bgcolor: 'rgba(192,0,0,0.08)',
                  borderRadius: '4px',
                  px: 0.75,
                  py: 0.125,
                  fontWeight: 600,
                }}
              >
                Required
              </Box>
            )}
          </Box>
          <Typography sx={{ fontWeight: 600, fontSize: 15, mt: 0.125 }}>{m.title}</Typography>
        </Box>

        <Box
          sx={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 14,
            color: tokens.inkSoft,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            textAlign: 'right',
          }}
        >
          {fmtMinutes(minutes)}
        </Box>

        <Box
          component="button"
          type="button"
          aria-label="Show video"
          onClick={(e) => {
            e.stopPropagation();
            onToggleOpen(code);
          }}
          sx={{
            bgcolor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: tokens.inkFaint,
            p: 0.75,
            borderRadius: '6px',
            display: 'grid',
            placeItems: 'center',
            '&:hover': { bgcolor: tokens.sky, color: tokens.pine },
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            sx={{
              width: 16,
              height: 16,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform .2s',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          maxHeight: open ? 2000 : 0,
          overflow: 'hidden',
          transition: 'max-height .3s ease',
          borderTop: open ? `1px solid ${tokens.line}` : '1px solid transparent',
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 2, pl: { xs: 2, sm: browse ? 2 : 6.5 } }}>
          {open &&
            (showAuthGate ? (
              <VideoSignupGate signupHref={signupHref} signInHref={signInHref} />
            ) : (
              <ModuleVideoPanel title={m.title} videoUrl={videoUrl} />
            ))}
        </Box>
      </Box>
    </Box>
  );
}

function VideoSignupGate({ signupHref, signInHref }) {
  const router = useRouter();
  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: '10px',
        border: `1px solid ${tokens.line}`,
        bgcolor: tokens.sky,
        aspectRatio: { xs: 'auto', sm: '16 / 9' },
        minHeight: { xs: 180, sm: 0 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1.5,
        px: 3,
        py: 4,
      }}
    >
      <Iconify icon="solar:lock-keyhole-bold-duotone" width={36} sx={{ color: tokens.pine }} />
      <Typography sx={{ fontWeight: 700, fontSize: 16, color: tokens.ink, maxWidth: 360 }}>
        Sign in to watch this video
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: tokens.inkSoft, maxWidth: 380, lineHeight: 1.5 }}>
        Module videos are available only after you log in. Create a free account if you do not have one yet.
      </Typography>
      <Button
        component="a"
        href={signInHref}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navigateToAuthPath(router, signInHref);
        }}
        variant="contained"
        sx={{
          mt: 0.5,
          textTransform: 'none',
          fontWeight: 700,
          bgcolor: tokens.accent,
          color: '#fff',
          px: 2.5,
          py: 1,
          borderRadius: '10px',
          boxShadow: 'none',
          '&:hover': { bgcolor: '#a00000', boxShadow: 'none' },
        }}
      >
        Sign in
      </Button>
      <Typography sx={{ fontSize: 13, color: tokens.inkSoft }}>
        New here?{' '}
        <Box
          component="a"
          href={signupHref}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigateToAuthPath(router, signupHref);
          }}
          sx={{ color: tokens.pine, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}
        >
          Sign up
        </Box>
      </Typography>
    </Box>
  );
}

/**
 * Same module cards + video expand as the Role planner,
 * without the role sidebar or “Your plan” meter.
 */
export function PathwayBrowseList({
  heading,
  blurb,
  sections = [],
  videoUrlsByCode,
  minutesByCode,
  modulesLookup,
  returnTo = paths.dashboard,
}) {
  const [openCodes, setOpenCodes] = useState(() => new Set());
  const canPlayVideo = useCanPlayIntlVideo();

  const toggleOpen = (code) => {
    setOpenCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const mappedCount = sections.reduce((n, s) => n + (s.codes?.length || 0), 0);
  const signupHref = `${paths.auth.signUp}?returnTo=${encodeURIComponent(returnTo)}`;
  const signInHref = `${paths.auth.signIn}?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <Box sx={{ color: tokens.ink }}>
      {(heading || blurb) && (
        <Box sx={{ mb: 2.75 }}>
          {heading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                gap: 1.5,
                mb: 0.75,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Newsreader", "Georgia", serif',
                  fontWeight: 500,
                  fontSize: 26,
                  letterSpacing: '-0.01em',
                }}
              >
                {heading}
              </Typography>
              <Typography
                sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: tokens.inkFaint }}
              >
                {mappedCount} modules
              </Typography>
            </Box>
          ) : null}
          {blurb ? (
            <Typography sx={{ color: tokens.inkSoft, fontSize: 14.5, maxWidth: 640 }}>
              {blurb}
            </Typography>
          ) : null}
        </Box>
      )}

      {sections.map((section) => {
        const codes = Array.isArray(section.codes) ? section.codes : [];
        if (!codes.length) return null;
        const mins = sumSelectedMinutes(codes, minutesByCode, modulesLookup);
        return (
          <TierSection
            key={section.key || section.name}
            tierKey={section.tierKey || 'tf'}
            name={section.name}
            countLabel={section.countLabel || `${codes.length} modules · ${fmtMinutes(mins)}`}
            note={section.note}
          >
            {codes.map((code) => (
              <ModuleCard
                key={code}
                code={code}
                browse
                locked={false}
                selected={false}
                open={openCodes.has(code)}
                videoUrl={videoUrlsByCode?.[code] || ''}
                minutes={resolveModuleMinutes(code, minutesByCode, modulesLookup)}
                moduleMeta={modulesLookup?.[code]}
                onToggleOpen={toggleOpen}
                canPlayVideo={canPlayVideo}
                signupHref={signupHref}
                signInHref={signInHref}
              />
            ))}
          </TierSection>
        );
      })}
    </Box>
  );
}

function isDirectVideoUrl(url) {
  if (!url) return false;
  const cleaned = String(url).split('?')[0].split('#')[0].toLowerCase();
  return /\.(mp4|webm|ogg|m4v|mov)$/.test(cleaned) || cleaned.includes('/uploads/');
}

function resolveModuleMedia(videoUrl) {
  const raw = String(videoUrl || '').trim();
  if (!raw) return { kind: 'empty' };

  const youtubeId = getYouTubeVideoId(raw);
  if (youtubeId) {
    return {
      kind: 'iframe',
      src: `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`,
    };
  }

  const spotlightr = parseSpotlightrUrl(raw);
  if (spotlightr) {
    return {
      kind: 'iframe',
      src: buildSpotlightrEmbedUrl(spotlightr.watchUrl),
    };
  }

  const resolved = resolveAssetUrl(raw);
  if (isDirectVideoUrl(resolved) || isDirectVideoUrl(raw)) {
    return { kind: 'video', src: resolved };
  }

  // Unknown absolute URL — try iframe embed as last resort.
  if (/^https?:\/\//i.test(resolved)) {
    return { kind: 'iframe', src: resolved };
  }

  return { kind: 'empty' };
}

function ModuleVideoPanel({ title, videoUrl }) {
  const media = resolveModuleMedia(videoUrl);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        borderRadius: '10px',
        overflow: 'hidden',
        border: `1px solid ${tokens.line}`,
        bgcolor: '#0b1220',
        aspectRatio: '16 / 9',
      }}
    >
      {media.kind === 'iframe' ? (
        <Box
          component="iframe"
          key={media.src}
          src={media.src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 0,
            display: 'block',
          }}
        />
      ) : media.kind === 'video' ? (
        <Box
          component="video"
          key={media.src}
          src={media.src}
          controls
          playsInline
          preload="metadata"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            bgcolor: '#000',
          }}
        />
      ) : (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.25,
            px: 2,
            background: `
              radial-gradient(circle at 30% 20%, rgba(24,90,165,0.28), transparent 45%),
              radial-gradient(circle at 80% 70%, rgba(192,0,0,0.18), transparent 40%),
              #0b1220
            `,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.22)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Box
              component="svg"
              viewBox="0 0 24 24"
              sx={{ width: 22, height: 22, ml: '2px', color: '#fff' }}
            >
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </Box>
          </Box>
          <Typography
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.72)',
              fontWeight: 500,
            }}
          >
            Module video
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            Video link not available for this module yet
          </Typography>
        </Box>
      )}
    </Box>
  );
}
