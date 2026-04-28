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
import { DashboardContent } from 'src/layouts/dashboard';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useAuthContext } from 'src/auth/hooks';
import { LoadingScreen } from 'src/components/loading-screen';
import Pagination, { paginationClasses } from '@mui/material/Pagination';
import { courseService } from 'src/services/course.service';
import {
  buildCourseCompletionLinkedInShareText,
  buildLinkedInFeedShareUrl,
} from 'src/utils/linkedin-share';

// ----------------------------------------------------------------------

const COURSES_PER_PAGE = 8;

const DEFAULT_COURSE_IMAGE =
  import.meta.env.VITE_DEFAULT_COURSE_IMAGE || '/assets/images/cover/cover-1.jpg';

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
        const progressPercent = totalLessons ? Math.min(100, Math.round((viewedCount / totalLessons) * 100)) : 0;
        const currentSectionId = progress?.currentSectionId;
        const currentIndex = flatSections.findIndex((s) => s.id === currentSectionId);
        const nextSection = currentIndex >= 0 && currentIndex < flatSections.length - 1 ? flatSections[currentIndex + 1] : null;
        const firstSection = flatSections[0];
        let nextLessonLabel = '—';
        if (nextSection?.title) nextLessonLabel = nextSection.title;
        else if (progressPercent >= 100) nextLessonLabel = 'Course completed';
        else if (firstSection?.title) nextLessonLabel = `Start: ${firstSection.title}`;

        return {
          id: c.id,
          title: c.title || 'Untitled Course',
          image: c.image || DEFAULT_COURSE_IMAGE,
          progress: progressPercent,
          lessons: totalLessons ? `${viewedCount}/${totalLessons}` : '0/0',
          timeRemaining: progressPercent >= 100 ? 'Completed' : '—',
          lastAccessed: progress?.lastAccessedAt ? formatLastAccessed(progress.lastAccessedAt) : '—',
          nextLesson: nextLessonLabel,
        };
      })
      .filter(Boolean);
    return visibleCourses;
  }, [progressRows, authenticated]);

  // Reset to page 1 when list shrinks
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(myCourses.length / COURSES_PER_PAGE));
    if (page > maxPage) setPage(1);
  }, [myCourses.length, page]);

  const completedCount = myCourses.filter((c) => c.progress === 100).length;
  const certificatesCount = completedCount > 0 ? completedCount : 0;
  const completedCourses = myCourses.filter((c) => c.progress === 100);

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
      <DashboardContent>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Iconify icon="solar:graph-up-bold" width={64} sx={{ color: 'text.disabled', mx: 'auto', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            No progress yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Open a course once and your progress will appear here.
          </Typography>
        </Box>
      </DashboardContent>
    );
  }

  // Show empty state if no courses with progress
  if (!myCourses?.length && !progressLoading) {
    return (
      <DashboardContent>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Iconify icon="solar:graph-up-bold" width={64} sx={{ color: 'text.disabled', mx: 'auto', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            {!authenticated ? 'Sign in to track your progress' : 'No progress yet'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            {!authenticated
              ? 'Sign in to see your learning progress and continue where you left off.'
              : 'Free courses and purchased courses appear here after you open them once. Use All Courses to browse, then return to My Progress.'}
          </Typography>
          {!authenticated && (
            <Button
              component={RouterLink}
              to={paths.auth.simple.signIn}
              variant="contained"
              startIcon={<Iconify icon="solar:login-2-bold" width={18} />}
            >
              Sign in
            </Button>
          )}
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Grid container spacing={{ xs: 2, md: 4 }}>
        {/* LEFT SIDE – 8 columns on md+ */}
        <Grid xs={12} md={8}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: { xs: 2, md: 3 } }}>
            <Box
              sx={{
                width: { xs: 32, md: 40 },
                height: { xs: 32, md: 40 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
                background: 'linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            >
              <Iconify icon="solar:graph-up-bold" width={20} sx={{ color: 'common.white' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              Your Learning Journey
            </Typography>
          </Stack>

          {!authenticated && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={2}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Sign in to see your progress, lesson completion, and last accessed time for each course.
                </Typography>
                <Button
                  component={RouterLink}
                  to={paths.auth.simple.signIn}
                  variant="contained"
                  size="small"
                  startIcon={<Iconify icon="solar:login-2-bold" width={18} />}
                >
                  Sign in
                </Button>
              </Stack>
            </Box>
          )}

          <Stack spacing={{ xs: 2, md: 3 }}>
            {(() => {
              const pageCount = Math.max(1, Math.ceil(myCourses.length / COURSES_PER_PAGE));
              const displayedCourses = myCourses.slice(
                (page - 1) * COURSES_PER_PAGE,
                page * COURSES_PER_PAGE
              );
              return (
                <>
                  {displayedCourses.map((course) => (
              <Card key={course.id} sx={{ p: { xs: 2, md: 3 } }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 2, sm: 2 }}
                  alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                >
                  <Image
                    alt={course.title}
                    src={course.image}
                    ratio="1/1"
                    sx={{
                      width: { xs: '100%', sm: 80 },
                      height: { xs: 160, sm: 80 },
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {course.title}
                    </Typography>
                    <Box sx={{ mb: 1.5 }}>
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
                          height: 8,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.grey[500], 0.16),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 1,
                            bgcolor: 'primary.main',
                          },
                        }}
                      />
                    </Box>

                    <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 2 }}>
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
          {completedCourses.length > 0 && (
            <Box sx={{ mt: { xs: 3, md: 4 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Earned certificates
                </Typography>
                {typeof onNavigateToCertificates === 'function' && (
                  <Button
                    size="small"
                    variant="soft"
                    color="warning"
                    endIcon={<Iconify icon="solar:arrow-right-bold" width={18} />}
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
                      startIcon={<Iconify icon="solar:medal-ribbons-star-bold" width={18} sx={{ color: 'warning.main' }} />}
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

        </Grid>

        {/* RIGHT SIDE – 4 columns on md+ */}
        <Grid xs={12} md={4}>
        <Stack spacing={{ xs: 2, md: 3 }}>
            <Card
              sx={{
                p: { xs: 2, md: 3 },
                bgcolor: alpha(theme.palette.background.paper, 0.9),
                backdropFilter: 'blur(8px)',
                boxShadow: theme.customShadows.z16,
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                transition: 'transform 0.3s',
                '&:hover': { transform: 'scale(1.05)' },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: { xs: 1.5, md: 2 } }}>
                <Box
                  sx={{
                    width: { xs: 28, md: 32 },
                    height: { xs: 28, md: 32 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.info.main, 0.12),
                  }}
                >
                  <Iconify icon="solar:chart-2-bold" width={16} sx={{ color: 'info.main' }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Learning Stats
                </Typography>
              </Stack>
              <Stack spacing={{ xs: 1.5, md: 2 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    p: { xs: 1.25, md: 1.5 },
                    borderRadius: 1,
                    background: `linear-gradient(90deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Iconify icon="solar:clock-circle-bold" width={16} sx={{ color: 'info.main' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Total watch time
                    </Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {formatWatchTime(totalWatchSeconds)}
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    p: { xs: 1.25, md: 1.5 },
                    borderRadius: 1,
                    background: `linear-gradient(90deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0.08)} 100%)`,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Iconify icon="solar:book-bold" width={16} sx={{ color: 'success.main' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Courses Completed
                    </Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {completedCount}
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    p: { xs: 1.25, md: 1.5 },
                    borderRadius: 1,
                    background: `linear-gradient(90deg, ${alpha(theme.palette.warning.main, 0.08)} 0%, ${alpha(theme.palette.error.main, 0.08)} 100%)`,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Iconify icon="solar:medal-ribbons-star-bold" width={16} sx={{ color: 'warning.main' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Certificates Earned
                    </Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {certificatesCount}
                  </Typography>
                </Stack>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
