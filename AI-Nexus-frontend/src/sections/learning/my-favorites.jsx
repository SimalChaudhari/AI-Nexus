import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Pagination, { paginationClasses } from '@mui/material/Pagination';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import { LoadingScreen } from 'src/components/loading-screen';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useAuthContext } from 'src/auth/hooks';
import { useCheckoutContext } from 'src/sections/checkout/context';
import { courseService } from 'src/services/course.service';
import { toast } from 'src/components/snackbar';
import { getCourseDefaultImage } from 'src/utils/course-default-image';
import { LearningGuestSignInPrompt } from './components/learning-guest-sign-in-prompt';
import { LearningSectionHeader } from './components/learning-section-header';
import { LearningCourseGridCard } from './components/learning-course-grid-card';
import { MembershipSignupDialog } from './components/membership-signup-dialog';

// ----------------------------------------------------------------------

const COURSES_PER_PAGE = 8;
const LESSONS_PER_PAGE = 8;
const DEFAULT_COURSE_IMAGE = getCourseDefaultImage();

const normalizeFavoriteCourse = (course, defaultCourseImage = DEFAULT_COURSE_IMAGE) => ({
  ...course,
  id: course.id,
  title: course.title || 'Untitled Course',
  description: course.description || '',
  image: course.image || defaultCourseImage,
  freeOrPaid: course.freeOrPaid,
  amount: course.amount,
  level: course.level || 'Beginner',
  isFavorite: true,
  isBundle: course.isBundle ?? false,
  bundleCourseIds: Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds : [],
  isRecommended: course.isRecommended ?? false,
  isEnrolled: course.isEnrolled ?? false,
  accessViaBundle: course.accessViaBundle ?? false,
  reviewStats: {
    averageRating: Number(course?.reviewStats?.averageRating || 0),
    reviewCount: Number(course?.reviewStats?.reviewCount || 0),
  },
  createdAt: course.createdAt || null,
  updatedAt: course.updatedAt || null,
  goals: Array.isArray(course.goals) ? course.goals : [],
  languages: Array.isArray(course.languages) ? course.languages : [],
  modulesCount: Number(course.modulesCount ?? course.moduleCount ?? 0),
  sectionsCount: Number(course.sectionsCount ?? course.sectionCount ?? 0),
});

const getCourseContentMeta = (course = {}) => {
  const modulesCount = Number(course.modulesCount ?? course.moduleCount ?? 0);
  const sectionsCount = Number(course.sectionsCount ?? course.sectionCount ?? 0);

  return {
    moduleCount: Number.isFinite(modulesCount) && modulesCount > 0 ? modulesCount : 0,
    sectionCount: Number.isFinite(sectionsCount) && sectionsCount > 0 ? sectionsCount : 0,
  };
};

const getCourseProgressStatus = (status, courseProgress) => {
  if (status === 'completed' || courseProgress >= 100) return { label: 'Completed', color: 'success' };
  if (status === 'in_progress' || courseProgress > 0) return { label: 'In Progress', color: 'warning' };
  return { label: 'Not Started', color: 'default' };
};

