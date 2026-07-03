import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import { GradientButton } from 'src/components/custom-button';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useAuthContext } from 'src/auth/hooks';
import { LoadingScreen } from 'src/components/loading-screen';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Pagination, { paginationClasses } from '@mui/material/Pagination';
import { courseService } from 'src/services/course.service';
import {
  buildCourseCompletionLinkedInShareText,
  buildLinkedInFeedShareUrl,
} from 'src/utils/linkedin-share';
import { getCourseDefaultImage } from 'src/utils/course-default-image';
import { LearningGuestSignInPrompt } from './components/learning-guest-sign-in-prompt';
import { LearningSectionHeader } from './components/learning-section-header';
import { HOME_SECTION_CARD_SX } from 'src/sections/home/home-section-styles';

// ----------------------------------------------------------------------

const STAT_VALUE_SX = {
  fontWeight: 700,
  fontSize: { xs: '1rem', md: '1.125rem' },
  lineHeight: 1.2,
};

const COURSES_PER_PAGE = 8;

const DEFAULT_COURSE_IMAGE = getCourseDefaultImage();

/** Sum watchedSeconds from player-context modules (nested sectionProgress). */
function sumWatchedSecondsFromModules(modulesByCourse) {
  let total = 0;
  Object.values(modulesByCourse || {}).forEach((modules) => {
    (modules || []).forEach((mod) => {
      (mod.sections || []).forEach((sec) => {
        const sp = sec?.sectionProgress;
        if (sp && typeof sp.watchedSeconds === 'number' && Number.isFinite(sp.watchedSeconds)) {
          total += Math.max(0, sp.watchedSeconds);
        }
      });
    });
  });
  return total;
}

function formatWatchTime(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (s === 0) return '0 h';
  const h = s / 3600;
  if (h < 1) return `${Math.max(1, Math.round(s / 60))} min`;
  return `${Math.round(h * 10) / 10} h`;
}

