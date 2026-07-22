import { useEffect, useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { courseService } from 'src/services/course.service';
import {
  formatPillarLabel,
  resolvePillarIndexFromCourse,
} from 'src/sections/learning/components/credential-shared';
import { formatSecondsToClock } from 'src/sections/learning/utils/video-coverage';

// ----------------------------------------------------------------------

const PILLAR_ACCENT = {
  1: { color: 'info', icon: 'solar:book-bold' },
  2: { color: 'warning', icon: 'solar:widget-5-bold' },
  3: { color: 'error', icon: 'solar:crown-bold' },
};

function formatWatch(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return '0:00';
  return formatSecondsToClock(n);
}

function sectionStatus(sp) {
  if (!sp) return { label: 'Not started', color: 'default' };
  if (sp.isCompleted || sp.isWatched) return { label: 'Completed', color: 'success' };
  const pct = Number(sp.completionPercent ?? sp.currentProgress ?? 0);
  if (pct > 0 || Number(sp.watchedSeconds) > 0) return { label: 'In progress', color: 'warning' };
  if (sp.isViewed) return { label: 'Viewed', color: 'info' };
  return { label: 'Not started', color: 'default' };
}

function ScopeChip({ label, done, count }) {
  if (!count) return null;
  return (
    <Chip
      size="small"
      variant="soft"
      color={done ? 'success' : 'warning'}
      label={`${label}: ${done ? 'Pass' : 'Pending'}`}
      sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
    />
  );
}

function MetaStat({ label, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
        {value}
      </Typography>
    </Box>
  );
}

function SectionRow({ section, isCurrent }) {
  const sp = section?.sectionProgress || null;
  const status = sectionStatus(sp);
  const hasVideo = Boolean(String(section?.videoUrl || '').trim());
  const watched = Number(sp?.watchedSeconds ?? 0);
  const remaining = Number(sp?.remainingSeconds ?? 0);
  const pct = Math.max(0, Math.min(100, Number(sp?.completionPercent ?? sp?.currentProgress ?? 0)));
  const durationRaw = Number(section?.durationTime ?? section?.watchtime ?? 0);
  const durationLabel = hasVideo && durationRaw > 0 ? formatWatch(durationRaw) : null;

  return (
    <Box
      sx={{
        py: 1.25,
        px: 1.5,
        borderRadius: 1,
        bgcolor: (t) => (isCurrent ? alpha(t.palette.info.main, 0.06) : 'transparent'),
        border: (t) =>
          `1px solid ${isCurrent ? alpha(t.palette.info.main, 0.28) : t.palette.divider}`,
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
          <Iconify
            icon={
              status.color === 'success'
                ? 'solar:check-circle-bold'
                : hasVideo
                  ? 'solar:play-circle-bold'
                  : 'solar:document-text-bold'
            }
            width={18}
            sx={{ mt: 0.2, color: status.color === 'success' ? 'success.main' : 'text.secondary' }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
              {section?.title || 'Lesson'}
            </Typography>
            {section?.subtitle ? (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {section.subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        <Chip
          size="small"
          label={status.label}
          color={status.color}
          variant="soft"
          sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}
        />
      </Stack>

      {hasVideo ? (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ height: 5, borderRadius: 1, mb: 0.75 }}
          />
          <Stack direction="row" flexWrap="wrap" gap={2}>
            <MetaStat label="Watched" value={formatWatch(watched)} />
            <MetaStat label="Remaining" value={formatWatch(remaining)} />
            <MetaStat label="Complete" value={`${Math.round(pct)}%`} />
            {durationLabel ? <MetaStat label="Duration" value={durationLabel} /> : null}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
}

function ModuleBlock({ module, quizScope, currentSectionId, showModuleQuizAssessment }) {
  const [open, setOpen] = useState(true);
  const sections = Array.isArray(module?.sections) ? module.sections : [];
  const completedCount = sections.filter((s) => {
    const sp = s?.sectionProgress;
    return sp?.isCompleted || sp?.isWatched;
  }).length;

  return (
    <Box
      sx={{
        border: (t) => `1px solid ${t.palette.divider}`,
        borderRadius: 1.5,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        onClick={() => setOpen((v) => !v)}
        sx={{
          px: 1.5,
          py: 1.1,
          cursor: 'pointer',
          bgcolor: (t) => alpha(t.palette.grey[500], 0.06),
          '&:hover': { bgcolor: (t) => alpha(t.palette.grey[500], 0.1) },
        }}
      >
        <IconButton size="small" sx={{ p: 0.25 }}>
          <Iconify icon={open ? 'eva:arrow-ios-downward-fill' : 'eva:arrow-ios-forward-fill'} width={16} />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {module?.title || 'Module'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {completedCount}/{sections.length} sections complete
          </Typography>
        </Box>
        {showModuleQuizAssessment ? (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <ScopeChip label="Quiz" done={quizScope?.quizCompleted} count={quizScope?.quizCount} />
            <ScopeChip
              label="Assessment"
              done={quizScope?.assignmentCompleted}
              count={quizScope?.assignmentCount}
            />
          </Stack>
        ) : null}
      </Stack>

      <Collapse in={open}>
        <Stack spacing={1} sx={{ p: 1.25 }}>
          {sections.length === 0 ? (
            <Typography variant="caption" sx={{ color: 'text.secondary', px: 0.5 }}>
              No sections in this module.
            </Typography>
          ) : (
            sections.map((section) => (
              <SectionRow
                key={section.id}
                section={section}
                isCurrent={String(currentSectionId || '') === String(section.id)}
              />
            ))
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}

function CourseTrackingCard({ entry, theme }) {
  const [open, setOpen] = useState(true);
  const course = entry?.course || {};
  const progress = entry?.progress || {};
  const modules = Array.isArray(entry?.modules) ? entry.modules : [];
  const scopes = Array.isArray(entry?.quizAssessment?.scopes) ? entry.quizAssessment.scopes : [];
  const courseLevel = String(course.level || '').toLowerCase();
  // Pillar 1/3: hide module quiz/assessment chips (course-end only).
  const isCourseEndModel = courseLevel === 'beginner' || courseLevel === 'advanced';
  const showModuleQuizAssessment = !isCourseEndModel;
  const pillarIndex = resolvePillarIndexFromCourse(course) || 0;
  const accent = PILLAR_ACCENT[pillarIndex] || PILLAR_ACCENT[1];
  const pct = Math.max(0, Math.min(100, Number(progress.completionPercent ?? 0)));
  const courseEndScope = scopes.find((s) => s.moduleId == null);
  const scopeByModuleId = useMemo(() => {
    const map = {};
    scopes.forEach((s) => {
      if (s.moduleId) map[String(s.moduleId)] = s;
    });
    return map;
  }, [scopes]);

  const watchedSeconds = useMemo(() => {
    let total = 0;
    modules.forEach((mod) => {
      (mod.sections || []).forEach((sec) => {
        if (!String(sec?.videoUrl || '').trim()) return;
        const w = Number(sec?.sectionProgress?.watchedSeconds ?? 0);
        if (Number.isFinite(w)) total += Math.max(0, w);
      });
    });
    return total;
  }, [modules]);

  const quizAssessmentLabel = (() => {
    if (progress.quizAssessmentRequired === false) return 'None';
    const relevant = scopes.filter((s) => s.quizCount > 0 || s.assignmentCount > 0);
    if (!relevant.length) return 'None';
    if (progress.quizAssessmentCompleted) return 'Pass';
    return 'Pending';
  })();

  return (
    <Card
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        border: (t) => `1px solid ${t.palette.divider}`,
        boxShadow: 'none',
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        spacing={1.25}
        onClick={() => setOpen((v) => !v)}
        sx={{ cursor: 'pointer', mb: open ? 1.5 : 0 }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1,
            bgcolor: alpha(theme.palette[accent.color].main, 0.12),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Iconify icon={accent.icon} width={18} sx={{ color: `${accent.color}.main` }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap>
            {pillarIndex ? (
              <Chip
                size="small"
                color={accent.color}
                variant="soft"
                label={formatPillarLabel(pillarIndex)}
                sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem' }}
              />
            ) : null}
            <Chip
              size="small"
              color={progress.isCompleted ? 'success' : 'warning'}
              variant="soft"
              label={progress.isCompleted ? 'Completed' : 'In progress'}
              sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem' }}
            />
            {progress.hasEarnedCredential ? (
              <Chip
                size="small"
                color="warning"
                variant="soft"
                label="Certificate"
                sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem' }}
              />
            ) : null}
          </Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5, lineHeight: 1.3 }}>
            {course.title || 'Untitled course'}
          </Typography>
          {course.programTitle ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {course.programTitle}
            </Typography>
          ) : null}
        </Box>

        <Stack alignItems="flex-end" spacing={0.25} sx={{ flexShrink: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {Math.round(pct)}%
          </Typography>
          <Iconify
            icon={open ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
            width={16}
            sx={{ color: 'text.secondary' }}
          />
        </Stack>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: 1,
          bgcolor: alpha(theme.palette.grey[500], 0.14),
          '& .MuiLinearProgress-bar': {
            borderRadius: 1,
            bgcolor: theme.palette[accent.color].main,
          },
        }}
      />

      <Stack direction="row" flexWrap="wrap" gap={2.5} sx={{ mt: 1.25 }}>
        <MetaStat
          label="Units"
          value={`${progress.completedUnits ?? 0}/${progress.totalUnits ?? 0}`}
        />
        <MetaStat label="Watch time" value={formatWatch(watchedSeconds)} />
        <MetaStat label="Quiz / assessment" value={quizAssessmentLabel} />
      </Stack>

      <Collapse in={open}>
        <Divider sx={{ my: 1.75 }} />
        <Stack spacing={1.25}>
          {modules.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No modules found for this course.
            </Typography>
          ) : (
            modules.map((mod) => (
              <ModuleBlock
                key={mod.id}
                module={mod}
                quizScope={scopeByModuleId[String(mod.id)]}
                currentSectionId={progress.currentSectionId}
                showModuleQuizAssessment={showModuleQuizAssessment}
              />
            ))
          )}

          {(courseEndScope?.quizCount > 0 || courseEndScope?.assignmentCount > 0) && (
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: 1.5,
                border: (t) => `1px dashed ${t.palette.divider}`,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
                Course-end checks
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <ScopeChip
                  label="Quiz"
                  done={courseEndScope?.quizCompleted}
                  count={courseEndScope?.quizCount}
                />
                <ScopeChip
                  label="Assessment"
                  done={courseEndScope?.assignmentCompleted}
                  count={courseEndScope?.assignmentCount}
                />
              </Stack>
            </Box>
          )}
        </Stack>
      </Collapse>
    </Card>
  );
}

function PillarGroup({ group, theme }) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.25 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1rem', md: '1.1rem' } }}>
          {group.pillarLabel}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {group.courses.length} course{group.courses.length === 1 ? '' : 's'}
        </Typography>
        <Divider sx={{ flexGrow: 1 }} />
      </Stack>
      <Stack spacing={1.75}>
        {group.courses.map((entry) => (
          <CourseTrackingCard key={entry.course?.id || entry.key} entry={entry} theme={theme} />
        ))}
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function UserTrackingPanel({ userId }) {
  const theme = useTheme();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      setError('User id missing');
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await courseService.getUserProgressOverview(userId);
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(err?.message || 'Failed to load tracking data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const pillarGroups = useMemo(() => {
    const groups = new Map();
    (rows || []).forEach((entry) => {
      const pillarIndex = resolvePillarIndexFromCourse(entry?.course) || 0;
      const key = pillarIndex > 0 ? String(pillarIndex) : 'other';
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          pillarIndex: pillarIndex || 99,
          pillarLabel: pillarIndex > 0 ? formatPillarLabel(pillarIndex) : 'Other courses',
          courses: [],
        });
      }
      groups.get(key).courses.push(entry);
    });
    return [...groups.values()].sort((a, b) => a.pillarIndex - b.pillarIndex);
  }, [rows]);

  const summary = useMemo(() => {
    let watched = 0;
    let completed = 0;
    (rows || []).forEach((entry) => {
      if (entry?.progress?.isCompleted) completed += 1;
      (entry?.modules || []).forEach((mod) => {
        (mod.sections || []).forEach((sec) => {
          if (!String(sec?.videoUrl || '').trim()) return;
          const w = Number(sec?.sectionProgress?.watchedSeconds ?? 0);
          if (Number.isFinite(w)) watched += Math.max(0, w);
        });
      });
    });
    return {
      courses: rows.length,
      completed,
      watchedLabel: formatWatch(watched),
    };
  }, [rows]);

  if (loading) {
    return (
      <Card sx={{ p: 4, borderRadius: 2 }}>
        <LoadingScreen />
      </Card>
    );
  }

  return (
    <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Learning tracking
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Read-only pillar → module → section progress (same detail as learner panel).
          </Typography>
        </Box>
        <Chip
          size="small"
          variant="outlined"
          color="info"
          icon={<Iconify icon="solar:eye-bold" width={14} />}
          label="View only"
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {!error && rows.length === 0 ? (
        <Alert severity="info">No enrolled / trackable courses found for this user.</Alert>
      ) : null}

      {rows.length > 0 ? (
        <>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2.5 }}>
            <Chip size="small" variant="soft" label={`${summary.courses} courses`} sx={{ fontWeight: 700 }} />
            <Chip
              size="small"
              variant="soft"
              color="success"
              label={`${summary.completed} completed`}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              size="small"
              variant="soft"
              color="info"
              label={`${summary.watchedLabel} watched`}
              sx={{ fontWeight: 700 }}
            />
          </Stack>

          <Stack spacing={3}>
            {pillarGroups.map((group) => (
              <PillarGroup key={group.key} group={group} theme={theme} />
            ))}
          </Stack>
        </>
      ) : null}
    </Card>
  );
}
