import { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Unstable_Grid2';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';

import { fDate } from 'src/utils/format-time';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';

import { speakerService } from 'src/services/speaker.service';
import { courseService } from 'src/services/course.service';
import { getSpeakerReviews } from 'src/services/review.service';
import { useAuthContext } from 'src/auth/hooks';
import { RichTextContent } from 'src/components/html-content';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export function LearningInstructorDetailsView({ id }) {
  const theme = useTheme();
  const { authenticated } = useAuthContext();
  const [speaker, setSpeaker] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState(new Set());
  const [speakerReviewStats, setSpeakerReviewStats] = useState({ averageRating: 0, reviewCount: 0 });
  const [speakerReviews, setSpeakerReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('courses');

  const ratingDistribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    speakerReviews.forEach((r) => {
      const star = Math.round(Number(r.rating));
      if (star >= 1 && star <= 5) counts[star] += 1;
    });
    return [5, 4, 3, 2, 1].map((star) => ({
      name: `${star} Star`,
      starCount: counts[star],
      reviewCount: counts[star],
    }));
  }, [speakerReviews]);

  const ratingDistributionTotal = useMemo(
    () => ratingDistribution.reduce((acc, r) => acc + r.reviewCount, 0),
    [ratingDistribution]
  );

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const [speakerData, allCourses] = await Promise.all([
          speakerService.getById(id),
          courseService.getAllCourses(),
        ]);
        if (mounted) {
          setSpeaker(speakerData);
          const instructorCourses = (allCourses || []).filter(
            (c) => Array.isArray(c.speakerIds) && c.speakerIds.includes(id)
          );
          setCourses(instructorCourses);

          // Initialize favorites from course data if authenticated
          if (authenticated && instructorCourses.length > 0) {
            const favoriteSet = new Set();
            instructorCourses.forEach((course) => {
              if (course.isFavorite === true || course.isFavorite === 'true') {
                favoriteSet.add(course.id);
              }
            });
            setFavorites(favoriteSet);
          }
        }
      } catch (err) {
        if (mounted) {
          setSpeaker(null);
          setCourses([]);
          setError(err?.message || 'Failed to load instructor');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [id, authenticated]);

  useEffect(() => {
    if (!id) {
      setSpeakerReviewStats({ averageRating: 0, reviewCount: 0 });
      setSpeakerReviews([]);
      return undefined;
    }
    let cancelled = false;
    setReviewsLoading(true);
    getSpeakerReviews(id)
      .then((reviews) => {
        if (cancelled) return;
        const count = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
        const average = count > 0 ? Math.min(5, Math.max(0, sum / count)) : 0;
        setSpeakerReviewStats({ averageRating: average, reviewCount: count });
        setSpeakerReviews(Array.isArray(reviews) ? reviews : []);
      })
      .catch(() => {
        if (!cancelled) {
          setSpeakerReviewStats({ averageRating: 0, reviewCount: 0 });
          setSpeakerReviews([]);
        }
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const handleToggleFavorite = async (e, courseId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authenticated) {
      toast.info('Please sign in to favorite courses');
      return;
    }

    // Optimistic update
    const wasFavorite = favorites.has(courseId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
    setFavoriteLoading((prev) => new Set(prev).add(courseId));

    try {
      const result = await courseService.toggleCourseFavorite(courseId);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (result.isFavorite) next.add(courseId);
        else next.delete(courseId);
        return next;
      });
      toast.success(result.isFavorite ? 'Course added to favorites' : 'Course removed from favorites');
    } catch (err) {
      // Revert optimistic update on error
      setFavorites((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(courseId);
        else next.delete(courseId);
        return next;
      });
      toast.error(err?.response?.data?.message || 'Failed to update favorite');
    } finally {
      setFavoriteLoading((prev) => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !speaker) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Instructor not found"
          description={error}
          action={
            <Button
              component={RouterLink}
              href={paths.learning}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to Courses
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  const courseCount = courses.length;

  return (
    <DashboardContent>
      <Helmet>
        <title>{speaker.name} | Speaker&apos;s Profile | {CONFIG.site.name}</title>
      </Helmet>
      <CustomBreadcrumbs
        heading="Speaker's Profile"
        links={[
          { name: 'Home', href: paths.home },
          { name: 'Learning', href: paths.learning },
          { name: speaker.name },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.learning}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={16} />}
            variant="outlined"
          >
            Back to Courses
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card
        sx={{
          p: { xs: 2, md: 4 },
          borderRadius: 2,
          boxShadow: theme.customShadows.z8,
        }}
      >
        {/* Speaker info: avatar + name */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Avatar
            src={speaker.profileimage}
            alt={speaker.name}
            sx={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              flexShrink: 0,
            }}
          />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {speaker.name}
          </Typography>
        </Stack>

        {/* About */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            About
          </Typography>
          {speaker.about ? (
            <RichTextContent
              html={speaker.about}
              sx={{ typography: 'body1', color: 'text.secondary', lineHeight: 1.7 }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No description provided.
            </Typography>
          )}
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { minHeight: 48, fontWeight: 600 },
          }}
        >
          <Tab value="courses" label="Courses" icon={<Iconify icon="solar:play-circle-bold" width={18} sx={{ mr: 0.5 }} />} iconPosition="start" />
          <Tab value="reviews" label="Reviews" icon={<Iconify icon="solar:chat-round-dots-bold" width={18} sx={{ mr: 0.5 }} />} iconPosition="start" />
        </Tabs>

        {activeTab === 'courses' && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Courses ({courseCount})
            </Typography>
            {courseCount > 0 ? (
              <Grid container spacing={2}>
                {courses.map((course) => (
                  <Grid key={course.id} xs={12} sm={6} md={3}>
                    <Card
                      component={RouterLink}
                      href={paths.learningCourse.details(course.id)}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2,
                        overflow: 'hidden',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'box-shadow 0.3s ease',
                        '&:hover': {
                          boxShadow: theme.customShadows.z12,
                        },
                      }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        <Image
                          alt={course.title}
                          src={course.image || ''}
                          sx={{
                            width: '100%',
                            height: 160,
                            objectFit: 'cover',
                            objectPosition: 'top',
                          }}
                        />
                        {authenticated && (
                          <IconButton
                            size="small"
                            onClick={(e) => handleToggleFavorite(e, course.id)}
                            disabled={favoriteLoading.has(course.id)}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              bgcolor: 'background.paper',
                              color: favorites.has(course.id) ? 'error.main' : 'text.secondary',
                              '&:hover': { bgcolor: 'action.hover' },
                              opacity: favoriteLoading.has(course.id) ? 0.6 : 1,
                            }}
                          >
                            <Iconify
                              icon={favorites.has(course.id) ? 'solar:heart-bold' : 'solar:heart-outline'}
                              width={20}
                            />
                          </IconButton>
                        )}
                      </Box>
                      <Stack spacing={1} sx={{ p: 2, flex: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {course.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {course.level || 'Beginner'}
                        </Typography>
                      </Stack>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No courses yet.
              </Typography>
            )}
          </Box>
        )}

        {activeTab === 'reviews' && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Reviews {speakerReviewStats.reviewCount > 0 ? `(${speakerReviewStats.reviewCount})` : ''}
          </Typography>
          {reviewsLoading ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Loading reviews...
            </Typography>
          ) : (
            <>
              <Box
                display="grid"
                gridTemplateColumns={{ xs: '1fr', md: 'auto 1fr' }}
                gap={{ xs: 2, md: 3 }}
                alignItems="center"
                sx={{ py: 2 }}
              >
                <Stack spacing={1} alignItems="center" justifyContent="center">
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    Average rating
                  </Typography>
                  <Typography variant="h2" sx={{ lineHeight: 1 }}>
                    {speakerReviewStats.averageRating > 0 ? Number(speakerReviewStats.averageRating).toFixed(1) : '0'}/5
                  </Typography>
                  <Rating
                    readOnly
                    value={speakerReviewStats.averageRating}
                    precision={0.1}
                    size="medium"
                    sx={{ '& .MuiRating-iconFilled': { color: 'warning.main' } }}
                  />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ({speakerReviewStats.reviewCount} review{speakerReviewStats.reviewCount !== 1 ? 's' : ''})
                  </Typography>
                </Stack>

                <Stack spacing={1.5} sx={{ px: { md: 3 }, borderLeft: { md: `dashed 1px ${theme.palette.divider}` } }}>
                  {ratingDistribution.map((r) => (
                    <Stack key={r.name} direction="row" alignItems="center" spacing={2}>
                      <Typography variant="subtitle2" component="span" sx={{ width: 56 }}>
                        {r.name}
                      </Typography>
                      <LinearProgress
                        color="inherit"
                        variant="determinate"
                        value={ratingDistributionTotal > 0 ? (r.reviewCount / ratingDistributionTotal) * 100 : 0}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 1, bgcolor: 'grey.200' }}
                      />
                      <Typography variant="body2" component="span" sx={{ minWidth: 32, color: 'text.secondary' }}>
                        {r.reviewCount}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              <Divider sx={{ borderStyle: 'dashed', my: 2 }} />

              {speakerReviews.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 3 }}>
                  No reviews yet. Be the first to review this speaker.
                </Typography>
              ) : (
                <Stack spacing={3} sx={{ pt: 1 }}>
                  {speakerReviews.map((review) => {
                    const revUser = review.user || {};
                    const name = [revUser.firstname, revUser.lastname].filter(Boolean).join(' ') || revUser.username || 'User';
                    const initials = name.slice(0, 2).toUpperCase();
                    return (
                      <Stack
                        key={review.id}
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        sx={{ py: 2 }}
                      >
                        <Stack
                          direction={{ xs: 'row', md: 'column' }}
                          spacing={2}
                          alignItems="center"
                          sx={{ width: { md: 200 }, flexShrink: 0 }}
                        >
                          <Avatar
                            sx={{
                              width: { xs: 48, md: 56 },
                              height: { xs: 48, md: 56 },
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                            }}
                          >
                            {initials}
                          </Avatar>
                          <Stack alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap>
                              {name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {review.createdAt ? fDate(review.createdAt) : ''}
                            </Typography>
                          </Stack>
                        </Stack>
                        <Stack spacing={1} flexGrow={1} sx={{ minWidth: 0 }}>
                          <Rating
                            size="small"
                            value={Number(review.rating)}
                            precision={0.1}
                            readOnly
                            sx={{ '& .MuiRating-iconFilled': { color: 'warning.main' } }}
                          />
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {review.feedback?.trim() || 'No review added by user.'}
                          </Typography>
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </>
          )}
        </Box>
        )}

      </Card>
    </DashboardContent>
  );
}