export function MyFavorites() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { authenticated } = useAuthContext();
  const checkout = useCheckoutContext();
  const [favoriteCourses, setFavoriteCourses] = useState([]);
  const [favoriteSections, setFavoriteSections] = useState([]);
  const [coursePage, setCoursePage] = useState(1);
  const [lessonPage, setLessonPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(new Set());
  const [sectionFavoriteLoading, setSectionFavoriteLoading] = useState(new Set());
  const [courseProgressById, setCourseProgressById] = useState({});
  const [membershipSignupOpen, setMembershipSignupOpen] = useState(false);
  const loadInFlightRef = useRef(false);

  const isInCart = (id) => checkout.items.some((item) => item.id === id);
  const enrolledCourseIds = useMemo(
    () => new Set(favoriteCourses.filter((course) => course.isEnrolled).map((course) => course.id)),
    [favoriteCourses]
  );
  const isEnrolled = (id) => enrolledCourseIds.has(id);
  const getCourseDetailsPath = (id) => paths.learningCourse.details(id);
  const getCourseLearnPath = (id) => paths.learningCourse.learn(id);

  const displayCourses = useMemo(
    () => favoriteCourses.map((course) => normalizeFavoriteCourse(course, DEFAULT_COURSE_IMAGE)),
    [favoriteCourses]
  );
  const coursePageCount = Math.max(1, Math.ceil(displayCourses.length / COURSES_PER_PAGE));
  const paginatedCourses = displayCourses.slice(
    (coursePage - 1) * COURSES_PER_PAGE,
    coursePage * COURSES_PER_PAGE
  );

  const handleCourseImageClick = (event, course) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(isEnrolled(course.id) ? getCourseLearnPath(course.id) : getCourseDetailsPath(course.id));
  };

  const handleGoToDetails = (event, courseId) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(getCourseDetailsPath(courseId));
  };

  const handleAddToCartClick = (event, course) => {
    event.preventDefault();
    event.stopPropagation();

    if (isEnrolled(course.id)) return;
    if (!authenticated) {
      setMembershipSignupOpen(true);
      return;
    }

    if (!isInCart(course.id)) {
      checkout.onAddToCart({
        id: course.id,
        name: course.title,
        coverUrl: course.image || '',
        price: Number(course.amount) || 0,
        quantity: 1,
      });
      toast.success('Added to cart');
      return;
    }
    toast.info('Already in cart');
  };

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const { courses, favoriteSections: sections } = await courseService.getFavoritesAll();
      setFavoriteCourses(courses);
      setFavoriteSections(sections || []);
    } catch (error) {
      console.error('Error loading favorite courses:', error);
      setFavoriteCourses([]);
      setFavoriteSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      return;
    }
    // Guard: avoid duplicate call when effect runs twice (e.g. React Strict Mode)
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    loadFavorites().finally(() => {
      loadInFlightRef.current = false;
    });
  }, [authenticated]);

  useEffect(() => {
    let active = true;
    if (!authenticated) {
      setCourseProgressById({});
      return () => {
        active = false;
      };
    }
    const loadProgressOverview = async () => {
      try {
        const rows = await courseService.getMyProgressOverview();
        if (!active) return;
        const nextProgressMap = (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
          const courseId = row?.course?.id ? String(row.course.id) : '';
          if (!courseId) return acc;
          const progress = row?.progress && typeof row.progress === 'object' ? row.progress : {};
          acc[courseId] = {
            completionPercent: Math.max(0, Math.min(100, Number(progress.completionPercent ?? 0))),
            status: String(progress.status || '').toLowerCase(),
          };
          return acc;
        }, {});
        setCourseProgressById(nextProgressMap);
      } catch (_error) {
        if (active) setCourseProgressById({});
      }
    };
    loadProgressOverview();
    return () => {
      active = false;
    };
  }, [authenticated, favoriteCourses.length]);

  // Reset to page 1 when list length shrinks (e.g. after removing a favorite)
  useEffect(() => {
    const maxCoursePage = Math.max(1, Math.ceil(favoriteCourses.length / COURSES_PER_PAGE));
    if (coursePage > maxCoursePage) setCoursePage(1);
  }, [favoriteCourses.length, coursePage]);
  useEffect(() => {
    const maxLessonPage = Math.max(1, Math.ceil(favoriteSections.length / LESSONS_PER_PAGE));
    if (lessonPage > maxLessonPage) setLessonPage(1);
  }, [favoriteSections.length, lessonPage]);

  const handleFavorite = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authenticated) {
      toast.info('Please sign in to favorite courses');
      return;
    }

    // Optimistic update
    setFavoriteCourses((prev) => prev.filter((course) => course.id !== id));
    setFavoriteLoading((prev) => new Set(prev).add(id));

    try {
      const result = await courseService.toggleCourseFavorite(id);
      if (result.isFavorite) {
        loadFavorites();
      }
    } catch (error) {
      loadFavorites();
      toast.error(error?.response?.data?.message || 'Failed to update favorite');
    } finally {
      setFavoriteLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleSectionFavorite = async (e, sectionId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authenticated) {
      toast.info('Please sign in to favorite lessons');
      return;
    }

    // Optimistic update
    setFavoriteSections((prev) => prev.filter((section) => section.id !== sectionId));
    setSectionFavoriteLoading((prev) => new Set(prev).add(sectionId));

    try {
      const result = await courseService.toggleSectionFavorite(sectionId);
      if (result.isFavorite) {
        loadFavorites();
      }
      toast.success(result.isFavorite ? 'Lesson added to favorites' : 'Lesson removed from favorites');
    } catch (error) {
      loadFavorites();
      toast.error(error?.response?.data?.message || 'Failed to update favorite');
    } finally {
      setSectionFavoriteLoading((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  // Guest: shared Learning guest prompt (same layout as Progress / Certificates).
  if (!authenticated) {
    return <LearningGuestSignInPrompt variant="favorites" />;
  }

  if (favoriteCourses.length === 0 && favoriteSections.length === 0) {
    return (
      <>
        <LearningSectionHeader
          icon="solar:heart-bold"
          iconGradient="linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)"
          title="My Favorites"
          subtitle="Courses and lessons you've favorited"
        />

        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Iconify icon="solar:heart-outline" width={64} sx={{ color: 'text.disabled', mx: 'auto', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            No favorites yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Start favoriting courses and lessons you&apos;re interested in. Click the heart icon to add them to your favorites.
          </Typography>
          <Button
            component={RouterLink}
            to={paths.learning}
            variant="contained"
            startIcon={<Iconify icon="solar:book-bold" width={18} />}
          >
            Browse Courses
          </Button>
        </Box>
      </>
    );
  }

  return (
    <>
      <LearningSectionHeader
        icon="solar:heart-bold"
        iconGradient="linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)"
        title="My Favorites"
        subtitle={[
          `${favoriteCourses.length} ${favoriteCourses.length === 1 ? 'course' : 'courses'}`,
          favoriteSections.length > 0
            ? `${favoriteSections.length} ${favoriteSections.length === 1 ? 'lesson' : 'lessons'}`
            : null,
        ]
          .filter(Boolean)
          .join(' • ')}
      />

      {/* Course(s) Section */}
      {favoriteCourses.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.75 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                whiteSpace: 'nowrap',
                letterSpacing: 0.2,
                fontSize: { xs: '1.08rem', md: '1.2rem' },
              }}
            >
              Course(s)
            </Typography>
            <Box
              sx={{
                flexGrow: 1,
                height: 2,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.7)} 0%, ${alpha(theme.palette.primary.main, 0.18)} 100%)`,
              }}
            />
          </Stack>
          <Box sx={{ position: 'relative', pt: 1.25, px: 0.5, overflow: 'visible' }}>
            <Grid
              container
              spacing={{ xs: 1.75, sm: 1.5, md: 2 }}
              columns={{ xs: 2, sm: 2, md: 4, lg: 4, xl: 4 }}
              sx={{ overflow: 'visible' }}
            >
              {paginatedCourses.map((course) => {
                const { moduleCount, sectionCount } = getCourseContentMeta(course);
                const progressRow = courseProgressById[course.id] || {};
                const courseProgress = Number.isFinite(progressRow.completionPercent)
                  ? progressRow.completionPercent
                  : 0;
                const showCourseProgress = authenticated && (!course.freeOrPaid || isEnrolled(course.id));
                const progressStatus = getCourseProgressStatus(progressRow.status, courseProgress);

                return (
                  <Grid key={course.id} xs={1} sx={{ overflow: 'visible', display: 'flex' }}>
                    <LearningCourseGridCard
                      course={course}
                      defaultCourseImage={DEFAULT_COURSE_IMAGE}
                      groupKey="favorites"
                      moduleCount={moduleCount}
                      sectionCount={sectionCount}
                      showCourseProgress={showCourseProgress}
                      courseProgress={courseProgress}
                      progressStatus={progressStatus}
                      isFavorite
                      favoriteLoading={favoriteLoading.has(course.id)}
                      isEnrolled={isEnrolled(course.id)}
                      isInCart={isInCart(course.id)}
                      detailsHref={getCourseDetailsPath(course.id)}
                      onImageClick={handleCourseImageClick}
                      onFavorite={handleFavorite}
                      onAddToCart={handleAddToCartClick}
                      onViewDetails={handleGoToDetails}
                    />
                  </Grid>
                );
              })}
            </Grid>
            {coursePageCount > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Pagination
                  count={coursePageCount}
                  page={coursePage}
                  onChange={(_, value) => setCoursePage(value)}
                  color="primary"
                  shape="rounded"
                  showFirstButton
                  showLastButton
                  sx={{
                    [`& .${paginationClasses.ul}`]: { justifyContent: 'flex-end' },
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Lesson(s) Section */}
      {favoriteSections.length > 0 && (
        <Box sx={{ mt: favoriteCourses.length > 0 ? 4 : 0 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.75 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                whiteSpace: 'nowrap',
                letterSpacing: 0.2,
                fontSize: { xs: '1.08rem', md: '1.2rem' },
              }}
            >
              Lesson(s)
            </Typography>
            <Box
              sx={{
                flexGrow: 1,
                height: 2,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.7)} 0%, ${alpha(theme.palette.primary.main, 0.18)} 100%)`,
              }}
            />
          </Stack>
          <Grid container spacing={2.5}>
            {(() => {
              const lessonPageCount = Math.max(1, Math.ceil(favoriteSections.length / LESSONS_PER_PAGE));
              const displayedSections = favoriteSections.slice(
                (lessonPage - 1) * LESSONS_PER_PAGE,
                lessonPage * LESSONS_PER_PAGE
              );
              return (
                <>
                  {displayedSections.map((section) => (
              <Grid key={section.id} xs={12} sm={6} md={4} lg={3}>
                <Card
                  component={RouterLink}
                  to={paths.learningCourse.learn(section.courseId, section.id)}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    boxShadow: theme.customShadows.z4,
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'box-shadow 0.25s ease',
                    '&:hover': { boxShadow: theme.customShadows.z16 },
                  }}
                >
                  <Box sx={{ position: 'relative', aspectRatio: '16/10' }}>
                    <Image
                      alt={section.title}
                      src={section.courseImage || 'https://readdy.ai/api/search-image?query=Professional%20learning%20course&width=400&height=250&orientation=landscape'}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        e.target.src = 'https://readdy.ai/api/search-image?query=Professional%20learning%20course&width=400&height=250&orientation=landscape';
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.common.black, 0.2),
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 1 },
                      }}
                    >
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          bgcolor: alpha(theme.palette.common.white, 0.9),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Iconify icon="solar:play-bold" width={28} sx={{ color: 'primary.main', ml: 0.5 }} />
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleSectionFavorite(e, section.id)}
                      disabled={sectionFavoriteLoading.has(section.id)}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: alpha(theme.palette.common.white, 0.9),
                        color: 'error.main',
                        '&:hover': { bgcolor: 'common.white' },
                        opacity: sectionFavoriteLoading.has(section.id) ? 0.6 : 1,
                      }}
                      aria-label="Remove from favorites"
                    >
                      <Iconify icon="solar:heart-bold" width={22} />
                    </IconButton>
                  </Box>
                  <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        mb: 0.5,
                        fontWeight: 500,
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {section.courseTitle}
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                      }}
                    >
                      {section.title}
                    </Typography>
                    {section.moduleTitle && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          mt: 0.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        Module: {section.moduleTitle}
                      </Typography>
                    )}
                  </Box>
                </Card>
              </Grid>
                  ))}
                  {lessonPageCount > 1 && (
                    <Grid xs={12} sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Pagination
                        count={lessonPageCount}
                        page={lessonPage}
                        onChange={(_, value) => setLessonPage(value)}
                        color="primary"
                        shape="rounded"
                        showFirstButton
                        showLastButton
                        sx={{
                          [`& .${paginationClasses.ul}`]: { justifyContent: 'center' },
                        }}
                      />
                    </Grid>
                  )}
                </>
              );
            })()}
          </Grid>
        </Box>
      )}

      <MembershipSignupDialog
        open={membershipSignupOpen}
        onClose={() => setMembershipSignupOpen(false)}
        entrySource="learning-favorites"
      />
    </>
  );
}
