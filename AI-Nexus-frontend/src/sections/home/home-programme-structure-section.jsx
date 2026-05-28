import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';

import {
  hasProgrammeStructureContent,
  PROGRAMME_STRUCTURE_PHASE_ICON_DEFAULTS,
  resolveProgrammeStructureContent,
} from './programme-structure-defaults';

// ----------------------------------------------------------------------

const HEADER_CONTENT_PX = { xs: 2, sm: 2, md: 4, lg: 6 };

const RED = '#e63946';
const NAVY = '#0f2744';
const DESC_COLOR = '#6b7c8f';
const LINE_COLOR = '#c5cdd6';
const MID_DOT = '#b8c2cc';

const NODE_SIZE = { xs: 64, md: 72 };
const ICON_SIZE = { xs: 28, md: 32 };
const TRACK_H = { xs: 64, md: 72 };

function phaseIconColor(index) {
  return index % 2 === 0 ? RED : NAVY;
}

function isLikelyImagePath(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(s);
}

function resolvePhaseIcon(phase, index) {
  const custom = String(phase?.icon || '').trim();
  if (custom) return custom;
  return (
    PROGRAMME_STRUCTURE_PHASE_ICON_DEFAULTS[index % PROGRAMME_STRUCTURE_PHASE_ICON_DEFAULTS.length] ||
    'solar:star-bold'
  );
}

function JourneyHeading({ heading, underlineWord }) {
  const text = String(heading || '').trim() || 'Your AI Fluency Journey';
  const accent = String(underlineWord || 'Fluency').trim();
  const idx = accent ? text.indexOf(accent) : -1;

  if (idx < 0) {
    return (
      <Typography
        component={m.h2}
        variants={varFade({ distance: 16 }).inUp}
        sx={{
          m: 0,
          fontWeight: 700,
          fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
          lineHeight: 1.25,
          color: NAVY,
          letterSpacing: -0.3,
        }}
      >
        {text}
      </Typography>
    );
  }

  const before = text.slice(0, idx);
  const word = text.slice(idx, idx + accent.length);
  const after = text.slice(idx + accent.length);

  return (
    <Typography
      component={m.h2}
      variants={varFade({ distance: 16 }).inUp}
      sx={{
        m: 0,
        fontWeight: 700,
        fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
        lineHeight: 1.25,
        color: NAVY,
        letterSpacing: -0.3,
      }}
    >
      {before}
      <Box
        component="span"
        sx={{
          position: 'relative',
          display: 'inline-block',
          whiteSpace: 'nowrap',
        }}
      >
        {word}
        <Box
          component="span"
          aria-hidden
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: { xs: -4, md: -6 },
            width: '72%',
            minWidth: 28,
            height: { xs: 3, md: 4 },
            borderRadius: 999,
            bgcolor: RED,
          }}
        />
      </Box>
      {after}
    </Typography>
  );
}

function StepIconCircle({ index, icon, isActive }) {
  const color = phaseIconColor(index);
  const iconValue = String(icon || '').trim();
  const isImage = isLikelyImagePath(iconValue);

  return (
    <Box
      sx={{
        width: NODE_SIZE,
        height: NODE_SIZE,
        borderRadius: '50%',
        bgcolor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
        boxShadow: '0 10px 28px rgba(15, 39, 68, 0.1)',
        border: isActive ? `2px solid ${RED}` : '2px solid transparent',
      }}
    >
      {isImage ? (
        <Box
          component="img"
          src={iconValue}
          alt=""
          sx={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            objectFit: 'contain',
          }}
        />
      ) : (
        <Iconify icon={iconValue} width={ICON_SIZE} sx={{ color }} />
      )}
    </Box>
  );
}

function StepTextBlock({ phase, index }) {
  const title = String(phase?.title || '').trim();
  const descriptionHtml = String(phase?.description || '');
  const hasDescription = !isEffectivelyEmptyHtml(descriptionHtml);
  const stepNumber = index + 1;

  return (
    <Stack
      spacing={0.75}
      alignItems="center"
      sx={{
        textAlign: 'center',
        width: 1,
        maxWidth: { xs: 280, md: '100%' },
        px: { xs: 0.5, md: 0.75 },
        mx: 'auto',
        pt: { xs: 1.75, md: 2 },
      }}
    >
      <Typography
        component="span"
        sx={{
          color: NAVY,
          fontWeight: 700,
          fontSize: { xs: '0.95rem', md: '1rem' },
          lineHeight: 1,
        }}
      >
        {stepNumber}
      </Typography>
      {title ? (
        <Typography
          component="h3"
          sx={{
            m: 0,
            fontWeight: 700,
            color: NAVY,
            lineHeight: 1.3,
            fontSize: { xs: '0.9rem', md: '0.95rem' },
          }}
        >
          {title}
        </Typography>
      ) : null}
      {hasDescription ? (
        <RichTextContent
          html={descriptionHtml}
          sx={{
            typography: 'body2',
            color: DESC_COLOR,
            lineHeight: 1.5,
            fontSize: { xs: '0.75rem', md: '0.8125rem' },
            fontWeight: 400,
            maxWidth: 168,
            '& p': { m: 0, mb: 0.25, '&:last-child': { mb: 0 } },
            '& strong, & b': { fontWeight: 600, color: DESC_COLOR },
          }}
        />
      ) : null}
    </Stack>
  );
}

