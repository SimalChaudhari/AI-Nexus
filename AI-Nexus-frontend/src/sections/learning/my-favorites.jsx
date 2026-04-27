import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import { LoadingScreen } from 'src/components/loading-screen';
import { DashboardContent } from 'src/layouts/dashboard';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useAuthContext } from 'src/auth/hooks';
import { courseService } from 'src/services/course.service';
import { toast } from 'src/components/snackbar';
import Pagination, { paginationClasses } from '@mui/material/Pagination';

// ----------------------------------------------------------------------

const COURSES_PER_PAGE = 8;
const LESSONS_PER_PAGE = 8;
const DEFAULT_COURSE_IMAGE = import.meta.env.VITE_DEFAULT_COURSE_IMAGE || '/assets/images/cover/cover-1.jpg';

const transformCourse = (course) => ({
  id: course.id,
  title: course.title || 'Untitled Course',
  description: course.description || '',
  image: course.image || DEFAULT_COURSE_IMAGE,
  freeOrPaid: course.freeOrPaid,
  amount: course.amount,
  level: course.level || 'Beginner',
  isBundle: course.isBundle ?? false,
  bundleCourseIds: Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds : [],
  isEnrolled: course.isEnrolled ?? false,
  accessViaBundle: course.accessViaBundle ?? false,
  isFavorite: course.isFavorite ?? true, // Favorites tab shows only favorited courses
});

export function MyFavorites() {
  const theme = useTheme();
  const { authenticated } = useAuthContext();
  const [favoriteCourses, setFavoriteCourses] = useState([]);
  const [favoriteSections, setFavoriteSections] = useState([]);
  const [coursePage, setCoursePage] = useState(1);
  const [lessonPage, setLessonPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(new Set());
  const [sectionFavoriteLoading, setSectionFavoriteLoading] = useState(new Set());
  const loadInFlightRef = useRef(false);

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

  if (!authenticated) {
    return (
      <>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Iconify icon="solar:heart-bold" width={64} sx={{ color: 'text.disabled', mx: 'auto', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            Sign in to view favorites
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Sign in to see your favorite courses and access them quickly.
          </Typography>
          <Button
            component={RouterLink}
            to={paths.auth.simple.signIn}
            variant="contained"
            startIcon={<Iconify icon="solar:login-2-bold" width={18} />}
          >
            Sign in
          </Button>
        </Box>
      </>
    );
  }

  if (favoriteCourses.length === 0 && favoriteSections.length === 0) {
    return (
      <>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              width: { xs: 40, md: 48 },
              height: { xs: 40, md: 48 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1.5,
              background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
            }}
          >
            <Iconify icon="solar:heart-bold" width={24} sx={{ color: 'common.white' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              My Favorites
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Courses and lessons you&apos;ve favorited
            </Typography>
          </Box>
        </Stack>

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
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            width: { xs: 40, md: 48 },
            height: { xs: 40, md: 48 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1.5,
            background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
          }}
        >
          <Iconify icon="solar:heart-bold" width={24} sx={{ color: 'common.white' }} />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            My Favorites
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {[
              `${favoriteCourses.length} ${favoriteCourses.length === 1 ? 'course' : 'courses'}`,
              favoriteSections.length > 0
                ? `${favoriteSections.length} ${favoriteSections.length === 1 ? 'lesson' : 'lessons'}`
                : null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </Typography>
        </Box>
      </Stack>

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
          <Grid container spacing={2.5}>
        {(() => {
          const coursePageCount = Math.max(1, Math.ceil(favoriteCourses.length / COURSES_PER_PAGE));
          const displayedCourses = favoriteCourses.slice(
            (coursePage - 1) * COURSES_PER_PAGE,
            coursePage * COURSES_PER_PAGE
          );
          return (
            <>
              {displayedCourses.map((course) => (
          <Grid key={course.id} xs={12} sm={6} md={4} lg={3}>
            <Card
              component={RouterLink}
              to={paths.learningCourse.details(course.id)}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                minHeight: 250,
                boxShadow: theme.customShadows.z4,
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'box-shadow 0.25s ease',
                '&:hover': { boxShadow: theme.customShadows.z16 },
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  height: { xs: 150, sm: 165, md: 155, lg: 145 },
                  bgcolor: 'grey.100',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <Image
                  alt={course.title}
                  src={course.image}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    e.target.src = DEFAULT_COURSE_IMAGE;
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
                  onClick={(e) => handleFavorite(e, course.id)}
                  disabled={favoriteLoading.has(course.id)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: alpha(theme.palette.common.white, 0.98),
                    color: 'error.main',
                    boxShadow: theme.shadows[6],
                    border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
                    '&:hover': { bgcolor: 'common.white' },
                    opacity: favoriteLoading.has(course.id) ? 0.6 : 1,
                  }}
                  aria-label="Remove from favorites"
                >
                  <Iconify icon="solar:heart-bold" width={22} />
                </IconButton>
              </Box>
              <Box sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 96 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    fontSize: { xs: '1rem', md: '0.98rem' },
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.4,
                    mb: 0.75,
                    height: '2.8em',
                    wordBreak: 'break-word',
                  }}
                >
                  {course.title}
                </Typography>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                    <Typography
                      variant="caption"
                      sx={{
                        color: course.freeOrPaid
                          ? course.isEnrolled
                            ? 'text.disabled'
                            : 'secondary.main'
                          : 'success.main',
                        fontWeight: 500,
                        fontSize: { xs: '0.82rem', md: '0.85rem' },
                        textDecoration:
                          course.freeOrPaid && course.isEnrolled ? 'line-through' : 'none',
                      }}
                    >
                      {course.freeOrPaid ? `${Number(course.amount || 0).toFixed(2)} SGD` : 'Free'}
                    </Typography>
                    {course.freeOrPaid && course.isEnrolled && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Iconify
                          icon="solar:verified-check-bold"
                          width={14}
                          sx={{ color: 'success.main' }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'success.main',
                            fontWeight: 600,
                            fontSize: { xs: '0.78rem', md: '0.82rem' },
                          }}
                        >
                          {course.accessViaBundle ? 'Included in bundle' : 'Purchased'}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {course.level || 'Beginner'}
                  </Typography>
                </Stack>
              </Box>
            </Card>
          </Grid>
              ))}
              {coursePageCount > 1 && (
                <Grid xs={12} sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={coursePageCount}
                    page={coursePage}
                    onChange={(_, value) => setCoursePage(value)}
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
    </>
  );
}
