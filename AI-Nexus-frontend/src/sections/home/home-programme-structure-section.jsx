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
  resolveProgrammeStructureContent,
} from './programme-structure-defaults';

// ----------------------------------------------------------------------

/** Same horizontal inset as header logo ↔ Sign In (header-base.jsx container). */
const HEADER_CONTENT_PX = { xs: 0, sm: 2, md: 4, lg: 6 };

/** Reference mockup: pale blue → purple → soft gold connector */
const TIMELINE_LINE =
  'linear-gradient(90deg, #93c5fd 0%, #c4b5fd 38%, #e9d5ff 58%, #fde68a 100%)';

/** Reference: purple/blue top-left → gold bottom-right */
const NODE_GRADIENT =
  'linear-gradient(145deg, #4338ca 0%, #6d28d9 32%, #9333ea 52%, #eab308 100%)';

const EYEBROW_GRADIENT =
  'linear-gradient(90deg, #2563eb 0%, #7c3aed 48%, #eab308 100%)';

const PHASE_LABEL = '#e63946';
const TITLE_COLOR = '#0f2744';
const DESC_COLOR = '#5b6b7c';

const NODE_PX = { xs: 52, md: 64 };
const TRACK_H = { xs: 52, md: 64 };
const LINE_TOP = { xs: 26, md: 32 };

function PhaseNode({ index }) {
  return (
    <Box
      sx={{
        width: NODE_PX,
        height: NODE_PX,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: NODE_GRADIENT,
        boxShadow: '0 4px 16px rgba(79, 70, 229, 0.22)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
      }}
    >
      <Typography
        component="span"
        sx={{
          color: '#ffffff',
          fontWeight: 700,
          fontSize: { xs: '1.2rem', md: '1.35rem' },
          lineHeight: 1,
        }}
      >
        {index + 1}
      </Typography>
    </Box>
  );
}

function PhaseTextBlock({ phase, index, showTrophy }) {
  const label = String(phase?.label || '').trim() || `Phase ${index + 1}`;
  const title = String(phase?.title || '').trim();
  const descriptionHtml = String(phase?.description || '');
  const hasDescription = !isEffectivelyEmptyHtml(descriptionHtml);

  return (
    <Stack
      spacing={0.5}
      alignItems="center"
      sx={{
        textAlign: 'center',
        width: 1,
        maxWidth: { xs: 260, md: '100%' },
        px: { md: 0.5 },
        mx: 'auto',
        pt: { xs: 2.5, md: 3 },
      }}
    >
      <Typography
        component="span"
        sx={{
          color: PHASE_LABEL,
          fontWeight: 700,
          fontSize: { xs: '0.7rem', md: '0.75rem' },
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      {title ? (
        <Typography
          component="h3"
          sx={{
            m: 0,
            fontWeight: 700,
            color: TITLE_COLOR,
            lineHeight: 1.35,
            fontSize: { xs: '0.9rem', md: '0.9375rem' },
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
            lineHeight: 1.55,
            fontSize: { xs: '0.75rem', md: '0.8125rem' },
            fontWeight: 400,
            '& p': { m: 0, mb: 0.25, '&:last-child': { mb: 0 } },
            '& strong, & b': { fontWeight: 600, color: DESC_COLOR },
          }}
        />
      ) : null}
      {showTrophy ? (
        <Box sx={{ pt: 0.75, color: '#eab308', lineHeight: 0 }}>
          <Iconify icon="solar:cup-star-bold" width={18} />
        </Box>
      ) : null}
    </Stack>
  );
}

function DesktopTimeline({ phases }) {
  const count = phases.length;
  if (!count) return null;

  const lineInset = `${(50 / count).toFixed(2)}%`;

  return (
    <Box
      sx={{
        width: 1,
        position: 'relative',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: LINE_TOP,
          left: lineInset,
          right: lineInset,
          height: 2,
          transform: 'translateY(-50%)',
          borderRadius: 999,
          background: TIMELINE_LINE,
          zIndex: 0,
        }}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
          columnGap: { xs: 0.5, md: 1, lg: 1.5 },
          alignItems: 'start',
          position: 'relative',
          zIndex: 1,
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
              <PhaseNode index={index} />
            </Box>
            <PhaseTextBlock
              phase={phase}
              index={index}
              showTrophy={index === count - 1}
            />
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

function MobileTimeline({ phases }) {
  return (
    <Stack spacing={3.5} sx={{ width: 1, maxWidth: 340, mx: 'auto' }}>
      {phases.map((phase, index) => (
        <Stack key={phase.id || `phase-${index}`} spacing={1.5} alignItems="center">
          <PhaseNode index={index} />
          <PhaseTextBlock
            phase={phase}
            index={index}
            showTrophy={index === phases.length - 1}
          />
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
  if (
    !phases.length &&
    !String(content.heading || '').trim() &&
    !String(content.eyebrow || '').trim()
  ) {
    return null;
  }

  const eyebrow = String(content.eyebrow || '').trim();
  const heading = String(content.heading || '').trim();

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 5, md: 7 },
        bgcolor: 'grey.200',
        overflow: 'hidden',
      }}
    >
      <DashboardContent
        component={MotionViewport}
        disablePadding
        sx={{
          width: 1,
          maxWidth: '100%',
          px: HEADER_CONTENT_PX,
        }}
      >
        <Stack spacing={{ xs: 3.5, md: 4.5 }} alignItems="center" sx={{ width: 1 }}>
          {(eyebrow || heading) && (
            <Stack
              spacing={1}
              alignItems="center"
              sx={{ textAlign: 'center', maxWidth: 760, px: 1 }}
            >
              {eyebrow ? (
                <Typography
                  component="p"
                  variants={varFade({ distance: 12 }).inUp}
                  sx={{
                    m: 0,
                    fontWeight: 800,
                    letterSpacing: { xs: 1.5, md: 2 },
                    textTransform: 'uppercase',
                    fontSize: { xs: '0.65rem', md: '0.72rem' },
                    background: EYEBROW_GRADIENT,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {eyebrow}
                </Typography>
              ) : null}
              {heading ? (
                <Typography
                  component="h2"
                  variants={varFade({ distance: 16 }).inUp}
                  sx={{
                    m: 0,
                    fontWeight: 700,
                    fontSize: { xs: '1.6rem', sm: '1.9rem', md: '2.15rem' },
                    lineHeight: 1.2,
                    color: TITLE_COLOR,
                    letterSpacing: -0.3,
                  }}
                >
                  {heading}
                </Typography>
              ) : null}
            </Stack>
          )}

          {phases.length > 0 ? (
            <Box variants={varFade({ distance: 20 }).inUp} sx={{ width: 1 }}>
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
