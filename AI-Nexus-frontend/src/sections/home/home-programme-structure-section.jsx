import { m, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

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

const HEADER_CONTENT_PX = { xs: 2, sm: 2, md: 4, lg: 6 };

const RED = '#e63946';
const NAVY = '#0f2744';
const DESC_COLOR = '#6b7c8f';
const LINE_COLOR = '#c5cdd6';

const NODE_SIZE = { xs: 64, md: 72 };
const ICON_SIZE = { xs: 28, md: 32 };
const TRACK_H = { xs: 96, md: 108 };
const TIMELINE_GRID_PT_PX = { xs: 20, md: 22 };
const TIMELINE_LINE_TOP = {
  xs: TIMELINE_GRID_PT_PX.xs + TRACK_H.xs / 2,
  md: TIMELINE_GRID_PT_PX.md + TRACK_H.md / 2,
};
const MOBILE_TRACK_H_PX = 70;
const MOBILE_LINE_TOP_PX = MOBILE_TRACK_H_PX / 2;
const STEP_ADVANCE_INTERVAL_MS = 1600;
const PROGRESS_TICK_MS = 60;

const STEP_ANIMATION = {
  hidden: { opacity: 0, y: 18 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.08 + index * 0.08,
    },
  }),
};

function phaseIconColor(index) {
  return index % 2 === 0 ? RED : NAVY;
}

function isLikelyImagePath(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(s);
}

