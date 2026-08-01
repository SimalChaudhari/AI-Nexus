import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { GradientButton } from 'src/components/custom-button';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useAuthContext } from 'src/auth/hooks';
import { LoadingScreen } from 'src/components/loading-screen';
import Pagination, { paginationClasses } from '@mui/material/Pagination';
import { courseService } from 'src/services/course.service';
import { LearningGuestSignInPrompt } from './components/learning-guest-sign-in-prompt';
import { LearningSectionHeader } from './components/learning-section-header';
import { HOME_SECTION_CARD_SX } from 'src/sections/home/home-section-styles';
import { formatPillarLabel, resolvePillarIndexFromCourse } from './components/credential-shared';
import { LEARNING_JOURNEY_CERTIFICATES_ENABLED } from './learning-feature-flags';
import { formatSecondsToClock } from './utils/video-coverage';

// ----------------------------------------------------------------------

const COURSES_PER_PAGE = 8;

const STAT_VALUE_SX = {
  fontWeight: 700,
  fontSize: { xs: '0.95rem', md: '1.05rem' },
  lineHeight: 1.2,
};

const PILLAR_CARD_SX = {
  borderRadius: 2,
  bgcolor: 'background.paper',
  border: (theme) => `1px solid ${theme.palette.divider}`,
  boxShadow: (theme) =>
    theme.palette.mode === 'dark'
      ? theme.customShadows?.card
      : '0 4px 14px rgba(15, 23, 42, 0.05)',
  height: '100%',
};

const PILLAR_ACCENT = {
  1: { color: 'info', icon: 'solar:book-bold' },
  2: { color: 'warning', icon: 'solar:widget-5-bold' },
  3: { color: 'error', icon: 'solar:crown-bold' },
};

function courseHasVideoLessons(modules = []) {
  return (modules || []).some((mod) =>
    (mod.sections || []).some((sec) => Boolean(String(sec?.videoUrl || '').trim()))
  );
}

function sumWatchedSecondsFromModules(modules = []) {
  let total = 0;
  (modules || []).forEach((mod) => {
    (mod.sections || []).forEach((sec) => {
      if (!String(sec?.videoUrl || '').trim()) return;
      const sp = sec?.sectionProgress;
      if (sp && typeof sp.watchedSeconds === 'number' && Number.isFinite(sp.watchedSeconds)) {
        total += Math.max(0, sp.watchedSeconds);
      }
    });
  });
  return total;
}

function formatWatchTime(totalSeconds) {
  return formatSecondsToClock(totalSeconds);
}