function formatLastAccessed(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min ago`;
  return 'Just now';
}

export function MyProgress({ onNavigateToCertificates }) {
  const theme = useTheme();
  const { authenticated } = useAuthContext();
  const [progressRows, setProgressRows] = useState([]);
  const [page, setPage] = useState(1);
  const [progressTab, setProgressTab] = useState('in-progress');
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) {
      setProgressRows([]);
      setProgressLoading(false);
      return () => {};
    }
    let cancelled = false;
    const loadProgress = async () => {
      try {
        setProgressLoading(true);
        if (cancelled) return;
        const rows = await courseService.getMyProgressOverview();
        setProgressRows(Array.isArray(rows) ? rows : []);
      } finally {
        if (!cancelled) setProgressLoading(false);
      }
    };

    loadProgress();

    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  // Use only API courses for progress — no mock list so progress stays dynamic
  // Only show courses where user has progress (authenticated and progress exists)
  const myCourses = useMemo(() => {
    const list = authenticated ? (progressRows || []).filter(Boolean) : [];
    const visibleCourses = list
      .map((entry) => {
        const c = entry?.course || {};
        const progress = entry?.progress || null;
        const modules = Array.isArray(entry?.modules) ? entry.modules : [];
        const flatSections = modules.flatMap((m) => (m.sections || []).map((s) => ({ id: s.id, title: s.title || 'Lesson' })));
        const sectionIdSet = new Set(flatSections.map((s) => String(s.id)));
        const totalLessons = flatSections.length;
        const viewedIds = Array.isArray(progress?.viewedSectionIds) ? progress.viewedSectionIds : [];
        const currentId = progress?.currentSectionId;
        // Count completed/watched lessons; optionally include current section so in-progress lessons show partial credit
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
        const progressPercent = Math.max(
          0,
          Math.min(100, Number(progress?.completionPercent ?? 0)),
        );
        const isFullyCompleted =
          progress?.isCompleted === true || progress?.status === 'completed';
        const currentSectionId = progress?.currentSectionId;
        const currentIndex = flatSections.findIndex((s) => s.id === currentSectionId);
        const nextSection = currentIndex >= 0 && currentIndex < flatSections.length - 1 ? flatSections[currentIndex + 1] : null;
        const firstSection = flatSections[0];
        let nextLessonLabel = '—';
        if (nextSection?.title) nextLessonLabel = nextSection.title;
        else if (isFullyCompleted) nextLessonLabel = 'Course completed';
        else if (firstSection?.title) nextLessonLabel = `Start: ${firstSection.title}`;

        return {
          id: c.id,
          title: c.title || 'Untitled Course',
          image: c.image || DEFAULT_COURSE_IMAGE,
          progress: progressPercent,
          lessons: totalLessons ? `${viewedCount}/${totalLessons}` : '0/0',
          timeRemaining: isFullyCompleted ? 'Completed' : '—',
          lastAccessed: progress?.lastAccessedAt ? formatLastAccessed(progress.lastAccessedAt) : '—',
          nextLesson: nextLessonLabel,
        };
      })
      .filter(Boolean);
    return visibleCourses;
  }, [progressRows, authenticated]);

  const inProgressCourses = useMemo(
    () => myCourses.filter((c) => c.progress < 100),
    [myCourses]
  );
  const completedCourses = useMemo(
    () => myCourses.filter((c) => c.progress === 100),
    [myCourses]
  );
  const completedCount = completedCourses.length;
  const certificatesCount = completedCount > 0 ? completedCount : 0;
  const activeTabCourses = progressTab === 'completed' ? completedCourses : inProgressCourses;

  useEffect(() => {
    setPage(1);
  }, [progressTab]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(activeTabCourses.length / COURSES_PER_PAGE));
    if (page > maxPage) setPage(1);
  }, [activeTabCourses.length, page]);

  const totalWatchSeconds = useMemo(
    () =>
      sumWatchedSecondsFromModules(
        Object.fromEntries(
          (progressRows || []).map((row) => [String(row?.course?.id || ''), Array.isArray(row?.modules) ? row.modules : []])
        )
      ),
    [progressRows]
  );

  if (progressLoading && authenticated) {
    return <LoadingScreen />;
  }

  if (authenticated && !progressRows?.length) {
    return (
      <>
        <LearningSectionHeader
          icon="solar:graph-up-bold"
          iconGradient="linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)"
          title="Your Learning Journey"
          subtitle="Track your courses and learning stats"
        />
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Iconify icon="solar:graph-up-bold" width={64} sx={{ color: 'text.disabled', mx: 'auto', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            No progress yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Open a course once and your progress will appear here.
          </Typography>
        </Box>
      </>
    );
  }

  // Empty progress list: guest uses shared sign-in component; signed-in user sees simple empty state.
  if (!myCourses?.length && !progressLoading) {
    if (!authenticated) {
      return <LearningGuestSignInPrompt variant="progress" />;
    }
    return (
      <>
        <LearningSectionHeader
          icon="solar:graph-up-bold"
          iconGradient="linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)"
          title="Your Learning Journey"
          subtitle="Track your courses and learning stats"
        />
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Iconify icon="solar:graph-up-bold" width={64} sx={{ color: 'text.disabled', mx: 'auto', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            No progress yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Free courses and purchased courses appear here after you open them once. Use All Courses to browse, then return to My Progress.
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
          `${myCourses.length} course${myCourses.length === 1 ? '' : 's'} in progress`,
          completedCount > 0 ? `${completedCount} completed` : null,
        ]
          .filter(Boolean)
          .join(' • ')}
      />

      <Grid container spacing={2} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid xs={12} sm={4}>
          <Card sx={{ ...HOME_SECTION_CARD_SX, p: { xs: 2, sm: 2.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:clock-circle-bold" width={18} sx={{ color: 'info.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Total watch time
                </Typography>
              </Stack>
              <Typography sx={STAT_VALUE_SX}>{formatWatchTime(totalWatchSeconds)}</Typography>
            </Stack>
          </Card>
        </Grid>
        <Grid xs={12} sm={4}>
          <Card sx={{ ...HOME_SECTION_CARD_SX, p: { xs: 2, sm: 2.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:book-bold" width={18} sx={{ color: 'success.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Courses completed
                </Typography>
              </Stack>
              <Typography sx={STAT_VALUE_SX}>{completedCount}</Typography>
            </Stack>
          </Card>
        </Grid>
        <Grid xs={12} sm={4}>
          <Card sx={{ ...HOME_SECTION_CARD_SX, p: { xs: 2, sm: 2.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:medal-ribbons-star-bold" width={18} sx={{ color: 'warning.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Certificates earned
                </Typography>
              </Stack>
              <Typography sx={STAT_VALUE_SX}>{certificatesCount}</Typography>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Tabs
        value={progressTab}
        onChange={(_, value) => setProgressTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          mb: 2,
          minHeight: 40,
          '& .MuiTab-root': {
            minHeight: 40,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: { xs: '0.82rem', sm: '0.9rem' },
            px: { xs: 1.25, sm: 2 },
          },
        }}
      >
        <Tab value="in-progress" label={`In progress (${inProgressCourses.length})`} />
        <Tab value="completed" label={`Completed (${completedCourses.length})`} />
      </Tabs>

      <Stack spacing={2}>
            {(() => {
              if (!activeTabCourses.length) {
                return (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Iconify
                      icon={progressTab === 'completed' ? 'solar:medal-ribbons-star-bold' : 'solar:play-circle-bold'}
                      width={48}
                      sx={{ color: 'text.disabled', mx: 'auto', mb: 1.5 }}
                    />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {progressTab === 'completed' ? 'No completed courses yet' : 'No courses in progress'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {progressTab === 'completed'
                        ? 'Finish a course to see it here.'
                        : 'Continue learning from All Courses or My Courses.'}
                    </Typography>
                  </Box>
                );
              }

              const pageCount = Math.max(1, Math.ceil(activeTabCourses.length / COURSES_PER_PAGE));
              const displayedCourses = activeTabCourses.slice(
                (page - 1) * COURSES_PER_PAGE,
                page * COURSES_PER_PAGE
              );
              return (
                <>
                  {displayedCourses.map((course) => (
              <Card key={course.id} sx={{ ...HOME_SECTION_CARD_SX, p: { xs: 2, sm: 2.5 } }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 1.5, sm: 2 }}
                  alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                >
                  <Image
                    alt={course.title}
                    src={course.image || DEFAULT_COURSE_IMAGE}
                    ratio="1/1"
                    sx={{
                      width: { xs: '100%', sm: 72 },
                      height: { xs: 140, sm: 72 },
                      borderRadius: 1.5,
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '0.95rem', md: '1rem' } }}>
                      {course.title}
                    </Typography>
                    <Box sx={{ mb: 1.25 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Progress
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {course.progress}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, course.progress)}
                        sx={{
                          height: 6,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.grey[500], 0.16),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 1,
                            bgcolor: 'primary.main',
                          },
                        }}
                      />
                    </Box>

                    <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 1.5 }}>
                      <Grid xs={12} sm={6}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Lessons: {course.lessons}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Time remaining: {course.timeRemaining}
                        </Typography>
                      </Grid>

                      <Grid xs={12} sm={6}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Last accessed: {course.lastAccessed}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Next: {course.nextLesson}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <GradientButton
                        component={RouterLink}
                        to={paths.learningCourse.learn(course.id)}
                        size="small"
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        {course.progress === 100 ? 'Review Course' : 'Continue Learning'}
                      </GradientButton>
                      <Button
                        component={RouterLink}
                        to={paths.learningCourse.details(course.id)}
                        variant="text"
                        size="small"
                        sx={{
                          color: 'primary.main',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                          width: { xs: '100%', sm: 'auto' },
                        }}
                      >
                        View Details
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </Card>
                  ))}
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
            })()}
      </Stack>

      {/* Earned certificates – completed courses */}
      {progressTab === 'completed' && completedCourses.length > 0 && (
        <Box sx={{ mt: { xs: 3, md: 4 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.08rem', md: '1.2rem' },
              }}
            >
              Earned certificates
            </Typography>
            {typeof onNavigateToCertificates === 'function' && (
              <Button
                size="small"
                variant="soft"
                color="warning"
                endIcon={<Iconify icon="solar:arrow-right-bold" width={16} />}
                onClick={onNavigateToCertificates}
              >
                View all certificates
              </Button>
            )}
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            {completedCourses.map((course) => (
              <Stack key={course.id} direction="row" spacing={0.75} alignItems="center">
                <Button
                  component={RouterLink}
                  to={paths.learningCourse.details(course.id)}
                  variant="outlined"
                  size="small"
                  startIcon={<Iconify icon="solar:medal-ribbons-star-bold" width={16} sx={{ color: 'warning.main' }} />}
                  sx={{
                    borderRadius: 2,
                    borderColor: alpha(theme.palette.warning.main, 0.4),
                    color: 'warning.darker',
                    '&:hover': { borderColor: 'warning.main', bgcolor: alpha(theme.palette.warning.main, 0.08) },
                  }}
                >
                  {course.title}
                </Button>
                <Button
                  size="small"
                  color="info"
                  variant="soft"
                  startIcon={<Iconify icon="mdi:linkedin" width={16} />}
                  onClick={() =>
                    window.open(
                      buildLinkedInFeedShareUrl(
                        buildCourseCompletionLinkedInShareText({ courseTitle: course.title })
                      ),
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  sx={{ borderRadius: 2 }}
                >
                  Share
                </Button>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </>
  );
}