function resolvePhaseIcon(phase) {
  const custom = String(phase?.icon || '').trim();
  if (custom) return custom;
  return 'solar:star-bold';
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

function StepIconCircle({ index, icon, isActive, isCompleted, primaryColor, compact = false }) {
  const color = phaseIconColor(index);
  const iconValue = String(icon || '').trim();
  const isImage = isLikelyImagePath(iconValue);
  const gradientBorder = `linear-gradient(135deg, ${primaryColor || RED}, #7c3aed)`;
  const iconColor = isCompleted || isActive ? primaryColor || RED : color;

  return (
    <Box
      component={m.div}
      animate={
        isActive
          ? {
              y: [0, -3, 0],
            }
          : { y: 0 }
      }
      transition={
        isActive
          ? { duration: 2.4, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' }
          : { duration: 0.25 }
      }
      sx={{
        width: compact ? { xs: 50, md: 56 } : NODE_SIZE,
        height: compact ? { xs: 50, md: 56 } : NODE_SIZE,
        borderRadius: 3,
        background: isActive
          ? `linear-gradient(#ffffff, #ffffff) padding-box, ${gradientBorder} border-box`
          : '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
        border: isActive ? '2px solid transparent' : '1px solid rgba(15, 39, 68, 0.1)',
        boxShadow: isActive
          ? `0 0 0 1px rgba(124, 58, 237, 0.16), 0 12px 34px rgba(124, 58, 237, 0.18)`
          : '0 10px 28px rgba(15, 39, 68, 0.1)',
        transition: 'all 0.3s ease',
        '&::after': isActive
          ? {
              content: '""',
              position: 'absolute',
              inset: -10,
              borderRadius: 4,
              background: `radial-gradient(circle at 50% 50%, ${primaryColor || RED}33, transparent 72%)`,
              zIndex: -1,
            }
          : undefined,
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
        <Iconify icon={iconValue} width={ICON_SIZE} sx={{ color: iconColor }} />
      )}

      {isCompleted ? (
        <Box
          component={m.span}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          sx={{
            position: 'absolute',
            right: -6,
            top: -6,
            width: 22,
            height: 22,
            borderRadius: '50%',
            bgcolor: '#ecfdf3',
            color: '#16a34a',
            border: '1px solid rgba(22, 163, 74, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Iconify icon="solar:verified-check-bold" width={14} />
        </Box>
      ) : null}
    </Box>
  );
}

function StepTextBlock({ phase, index, isActive, isCompleted, compact = false, hideDescription = false }) {
  const title = String(phase?.title || '').trim();
  const descriptionHtml = String(phase?.description || '');
  const hasDescription = !isEffectivelyEmptyHtml(descriptionHtml);
  const stepNumber = index + 1;

  return (
    <Stack
      component={m.div}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      spacing={compact ? 0.4 : 0.75}
      alignItems="center"
      sx={{
        textAlign: 'center',
        width: 1,
        maxWidth: compact ? { xs: 74, md: 90 } : { xs: 280, md: 210 },
        px: compact ? { xs: 0.25, md: 0.5 } : { xs: 0.5, md: 0.75 },
        mx: 'auto',
        pt: compact ? { xs: 0.65, md: 0.75 } : { xs: 1.6, md: 1.8 },
        pb: compact ? { xs: 0, md: 0.1 } : { xs: 0.2, md: 0.4 },
        minHeight: compact ? 0 : { xs: 150, md: 168 },
        justifyContent: 'flex-start',
      }}
    >
      {title ? (
        <Typography
          component="h3"
          sx={{
            m: 0,
            fontWeight: compact ? 500 : 700,
            color: compact && isActive ? '#1a2d4f' : NAVY,
            lineHeight: compact ? 1.15 : 1.3,
            fontSize: compact ? { xs: '0.72rem', md: '0.76rem' } : { xs: '0.92rem', md: '0.98rem' },
            letterSpacing: compact ? 0.1 : 0,
            display: compact ? '-webkit-box' : 'block',
            WebkitLineClamp: compact ? 3 : 'unset',
            WebkitBoxOrient: compact ? 'vertical' : 'unset',
            overflow: compact ? 'hidden' : 'visible',
            minHeight: compact ? '3.45em' : 'auto',
            textWrap: compact ? 'balance' : 'wrap',
          }}
        >
          {title}
        </Typography>
      ) : null}
      {hasDescription && !hideDescription ? (
        <RichTextContent
          html={descriptionHtml}
          sx={{
            typography: 'body2',
            color: DESC_COLOR,
            lineHeight: 1.5,
            fontSize: compact ? { xs: '0.7rem', md: '0.74rem' } : { xs: '0.76rem', md: '0.8125rem' },
            fontWeight: 400,
            maxWidth: 176,
            '& p': { m: 0, mb: 0.25, '&:last-child': { mb: 0 } },
            '& strong, & b': { fontWeight: 600, color: DESC_COLOR },
          }}
        />
      ) : null}
    </Stack>
  );
}

function DesktopTimeline({ phases, primaryColor }) {
  const count = phases.length;
  if (!count) return null;

  const timelineRef = useRef(null);
  const isInView = useInView(timelineRef, { amount: 0.85, margin: '0px 0px -15% 0px' });
  const lineInsetPct = (50 / count).toFixed(4);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeStepProgress, setActiveStepProgress] = useState(0);
  const cycleDurationSeconds = Math.max((count * STEP_ADVANCE_INTERVAL_MS) / 1000, 1.6);
  const totalProgress = (activeStepIndex + activeStepProgress) / count;
  const progressPercentage = Math.max(0, Math.min(100, Math.round(totalProgress * 100)));

  useEffect(() => {
    if (!isInView) {
      setActiveStepIndex(0);
      setActiveStepProgress(0);
      return undefined;
    }

    let currentIndex = 0;
    let stepStartAt = Date.now();
    setActiveStepIndex(0);
    setActiveStepProgress(0);

    const timer = setInterval(() => {
      const elapsed = Date.now() - stepStartAt;
      const progress = Math.min(elapsed / STEP_ADVANCE_INTERVAL_MS, 1);
      setActiveStepProgress(progress);

      if (progress >= 1) {
        currentIndex = (currentIndex + 1) % count;
        setActiveStepIndex(currentIndex);
        setActiveStepProgress(0);
        stepStartAt = Date.now();
      }
    }, PROGRESS_TICK_MS);

    return () => {
      clearInterval(timer);
    };
  }, [count, isInView]);

  return (
    <Box
      ref={timelineRef}
      sx={{
        width: 1,
        position: 'relative',
        pt: 0,
        pb: { xs: 1, md: 1.4 },
        borderRadius: 4,
        background:
          'linear-gradient(165deg, rgba(255,255,255,0.78), rgba(255,255,255,0.48) 55%, rgba(243,246,255,0.72))',
        border: '1px solid rgba(15,39,68,0.08)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 18px 45px rgba(15, 39, 68, 0.09)',
        overflow: 'hidden',
      }}
    >
      <Box
        aria-hidden
        component={m.div}
        animate={{ x: ['-20%', '120%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '40%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <Typography
        component={m.p}
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        sx={{
          position: 'absolute',
          top: { xs: 12, md: 14 },
          right: { xs: 12, md: 16 },
          zIndex: 5,
          m: 0,
          px: 1.1,
          py: 0.45,
          borderRadius: 999,
          fontSize: '0.72rem',
          fontWeight: 700,
          color: NAVY,
          bgcolor: 'rgba(255,255,255,0.82)',
          border: '1px solid rgba(15,39,68,0.1)',
        }}
      >
        Journey Progress {progressPercentage}%
      </Typography>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: TIMELINE_LINE_TOP,
          left: `${lineInsetPct}%`,
          right: `${lineInsetPct}%`,
          height: 0,
          borderTop: `2px dashed ${LINE_COLOR}`,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: isInView ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />

      <Box
        aria-hidden
        component={m.div}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={isInView ? { scaleX: totalProgress, opacity: 1 } : { scaleX: 0, opacity: 0 }}
        transition={{ duration: PROGRESS_TICK_MS / 1000, ease: 'linear' }}
        sx={{
          position: 'absolute',
          top: TIMELINE_LINE_TOP,
          left: `${lineInsetPct}%`,
          right: `${lineInsetPct}%`,
          height: 0,
          borderTop: `3px solid ${RED}`,
          zIndex: 1,
          pointerEvents: 'none',
          transformOrigin: 'left center',
          filter: 'drop-shadow(0 0 6px rgba(230, 57, 70, 0.4))',
        }}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
          columnGap: { xs: 1.1, md: 1.35 },
          alignItems: 'start',
          position: 'relative',
          zIndex: 2,
          pt: { xs: `${TIMELINE_GRID_PT_PX.xs}px`, md: `${TIMELINE_GRID_PT_PX.md}px` },
          pb: { xs: 1.4, md: 1.8 },
          px: { xs: 1, md: 1.4 },
        }}
      >
        {phases.map((phase, index) => (
          <Stack
            key={phase.id || `phase-${index}`}
            component={m.div}
            custom={index}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            variants={STEP_ANIMATION}
            alignItems="center"
            sx={{
              minWidth: 0,
              height: 1,
            }}
          >
            <Box
              sx={{
                width: 1,
                height: TRACK_H,
                display: 'flex',
                position: 'relative',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StepIconCircle
                index={index}
                icon={resolvePhaseIcon(phase, index)}
                isActive={index === activeStepIndex}
                isCompleted={index < activeStepIndex}
                primaryColor={primaryColor}
              />
            </Box>
            <StepTextBlock
              phase={phase}
              index={index}
              isActive={index === activeStepIndex}
              isCompleted={index < activeStepIndex}
            />
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

function MobileTimeline({ phases, primaryColor }) {
  const count = phases.length;
  if (!count) return null;

  const timelineRef = useRef(null);
  const isInView = useInView(timelineRef, { amount: 0.6, margin: '0px 0px -10% 0px' });
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeStepProgress, setActiveStepProgress] = useState(0);

  useEffect(() => {
    if (!isInView) {
      setActiveStepIndex(0);
      setActiveStepProgress(0);
      return undefined;
    }

    let currentIndex = 0;
    let stepStartAt = Date.now();
    setActiveStepIndex(0);
    setActiveStepProgress(0);
    const timer = setInterval(() => {
      const elapsed = Date.now() - stepStartAt;
      const progress = Math.min(elapsed / STEP_ADVANCE_INTERVAL_MS, 1);
      setActiveStepProgress(progress);
      if (progress >= 1) {
        currentIndex = (currentIndex + 1) % count;
        setActiveStepIndex(currentIndex);
        setActiveStepProgress(0);
        stepStartAt = Date.now();
      }
    }, PROGRESS_TICK_MS);

    return () => {
      clearInterval(timer);
    };
  }, [count, isInView]);

  const lineInsetPct = (50 / count).toFixed(4);
  const totalProgress = (activeStepIndex + activeStepProgress) / count;

  return (
    <Box ref={timelineRef} sx={{ width: 1, maxWidth: 560, mx: 'auto', position: 'relative', pt: 0.5 }}>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: MOBILE_LINE_TOP_PX,
          left: `${lineInsetPct}%`,
          right: `${lineInsetPct}%`,
          height: 0,
          borderTop: `2px dashed ${LINE_COLOR}`,
          opacity: isInView ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <Box
        aria-hidden
        component={m.div}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={isInView ? { scaleX: totalProgress, opacity: 1 } : { scaleX: 0, opacity: 0 }}
        transition={{ duration: PROGRESS_TICK_MS / 1000, ease: 'linear' }}
        sx={{
          position: 'absolute',
          top: MOBILE_LINE_TOP_PX,
          left: `${lineInsetPct}%`,
          right: `${lineInsetPct}%`,
          height: 0,
          borderTop: `3px solid ${RED}`,
          filter: 'drop-shadow(0 0 6px rgba(230, 57, 70, 0.3))',
          transformOrigin: 'left center',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
          columnGap: 0.45,
          alignItems: 'start',
          position: 'relative',
          zIndex: 2,
          px: 0.25,
        }}
      >
        {phases.map((phase, index) => (
          <Stack
            key={phase.id || `phase-${index}`}
            component={m.div}
            custom={index}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={STEP_ANIMATION}
            spacing={0}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            <Box
              sx={{
                width: 1,
                height: MOBILE_TRACK_H_PX,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StepIconCircle
                index={index}
                icon={resolvePhaseIcon(phase, index)}
                isActive={index === activeStepIndex}
                isCompleted={index < activeStepIndex}
                primaryColor={primaryColor}
                compact
              />
            </Box>
            <StepTextBlock
              phase={phase}
              index={index}
              isActive={index === activeStepIndex}
              isCompleted={index < activeStepIndex}
              compact
              hideDescription
            />
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

export function HomeProgrammeStructureSection() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [content, setContent] = useState(null);
  const primaryColor = theme.palette.primary.main;

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        const sectionContent = settings?.homeProgrammeStructureContent;
        if (hasProgrammeStructureContent(sectionContent)) {
          setContent(resolveProgrammeStructureContent(sectionContent));
        } else {
          setContent(null);
        }
      })
      .catch(() => {
        if (active) setContent(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!content || !hasProgrammeStructureContent(content)) return null;

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
                <MobileTimeline phases={phases} primaryColor={primaryColor} />
              ) : (
                <DesktopTimeline
                  phases={phases}
                  primaryColor={primaryColor}
                />
              )}
            </Box>
          ) : null}
        </Stack>
      </DashboardContent>
    </Box>
  );
}