function formatLastAccessed(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function buildPillarProgressEntry(entry) {
  const c = entry?.course || {};
  const progress = entry?.progress || null;
  const modules = Array.isArray(entry?.modules) ? entry.modules : [];
  const pillarIndex = resolvePillarIndexFromCourse(c);
  if (!pillarIndex) return null;

  const flatSections = modules.flatMap((m) =>
    (m.sections || []).map((s) => ({ id: s.id, title: s.title || 'Lesson' }))
  );
  const sectionIdSet = new Set(flatSections.map((s) => String(s.id)));
  const totalLessons = flatSections.length;
  const viewedIds = Array.isArray(progress?.viewedSectionIds) ? progress.viewedSectionIds : [];
  const currentId = progress?.currentSectionId;
  const allViewed = new Set([
    ...viewedIds.filter((id) => id != null && sectionIdSet.has(String(id))),
    ...(currentId != null && sectionIdSet.has(String(currentId)) ? [String(currentId)] : []),
  ]);
  const viewedCount = allViewed.size;
  const hasMeaningfulProgress =
    viewedCount > 0 ||
    Boolean(progress?.lastAccessedAt) ||
    modules.some((m) =>
      (m.sections || []).some((s) => {
        const sp = s?.sectionProgress;
        if (!sp || typeof sp !== 'object') return false;
        const completion = Number(sp.completionPercent ?? sp.currentProgress ?? 0);
        const watched = Number(sp.watchedSeconds ?? 0);
        const lastPos = Number(sp.lastPositionSeconds ?? 0);
        return (
          sp.isViewed === true ||
          sp.isWatched === true ||
          sp.isCompleted === true ||
          (Number.isFinite(completion) && completion > 0) ||
          (Number.isFinite(watched) && watched > 0) ||
          (Number.isFinite(lastPos) && lastPos > 0)
        );
      })
    );
  if (!hasMeaningfulProgress) return null;

  const progressPercent = Math.max(0, Math.min(100, Number(progress?.completionPercent ?? 0)));
  const hasVideoLessons = courseHasVideoLessons(modules);
  const watchedSeconds = hasVideoLessons ? sumWatchedSecondsFromModules(modules) : 0;
  const currentSectionId = progress?.currentSectionId;
  const currentIndex = flatSections.findIndex((s) => s.id === currentSectionId);
  const nextSection =
    currentIndex >= 0 && currentIndex < flatSections.length - 1 ? flatSections[currentIndex + 1] : null;
  const firstSection = flatSections[0];
  let nextLessonLabel = '—';
  if (nextSection?.title) nextLessonLabel = nextSection.title;
  else if (firstSection?.title) nextLessonLabel = firstSection.title;

  return {
    key: String(c.id),
    courseId: c.id,
    pillarIndex,
    pillarLabel: formatPillarLabel(pillarIndex) || `Pillar ${pillarIndex}`,
    title: c.title || 'Untitled Course',
    programId: c.programId || null,
    programTitle: c.programTitle || '',
    progress: progressPercent,
    lessons: totalLessons ? `${viewedCount}/${totalLessons}` : '0/0',
    hasVideoLessons,
    watchedSeconds,
    watchTimeLabel: hasVideoLessons ? formatWatchTime(watchedSeconds) : null,
    lastAccessed: progress?.lastAccessedAt ? formatLastAccessed(progress.lastAccessedAt) : '—',
    nextLesson: nextLessonLabel,
  };
}

function groupCoursesByPillar(courses = []) {
  const groups = new Map();
  courses.forEach((item) => {
    const sectionKey = String(item.pillarIndex);
    if (!groups.has(sectionKey)) {
      groups.set(sectionKey, {
        key: sectionKey,
        pillarIndex: item.pillarIndex,
        pillarLabel: item.pillarLabel,
        courses: [],
      });
    }
    groups.get(sectionKey).courses.push(item);
  });
  return [...groups.values()].sort((a, b) => a.pillarIndex - b.pillarIndex);
}

function StatMiniCard({ icon, iconColor, label, value }) {
  return (
    <Card sx={{ ...HOME_SECTION_CARD_SX, p: { xs: 1.5, sm: 1.75 } }}>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Iconify icon={icon} width={16} sx={{ color: iconColor }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>
            {label}
          </Typography>
        </Stack>
        <Typography sx={STAT_VALUE_SX}>{value}</Typography>
      </Stack>
    </Card>
  );
}

function PillarSectionHeading({ group, theme }) {
  const title = group.pillarLabel;
  const count = group.courses.length;
  const titleSx = {
    fontWeight: 800,
    color: 'text.primary',
    letterSpacing: 0.2,
    fontSize: { xs: '1rem', md: '1.1rem' },
  };
  const dividerSx = {
    height: 2,
    border: 0,
    borderRadius: 999,
    bgcolor: 'transparent',
    background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.7)} 0%, ${alpha(theme.palette.primary.main, 0.18)} 100%)`,
  };

  return (
    <>
      <Box sx={{ display: { xs: 'block', sm: 'none' }, mb: 1.25, minWidth: 0 }}>
        <Typography variant="h6" sx={{ ...titleSx, lineHeight: 1.3, wordBreak: 'break-word' }}>
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.35,
            color: 'text.secondary',
            fontWeight: 600,
            fontSize: '0.78rem',
          }}
        >
          {count} course{count === 1 ? '' : 's'}
        </Typography>
        <Divider sx={{ ...dividerSx, mt: 1 }} />
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ display: { xs: 'none', sm: 'flex' }, mb: 1.25 }}
      >
        <Typography variant="h6" sx={{ ...titleSx, whiteSpace: 'nowrap' }}>
          {title} ({count})
        </Typography>
        <Divider sx={{ ...dividerSx, flexGrow: 1 }} />
      </Stack>
    </>
  );
}

function PillarProgressCard({ course, theme }) {
  const accent = PILLAR_ACCENT[course.pillarIndex] || PILLAR_ACCENT[1];

  return (
    <Card sx={{ ...PILLAR_CARD_SX, p: { xs: 1.5, sm: 1.75 } }}>
      <Stack spacing={1.1} sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 1,
                bgcolor: alpha(theme.palette[accent.color].main, 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Iconify icon={accent.icon} width={16} sx={{ color: `${accent.color}.main` }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Chip
                size="small"
                label={course.pillarLabel}
                color={accent.color}
                variant="soft"
                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, mb: 0.35 }}
              />
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.3,
                  fontSize: '0.84rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {course.title}
              </Typography>
            </Box>
          </Stack>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', flexShrink: 0 }}>
            {course.progress}%
          </Typography>
        </Stack>

        {course.programTitle ? (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              fontSize: '0.72rem',
              lineHeight: 1.3,
            }}
          >
            {course.programTitle}
          </Typography>
        ) : null}

        <LinearProgress
          variant="determinate"
          value={Math.min(100, course.progress)}
          sx={{
            height: 5,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.grey[500], 0.14),
            '& .MuiLinearProgress-bar': {
              borderRadius: 1,
              bgcolor: theme.palette[accent.color].main,
            },
          }}
        />

        <Grid container spacing={0.75}>
          <Grid xs={course.hasVideoLessons ? 6 : 12}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.72rem' }}>
              Lessons
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
              {course.lessons}
            </Typography>
          </Grid>
          {course.hasVideoLessons ? (
            <Grid xs={6}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.72rem' }}>
                Watch time
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
                {course.watchTimeLabel}
              </Typography>
            </Grid>
          ) : null}
          <Grid xs={12}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
              Last active {course.lastAccessed}
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 'auto', pt: 0.25 }}>
          <GradientButton
            component={RouterLink}
            to={paths.learningCourse.learn(course.courseId)}
            size="small"
            fullWidth
            sx={{ minHeight: 34, fontSize: '0.8rem' }}
          >
            Continue
          </GradientButton>
        </Box>
      </Stack>
    </Card>
  );
}

export function MyProgress({ onNavigateToCertificates, onNavigateToBadges }) {
  const theme = useTheme();
  const { authenticated } = useAuthContext();
  const [progressRows, setProgressRows] = useState([]);
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [page, setPage] = useState(1);
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) {
      setProgressRows([]);
      setCertificatesCount(0);
      setProgressLoading(false);
      return () => {};
    }
    let cancelled = false;
    const loadProgress = async () => {
      try {
        setProgressLoading(true);
        const rowsPromise = courseService.getMyProgressOverview();
        const certificatesPromise = LEARNING_JOURNEY_CERTIFICATES_ENABLED
          ? courseService.getMyCertificates().catch(() => [])
          : Promise.resolve([]);
        const [rows, certificates] = await Promise.all([rowsPromise, certificatesPromise]);
        if (cancelled) return;
        setProgressRows(Array.isArray(rows) ? rows : []);
        setCertificatesCount(
          LEARNING_JOURNEY_CERTIFICATES_ENABLED && Array.isArray(certificates)
            ? certificates.length
            : 0
        );
      } finally {
        if (!cancelled) setProgressLoading(false);
      }
    };

    loadProgress();

    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  const courseProgressItems = useMemo(
    () =>
      (progressRows || [])
        .map((entry) => buildPillarProgressEntry(entry))
        .filter(Boolean)
        .sort((a, b) => {
          const programCompare = String(a.programTitle || a.programId || '').localeCompare(
            String(b.programTitle || b.programId || '')
          );
          if (programCompare !== 0) return programCompare;
          if (a.pillarIndex !== b.pillarIndex) return a.pillarIndex - b.pillarIndex;
          return String(a.title || '').localeCompare(String(b.title || ''));
        }),
    [progressRows]
  );

  const pillarGroups = useMemo(
    () => groupCoursesByPillar(courseProgressItems),
    [courseProgressItems]
  );

  const pageCount = Math.max(1, Math.ceil(courseProgressItems.length / COURSES_PER_PAGE));

  const paginatedCourseItems = useMemo(() => {
    const start = (page - 1) * COURSES_PER_PAGE;
    return courseProgressItems.slice(start, start + COURSES_PER_PAGE);
  }, [courseProgressItems, page]);

  const paginatedPillarGroups = useMemo(
    () => groupCoursesByPillar(paginatedCourseItems),
    [paginatedCourseItems]
  );

  useEffect(() => {
    setPage(1);
  }, [courseProgressItems.length]);

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const totalWatchSeconds = useMemo(
    () =>
      courseProgressItems
        .filter((item) => item.hasVideoLessons)
        .reduce((sum, item) => sum + item.watchedSeconds, 0),
    [courseProgressItems]
  );

  const hasAnyVideoCourses = useMemo(
    () => courseProgressItems.some((item) => item.hasVideoLessons),
    [courseProgressItems]
  );

  if (progressLoading && authenticated) {
    return <LoadingScreen />;
  }

  if (!authenticated) {
    return <LearningGuestSignInPrompt variant="progress" />;
  }

  if (!courseProgressItems.length) {
    return (
      <>
        <LearningSectionHeader
          icon="solar:graph-up-bold"
          iconGradient="linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)"
          title="Your Learning Journey"
          subtitle="Track pillar-wise learning progress"
        />
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Iconify icon="solar:graph-up-bold" width={64} sx={{ color: 'text.disabled', mx: 'auto', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            No progress yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Open a pillar course once and your progress report will appear here.
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <LearningSectionHeader
        icon="solar:graph-up-bold"
        iconGradient="linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)"
        title="Your Learning Journey"
        subtitle={[
          `${courseProgressItems.length} course${courseProgressItems.length === 1 ? '' : 's'} across ${pillarGroups.length} pillar${pillarGroups.length === 1 ? '' : 's'}`,
          hasAnyVideoCourses ? `${formatWatchTime(totalWatchSeconds)} watched` : null,
          LEARNING_JOURNEY_CERTIFICATES_ENABLED && certificatesCount > 0
            ? `${certificatesCount} certificate${certificatesCount === 1 ? '' : 's'}`
            : null,
        ]
          .filter(Boolean)
          .join(' • ')}
      />

      <Grid container spacing={1.25} sx={{ mb: 2 }}>
        <Grid xs={LEARNING_JOURNEY_CERTIFICATES_ENABLED ? 6 : hasAnyVideoCourses ? 6 : 12} sm={LEARNING_JOURNEY_CERTIFICATES_ENABLED ? 4 : hasAnyVideoCourses ? 6 : 12}>
          <StatMiniCard
            icon="solar:book-bold"
            iconColor="primary.main"
            label="Courses in progress"
            value={courseProgressItems.length}
          />
        </Grid>
        {hasAnyVideoCourses ? (
          <Grid xs={6} sm={LEARNING_JOURNEY_CERTIFICATES_ENABLED ? 4 : 6}>
            <StatMiniCard
              icon="solar:clock-circle-bold"
              iconColor="info.main"
              label="Total watch time"
              value={formatWatchTime(totalWatchSeconds)}
            />
          </Grid>
        ) : null}
        {LEARNING_JOURNEY_CERTIFICATES_ENABLED ? (
          <Grid xs={hasAnyVideoCourses ? 12 : 6} sm={4}>
            <StatMiniCard
              icon="solar:medal-ribbons-star-bold"
              iconColor="warning.main"
              label="Certificates earned"
              value={certificatesCount}
            />
          </Grid>
        ) : null}
      </Grid>

      {((LEARNING_JOURNEY_CERTIFICATES_ENABLED && certificatesCount > 0) || typeof onNavigateToBadges === 'function') && (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
          {LEARNING_JOURNEY_CERTIFICATES_ENABLED
            && typeof onNavigateToCertificates === 'function'
            && certificatesCount > 0 ? (
            <Button
              size="small"
              variant="soft"
              color="warning"
              endIcon={<Iconify icon="solar:arrow-right-bold" width={16} />}
              onClick={onNavigateToCertificates}
            >
              View certificates
            </Button>
          ) : null}
          {typeof onNavigateToBadges === 'function' ? (
            <Button
              size="small"
              variant="soft"
              color="primary"
              endIcon={<Iconify icon="solar:arrow-right-bold" width={16} />}
              onClick={onNavigateToBadges}
            >
              View digital badges
            </Button>
          ) : null}
        </Stack>
      )}

      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 800, mb: 1.25, fontSize: { xs: '0.9rem', md: '0.95rem' } }}
      >
        Progress report
      </Typography>

      <Stack spacing={2.5}>
        {paginatedPillarGroups.map((group) => (
          <Box key={group.key}>
            <PillarSectionHeading group={group} theme={theme} />
            <Grid container spacing={1.25}>
              {group.courses.map((course) => (
                <Grid key={course.key} xs={12} sm={6} md={4}>
                  <PillarProgressCard course={course} theme={theme} />
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </Stack>

      {pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
            showFirstButton
            showLastButton
            sx={{
              [`& .${paginationClasses.ul}`]: { justifyContent: 'center' },
            }}
          />
        </Box>
      )}
    </>
  );
}