function DesktopTimeline({ phases }) {
  const count = phases.length;
  if (!count) return null;

  const lineInsetPct = (50 / count).toFixed(4);

  return (
    <Box sx={{ width: 1, position: 'relative', pt: 0.5 }}>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: { xs: 32, md: 36 },
          left: `${lineInsetPct}%`,
          right: `${lineInsetPct}%`,
          height: 0,
          borderTop: `2px dashed ${LINE_COLOR}`,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {Array.from({ length: count - 1 }).map((_, gapIndex) => (
        <Box
          key={`mid-${gapIndex}`}
          aria-hidden
          sx={{
            position: 'absolute',
            top: { xs: 32, md: 36 },
            left: `${(((gapIndex + 1) / count) * 100).toFixed(4)}%`,
            transform: 'translate(-50%, -50%)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: MID_DOT,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      ))}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
          columnGap: { xs: 0.5, md: 1 },
          alignItems: 'start',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {phases.map((phase, index) => (
          <Stack key={phase.id || `phase-${index}`} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 1,
                height: TRACK_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StepIconCircle
                index={index}
                icon={resolvePhaseIcon(phase, index)}
                isActive={index === 0}
              />
            </Box>
            <StepTextBlock phase={phase} index={index} />
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

function MobileTimeline({ phases }) {
  return (
    <Stack spacing={4} sx={{ width: 1, maxWidth: 360, mx: 'auto' }}>
      {phases.map((phase, index) => (
        <Stack key={phase.id || `phase-${index}`} spacing={0} alignItems="center">
          <StepIconCircle
            index={index}
            icon={resolvePhaseIcon(phase, index)}
            isActive={index === 0}
          />
          <StepTextBlock phase={phase} index={index} />
        </Stack>
      ))}
    </Stack>
  );
}

export function HomeProgrammeStructureSection() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [content, setContent] = useState(() => resolveProgrammeStructureContent(null));

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        setContent(resolveProgrammeStructureContent(settings?.homeProgrammeStructureContent));
      })
      .catch(() => {
        if (active) setContent(resolveProgrammeStructureContent(null));
      });
    return () => {
      active = false;
    };
  }, []);

  if (!hasProgrammeStructureContent(content)) return null;

  const phases = (content.phases || []).filter(
    (row) =>
      String(row?.title || '').trim() ||
      String(row?.label || '').trim() ||
      !isEffectivelyEmptyHtml(row?.description)
  );

  const eyebrow = String(content.eyebrow || '').trim();
  const heading = String(content.heading || '').trim();
  const headingUnderlineWord = String(content.headingUnderlineWord || 'Fluency').trim();

  if (!phases.length && !heading && !eyebrow) return null;

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        py: { xs: 6, md: 8 },
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef4fa 48%, #f8fafc 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(ellipse 70% 55% at 0% 0%, rgba(147, 197, 253, 0.14), transparent 68%),
            radial-gradient(ellipse 55% 45% at 100% 100%, rgba(147, 197, 253, 0.1), transparent 70%)
          `,
        },
      }}
    >
      <DashboardContent
        component={MotionViewport}
        disablePadding
        sx={{
          width: 1,
          maxWidth: '100%',
          px: HEADER_CONTENT_PX,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Stack spacing={{ xs: 4, md: 5 }} alignItems="center" sx={{ width: 1 }}>
          {(eyebrow || heading) && (
            <Stack
              spacing={eyebrow ? 1 : 0}
              alignItems="center"
              sx={{ textAlign: 'center', maxWidth: 720, px: 1 }}
            >
              {eyebrow ? (
                <Typography
                  component={m.p}
                  variants={varFade({ distance: 12 }).inUp}
                  sx={{
                    m: 0,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    fontSize: '0.7rem',
                    color: NAVY,
                    opacity: 0.72,
                  }}
                >
                  {eyebrow}
                </Typography>
              ) : null}
              {heading ? (
                <JourneyHeading heading={heading} underlineWord={headingUnderlineWord} />
              ) : null}
            </Stack>
          )}

          {phases.length > 0 ? (
            <Box component={m.div} variants={varFade({ distance: 20 }).inUp} sx={{ width: 1 }}>
              {isMobile ? (
                <MobileTimeline phases={phases} />
              ) : (
                <DesktopTimeline phases={phases} />
              )}
            </Box>
          ) : null}
        </Stack>
      </DashboardContent>
    </Box>
  );
}
