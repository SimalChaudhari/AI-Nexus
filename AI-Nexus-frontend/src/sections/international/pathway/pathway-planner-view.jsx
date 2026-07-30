import { useMemo, useState } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { getStoredIntlRegion } from '../intl-region';
import { MODULES } from './pathway-modules';
import { ROLES } from './pathway-roles';
import {
  DEFAULT_FOUNDATION_NOTE,
  FOUNDATION,
  TARGET,
  TIER,
  autoSelect,
  fmtMinutes,
  roleEntries,
  roleFoundation,
} from './pathway-constants';
import { DashboardContent } from 'src/layouts/dashboard';
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
  paper: '#f4f6fa',
  card: '#ffffff',
  line: '#d8dee8',
  pine: NAVY,
  pineDeep: NAVY_DEEP,
  accent: RED,
  green: GREEN,
  greenLight: GREEN_LIGHT,
  gold: '#a45a12',
  sky: '#eef2f8',
  shadow: '0 1px 2px rgba(0,32,96,.06), 0 8px 24px rgba(0,32,96,.08)',
};

const FSET = new Set(FOUNDATION);
const MODULES_BY_CODE = Object.fromEntries(MODULES.map((m) => [m.code, m]));

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

export function PathwayPlannerView() {
  const region = getStoredIntlRegion();
  const [roleIdx, setRoleIdx] = useState(0);
  const [selected, setSelected] = useState(() => autoSelect(ROLES[0], MODULES_BY_CODE, FSET));
  const [lockedSet, setLockedSet] = useState(() => new Set(roleFoundation(ROLES[0])));
  const [openCodes, setOpenCodes] = useState(() => new Set());
  const [topicsOpen, setTopicsOpen] = useState(() => new Set());

  const totalMinutes = useMemo(
    () => [...selected].reduce((t, c) => t + (MODULES_BY_CODE[c]?.minutes || 0), 0),
    [selected]
  );

  if (!region) {
    return <Navigate to={paths.international} replace />;
  }

  const pickRole = (i) => {
    const role = ROLES[i];
    setRoleIdx(i);
    setLockedSet(new Set(roleFoundation(role)));
    setSelected(autoSelect(role, MODULES_BY_CODE, FSET));
    setOpenCodes(new Set());
    setTopicsOpen(new Set());
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

  const toggleTopics = (code) => {
    setTopicsOpen((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const resetPath = () => {
    if (roleIdx === null) return;
    setSelected(autoSelect(ROLES[roleIdx], MODULES_BY_CODE, FSET));
    setOpenCodes(new Set());
    setTopicsOpen(new Set());
  };

  return (
    <Box sx={{ bgcolor: tokens.paper, color: tokens.ink, minHeight: '100%', pb: 10 }}>
      <DashboardContent sx={{ ...HOME_DASHBOARD_CONTENT_SX, pt: { xs: 4, md: 5 }, pb: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Button
            component={RouterLink}
            to={paths.international}
            sx={{
              textTransform: 'none',
              color: tokens.inkSoft,
              px: 0,
              minWidth: 0,
              '&:hover': { bgcolor: 'transparent', color: tokens.pine },
            }}
          >
            ← Back to catalog
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
            ISCA AI Fluency Series · Pathway Planner · {region.label}
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

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
            gap: { xs: 3, md: 4.75 },
            mt: 4,
            alignItems: 'start',
          }}
        >
          <Box
            sx={{
              position: { md: 'sticky' },
              top: { md: 20 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2.75,
            }}
          >
            <Box>
              <PanelLabel>Select your role</PanelLabel>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.875 }}>
                {ROLES.map((role, i) => (
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
                role={ROLES[roleIdx]}
                selected={selected}
                lockedSet={lockedSet}
                openCodes={openCodes}
                topicsOpen={topicsOpen}
                onToggle={toggleModule}
                onToggleOpen={toggleOpen}
                onToggleTopics={toggleTopics}
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
            28 modules · 3 pillars · ~30 hours total runtime.
          </Box>{' '}
          Recommendations are curated from each module&apos;s content and runtime against the demands of
          your role. Tiers: <strong>Essential</strong> is core to your work ·{' '}
          <strong>Recommended</strong> strengthens it · <strong>Optional</strong> extends it. Toggle any
          module to reshape your plan.
        </Typography>
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
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

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
          Target · 10h 00m
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
        {h}
        <Box component="span" sx={{ fontSize: 15, color: tokens.inkFaint, ml: 0.375 }}>
          h
        </Box>{' '}
        {String(m).padStart(2, '0')}
        <Box component="span" sx={{ fontSize: 15, color: tokens.inkFaint, ml: 0.375 }}>
          m
        </Box>
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

function RolePlan({ role, selected, lockedSet, openCodes, topicsOpen, onToggle, onToggleOpen, onToggleTopics }) {
  const req = roleFoundation(role);
  const byTier = { 3: [], 2: [], 1: [] };
  roleEntries(role, FSET).forEach(([c, v]) => byTier[v].push(c));
  Object.values(byTier).forEach((a) => a.sort());
  const reqMin = req.reduce((t, c) => t + MODULES_BY_CODE[c].minutes, 0);
  const note = role.reqNote || DEFAULT_FOUNDATION_NOTE;

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
            topicsOpen={topicsOpen.has(code)}
            onToggle={onToggle}
            onToggleOpen={onToggleOpen}
            onToggleTopics={onToggleTopics}
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
            countLabel={`${codes.length} module${codes.length > 1 ? 's' : ''}`}
          >
            {codes.map((code) => (
              <ModuleCard
                key={code}
                code={code}
                locked={false}
                selected={selected.has(code)}
                open={openCodes.has(code)}
                topicsOpen={topicsOpen.has(code)}
                onToggle={onToggle}
                onToggleOpen={onToggleOpen}
                onToggleTopics={onToggleTopics}
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
  topicsOpen,
  onToggle,
  onToggleOpen,
  onToggleTopics,
}) {
  const m = MODULES_BY_CODE[code];
  const shown = m.bullets.slice(0, 6);
  const rest = m.bullets.slice(6);
  const pillarColors = {
    1: { color: '#1d4ed8', bg: '#e7edfc', border: '#c7d6f7' },
    2: { color: '#b91c1c', bg: '#fbe7e7', border: '#f3c9c9' },
    3: { color: '#15803d', bg: '#e4f3ea', border: '#c3e5cf' },
  };
  const pillar = pillarColors[+m.pillar];

  return (
    <Box
      sx={{
        bgcolor: locked ? '#f2f5fa' : tokens.card,
        border: `1px solid ${selected ? tokens.pine : tokens.line}`,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: selected ? tokens.shadow : 'none',
        transition: '.16s ease',
      }}
    >
      <Box
        onClick={() => onToggle(code)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.75,
          px: 2,
          py: 1.75,
          cursor: locked ? 'default' : 'pointer',
        }}
      >
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
            {locked && (
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
          {fmtMinutes(m.minutes)}
          <Typography
            component="small"
            sx={{
              display: 'block',
              fontSize: 10,
              color: tokens.inkFaint,
              fontWeight: 400,
              letterSpacing: '0.04em',
            }}
          >
            {m.minutes} MIN
          </Typography>
        </Box>

        <Box
          component="button"
          type="button"
          aria-label="Show contents"
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
        <Box sx={{ px: 2, pt: 1.5, pb: 2, pl: 6.5 }}>
          <Typography
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: tokens.inkFaint,
              mb: 1,
            }}
          >
            What you&apos;ll cover
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {shown.map((b) => (
              <TopicItem key={b}>{b}</TopicItem>
            ))}
            {topicsOpen &&
              rest.map((b) => (
                <TopicItem key={b}>{b}</TopicItem>
              ))}
          </Box>
          {rest.length > 0 && (
            <Button
              onClick={() => onToggleTopics(code)}
              sx={{
                mt: 1,
                pl: 2,
                textTransform: 'none',
                fontSize: 12.5,
                color: tokens.pine,
                fontWeight: 500,
                justifyContent: 'flex-start',
                minWidth: 0,
                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
              }}
            >
              {topicsOpen
                ? 'Show fewer topics'
                : `+ ${rest.length} more topic${rest.length > 1 ? 's' : ''} in this module`}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function TopicItem({ children }) {
  return (
    <Box
      component="li"
      sx={{
        fontSize: 13.5,
        color: tokens.inkSoft,
        pl: 2,
        position: 'relative',
        lineHeight: 1.45,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 2,
          top: 8,
          width: 5,
          height: 5,
          borderRadius: '1px',
          bgcolor: tokens.pine,
          opacity: 0.6,
        },
      }}
    >
      {children}
    </Box>
  );
}
