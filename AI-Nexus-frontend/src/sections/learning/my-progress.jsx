import React, { useEffect, useMemo, useState } from 'react';
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
import { useDispatch, useSelector } from 'react-redux';
import { fetchCourses } from 'src/store/slices/courseSlice';
import { useAuthContext } from 'src/auth/hooks';
import { LoadingScreen } from 'src/components/loading-screen';
import Pagination, { paginationClasses } from '@mui/material/Pagination';
import { courseService } from 'src/services/course.service';

// ----------------------------------------------------------------------

const COURSES_PER_PAGE = 8;

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

const MOCK_FALLBACK = {
  progress: 0,
  lessons: '0/0',
  timeRemaining: '—',
  lastAccessed: '—',
  nextLesson: 'Start learning',
};

export function MyProgress({ onNavigateToCertificates }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { authenticated } = useAuthContext();
  const { courses, loading: coursesLoading } = useSelector((state) => state.courses);
  const [progressByCourse, setProgressByCourse] = useState({});
  const [modulesByCourse, setModulesByCourse] = useState({});
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [page, setPage] = useState(1);
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  useEffect(() => {
    if (!authenticated || !courses?.length) {
      setProgressByCourse({});
      setModulesByCourse({});
      setEnrolledCourseIds([]);
      setProgressLoading(false);
      return () => {};
    }
    let cancelled = false;
    const loadProgress = async () => {
      try {
        setProgressLoading(true);
        const enrolledIds = await courseService.getEnrolledCourseIds();
        const normalizedEnrolledIds = (Array.isArray(enrolledIds) ? enrolledIds : [])
          .map((item) => item?.id || item?._id || item?.courseId || item)
          .filter(Boolean)
          .map((id) => String(id));
        const enrolledSet = new Set(normalizedEnrolledIds);
        const enrolledCourses = (courses || []).filter((c) => enrolledSet.has(String(c.id)));

        const entries = await Promise.all(
          enrolledCourses.map(async (course) => {
            try {
              const ctx = await courseService.getCoursePlayerContext(course.id);
              const modules = Array.isArray(ctx?.modules) ? ctx.modules : [];
              const progressMap =
                ctx?.sectionProgressBySectionId && typeof ctx.sectionProgressBySectionId === 'object'
                  ? ctx.sectionProgressBySectionId
                  : {};
              const progressRows = Object.values(progressMap).filter(Boolean);
              const viewedSectionIds = progressRows
                .filter((row) => row?.isViewed === true)
                .map((row) => row.sectionId)
                .filter(Boolean);
              const latestByTime = progressRows
                .filter((row) => row?.lastAccessedAt)
                .sort(
                  (a, b) =>
                    new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
                )[0];
              const latestByProgress = progressRows
                .filter((row) => row?.currentProgress != null)
                .sort((a, b) => Number(b.currentProgress || 0) - Number(a.currentProgress || 0))[0];
              const currentSectionId = latestByTime?.sectionId || latestByProgress?.sectionId || null;
              const lastAccessedAt = latestByTime?.lastAccessedAt || null;

              return [
                course.id,
                {
                  modules,
                  progress: {
                    viewedSectionIds,
                    currentSectionId,
                    lastAccessedAt,
                  },
                },
              ];
            } catch {
              return [course.id, { modules: [], progress: null }];
            }
          })
        );

        if (cancelled) return;

        const nextModulesByCourse = {};
        const nextProgressByCourse = {};
        entries.forEach(([courseId, data]) => {
          nextModulesByCourse[courseId] = data.modules;
          nextProgressByCourse[courseId] = data.progress;
        });
        setEnrolledCourseIds(normalizedEnrolledIds);
        setModulesByCourse(nextModulesByCourse);
        setProgressByCourse(nextProgressByCourse);
      } finally {
        if (!cancelled) setProgressLoading(false);
      }
    };

    loadProgress();

    return () => {
      cancelled = true;
    };
  }, [authenticated, courses?.length]);

  // Use only API courses for progress — no mock list so progress stays dynamic
  // Only show courses where user has progress (authenticated and progress exists)
  const myCourses = useMemo(() => {
    const courseMap = new Map((courses || []).map((c) => [String(c.id), c]));
    const list = authenticated
      ? enrolledCourseIds.map((id) => courseMap.get(String(id))).filter(Boolean)
      : [];
    const visibleCourses = list
      .map((c) => {
        const progress = progressByCourse[c.id];
        const modules = modulesByCourse[c.id] || [];
        const flatSections = modules.flatMap((m) => (m.sections || []).map((s) => ({ id: s.id, title: s.title || 'Lesson' })));
        const totalLessons = flatSections.length;
        const viewedIds = Array.isArray(progress?.viewedSectionIds) ? progress.viewedSectionIds : [];
        const currentId = progress?.currentSectionId;
        // Include both viewedSectionIds and currentSectionId (for rows where viewedSectionIds may be empty)
        const allViewed = new Set([
          ...viewedIds.filter((id) => flatSections.some((s) => s.id === id)),
          ...(currentId && flatSections.some((s) => s.id === currentId) ? [currentId] : []),
        ]);
        const viewedCount = allViewed.size;
        const progressPercent = totalLessons ? Math.min(100, Math.round((viewedCount / totalLessons) * 100)) : 0;
        const currentSectionId = progress?.currentSectionId;
        const currentIndex = flatSections.findIndex((s) => s.id === currentSectionId);
        const nextSection = currentIndex >= 0 && currentIndex < flatSections.length - 1 ? flatSections[currentIndex + 1] : null;
        return {
          id: c.id,
          title: c.title || 'Untitled Course',
          image: c.image || 'https://readdy.ai/api/search-image?query=Professional%20course&width=400&height=250',
          progress: progressPercent,
          lessons: totalLessons ? `${viewedCount}/${totalLessons}` : '0/—',
          timeRemaining: progressPercent >= 100 ? 'Completed' : '—',
          lastAccessed: progress?.lastAccessedAt ? formatLastAccessed(progress.lastAccessedAt) : MOCK_FALLBACK.lastAccessed,
          nextLesson: nextSection ? nextSection.title : (progressPercent >= 100 ? 'Course Completed' : MOCK_FALLBACK.nextLesson),
        };
      })
      .filter(Boolean);
    return visibleCourses;
  }, [courses, enrolledCourseIds, progressByCourse, modulesByCourse, authenticated]);

  // Reset to page 1 when list shrinks
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(myCourses.length / COURSES_PER_PAGE));
    if (page > maxPage) setPage(1);
  }, [myCourses.length, page]);

  const completedCount = myCourses.filter((c) => c.progress === 100).length;
  const certificatesCount = completedCount > 0 ? completedCount : 0;
  const completedCourses = myCourses.filter((c) => c.progress === 100);

  if (coursesLoading) {
    return <LoadingScreen />;
  }

  if (progressLoading && authenticated) {
    return <LoadingScreen />;
  }

  if (!courses?.length) {
    return (
      <DashboardContent>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Iconify icon="solar:graph-up-bold" width={64} sx={{ color: 'text.disabled', mx: 'auto', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            No courses yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Enrolled or available courses will appear here. Check All Courses to get started.
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
              : 'Start learning a course to see your progress here. Visit All Courses to get started.'}
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
                  <Button
                    key={course.id}
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
                      Total Hours
                    </Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    47.5h
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
                    <Iconify icon="solar:target-bold" width={16} sx={{ color: 'warning.main' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Current Streak
                    </Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                    15 days
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            <Card
              sx={{
                p: { xs: 2, md: 3 },
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #3b82f6 0%, #9333ea 50%, #ec4899 100%)',
                color: 'common.white',
                transition: 'transform 0.3s',
                '&:hover': { transform: 'scale(1.05)' },
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: alpha(theme.palette.common.white, 0.1),
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
              <Box sx={{ position: 'relative', zIndex: 10 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Box
                    sx={{
                      width: { xs: 32, md: 40 },
                      height: { xs: 32, md: 40 },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.common.white, 0.2),
                      animation: 'bounce 1s infinite',
                    }}
                  >
                    <Iconify icon="solar:medal-ribbons-star-bold" width={24} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Achievement Unlocked!
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: 'grey.200', mb: { xs: 1.5, md: 2 } }}>
                  You&apos;ve completed 5 AI courses this month
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: { xs: 28, md: 32 },
                      height: { xs: 28, md: 32 },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      bgcolor: 'warning.main',
                      animation: 'spin 3s linear infinite',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                      },
                    }}
                  >
                    <Iconify icon="solar:star-bold" width={14} sx={{ color: 'common.white' }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    +50 XP Bonus!
                  </Typography>
                </Stack>
              </Box>
            </Card>

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
                    background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                >
                  <Iconify icon="solar:target-bold" width={16} sx={{ color: 'common.white' }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Next Milestone
                </Typography>
              </Stack>
              <Box sx={{ mb: 1.5 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={{ xs: 0.5, sm: 0 }}
                  sx={{ mb: 1 }}
                >
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Iconify icon="solar:medal-ribbons-star-bold" width={14} sx={{ color: 'info.main' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      AI Expert Badge
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    8/10 courses
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    width: '100%',
                    height: { xs: 10, md: 12 },
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.grey[500], 0.16),
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <LinearProgress
                    variant="determinate"
                    value={80}
                    sx={{
                      height: '100%',
                      bgcolor: 'transparent',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #3b82f6 0%, #9333ea 100%)',
                        position: 'relative',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          inset: 0,
                          bgcolor: alpha(theme.palette.common.white, 0.3),
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        },
                      },
                    }}
                  />
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: { xs: 1.5, md: 0 }, display: 'block' }}>
                Complete 2 more courses to earn your AI Expert badge
              </Typography>
              <GradientButton
                fullWidth
                size="small"
                icon="solar:arrow-up-bold"
                iconPosition="left"
                sx={{ mt: 1.5 }}
              >
                Level Up Now!
              </GradientButton>
            </Card>
          </Stack>
        </Grid>
      </Grid>
   
  );
}
