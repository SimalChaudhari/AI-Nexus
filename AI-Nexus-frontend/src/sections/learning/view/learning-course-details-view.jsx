import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Rating from '@mui/material/Rating';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import { alpha, useTheme } from '@mui/material/styles';

import { fDate } from 'src/utils/format-time';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import { courseService } from 'src/services/course.service';
import { getCourseReviews } from 'src/services/review.service';
import { speakerService } from 'src/services/speaker.service';
import { useAuthContext } from 'src/auth/hooks';
import { toast } from 'src/components/snackbar';
import { htmlToPlainText } from 'src/utils/html-plain-text';
import { useCheckoutContext } from 'src/sections/checkout/context';
import { downloadMyCourseReceiptPdf } from 'src/services/order.service';

import { LearningBundleHighlight } from '../components/course-bundle-badge';

// ----------------------------------------------------------------------

const formatPrice = (freeOrPaid, amount) => {
  if (!freeOrPaid) return 'Free';
  return `${Number(amount || 0).toFixed(2)} SGD`;
};

const isPaidCourse = (value) => value === true || value === 'true' || value === 1 || value === '1';
const DEFAULT_COURSE_IMAGE = import.meta.env.VITE_DEFAULT_COURSE_IMAGE || '/assets/images/cover/cover-1.jpg';

// Parse description into synopsis and bullet points (plain text from HTML or legacy text)
const getOverviewContent = (course) => {
  const raw = course.description || '';
  const desc = htmlToPlainText(raw);
  const paragraphs = desc.split(/\n\n+/).filter(Boolean);
  const synopsis = paragraphs[0] || (desc.trim() ? desc : 'No synopsis available.');
  const remainder = paragraphs.slice(1).join('\n\n').trim();
  const topics = remainder ? remainder.split(/[•\n-]/).map((s) => s.trim()).filter(Boolean) : [];
  const plainDesc = desc;
  return { synopsis, topics, remainder, plainDesc };
};

// Parse marketData (may be JSON string) for CPE hours / lesson count
const parseMarketData = (marketData) => {
  if (!marketData || typeof marketData !== 'string') return {};
  try {
    const parsed = JSON.parse(marketData);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

export function LearningCourseDetailsView({ course, loading, error }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { authenticated } = useAuthContext();
  const checkout = useCheckoutContext();

  const isInCart = (id) => checkout.items.some((item) => item.id === id);
  const addCourseToCart = (c) => {
    checkout.onAddToCart({
      id: c.id,
      name: c.title,
      coverUrl: c.image || '',
      price: Number(c.amount) || 0,
      quantity: 1,
    });
  };
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [courseModules, setCourseModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [accessViaBundle, setAccessViaBundle] = useState(false);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [courseReviewStats, setCourseReviewStats] = useState({ averageRating: 0, reviewCount: 0 });
  const [courseReviews, setCourseReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [bundleIncludedCourses, setBundleIncludedCourses] = useState([]);
  const [bundleIncludedLoading, setBundleIncludedLoading] = useState(false);
  const [receiptDownloading, setReceiptDownloading] = useState(false);

  // Fetch speakers for labels
  useEffect(() => {
    let cancelled = false;
    Promise.all([speakerService.getAll()])
      .then(([speakerList]) => {
        if (!cancelled) {
          setSpeakers(speakerList || []);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const speakerMap = useMemo(() => Object.fromEntries((speakers || []).map((s) => [s.id, s])), [speakers]);

  // Check if course is favorited
  useEffect(() => {
    if (!course?.id || !authenticated) {
      setIsFavorite(false);
      return undefined;
    }
    let cancelled = false;
    courseService
      .getCourseFavoriteStatus(course.id)
      .then((data) => {
        if (!cancelled) {
          setIsFavorite(data?.isFavorite ?? false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsFavorite(false);
        }
      });
    return () => { cancelled = true; };
  }, [course?.id, authenticated]);

  // Check if user is enrolled (direct purchase, free enroll, or via an owned bundle)
  useEffect(() => {
    if (!course?.id || !authenticated) {
      setIsEnrolled(false);
      setAccessViaBundle(false);
      return undefined;
    }
    let cancelled = false;
    setEnrolledLoading(true);
    setAccessViaBundle(Boolean(course.accessViaBundle));
    courseService
      .getCourseEnrolled(course.id)
      .then((result) => {
        if (!cancelled) {
          setIsEnrolled(Boolean(result?.enrolled));
          setAccessViaBundle(Boolean(result?.accessViaBundle));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsEnrolled(false);
          setAccessViaBundle(false);
        }
      })
      .finally(() => {
        if (!cancelled) setEnrolledLoading(false);
      });
    return () => { cancelled = true; };
  }, [course?.id, course?.accessViaBundle, authenticated]);

  // Fetch course review stats from reviews table (isCourse: true, courseId = course.id)
  useEffect(() => {
    if (!course?.id) {
      setCourseReviewStats({ averageRating: 0, reviewCount: 0 });
      return undefined;
    }
    let cancelled = false;
    setReviewsLoading(true);
    getCourseReviews(course.id)
      .then((reviews) => {
        if (cancelled) return;
        const count = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
        const average = count > 0 ? Math.min(5, Math.max(0, sum / count)) : 0;
        setCourseReviewStats({ averageRating: average, reviewCount: count });
        setCourseReviews(Array.isArray(reviews) ? reviews : []);
      })
      .catch(() => {
        if (!cancelled) {
          setCourseReviewStats({ averageRating: 0, reviewCount: 0 });
          setCourseReviews([]);
        }
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => { cancelled = true; };
  }, [course?.id]);

  // Initialize favorite status from course data
  useEffect(() => {
    if (course?.isFavorite !== undefined) {
      setIsFavorite(course.isFavorite);
    }
  }, [course?.isFavorite]);

  // Fetch all courses for related section (exclude current, same level first, max 4)
  useEffect(() => {
    if (!course?.id) return undefined;
    let cancelled = false;
    courseService
      .getAllCourses()
      .then((list) => {
        if (cancelled) return;
        const others = (list || []).filter((c) => c.id !== course.id);
        const sameLevel = others.filter((c) => (c.level || '').toLowerCase() === (course.level || '').toLowerCase());
        const rest = others.filter((c) => !sameLevel.some((s) => s.id === c.id));
        const combined = [...sameLevel, ...rest].slice(0, 4);
        setRelatedCourses(combined);
      })
      .catch(() => setRelatedCourses([]));
    return () => { cancelled = true; };
  }, [course?.id, course?.level]);

  // Fetch course modules and sections for curriculum tab
  useEffect(() => {
    if (!course?.id) return undefined;
    let cancelled = false;
    setModulesLoading(true);
    courseService
      .getCourseModulesWithSections(course.id)
      .then((modules) => {
        if (!cancelled) {
          setCourseModules(modules || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCourseModules([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setModulesLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [course?.id]);

  // Resolve titles & covers for bundled course IDs (order preserved)
  useEffect(() => {
    const ids =
      course?.isBundle && Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds : [];
    if (ids.length === 0) {
      setBundleIncludedCourses([]);
      return undefined;
    }
    let cancelled = false;
    setBundleIncludedLoading(true);
    Promise.all(ids.map((id) => courseService.getCourseById(id).catch(() => null)))
      .then((results) => {
        if (cancelled) return;
        const byId = Object.fromEntries(results.filter(Boolean).map((c) => [c.id, c]));
        setBundleIncludedCourses(ids.map((id) => byId[id]).filter(Boolean));
      })
      .finally(() => {
        if (!cancelled) setBundleIncludedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [course?.id, course?.isBundle, course?.bundleCourseIds]);

  const scrollToBundlePrograms = () => {
    document.getElementById('bundle-included')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleFavorite = async () => {
    if (!authenticated) {
      toast.info('Please sign in to favorite courses');
      return;
    }

    if (!course?.id) return;

    // Optimistic update
    const wasFavorite = isFavorite;
    setIsFavorite(!wasFavorite);
    setFavoriteLoading(true);

    try {
      const result = await courseService.toggleCourseFavorite(course.id);
      setIsFavorite(result.isFavorite);
      toast.success(result.isFavorite ? 'Course added to favorites' : 'Course removed from favorites');
    } catch (err) {
      // Revert optimistic update on error
      setIsFavorite(wasFavorite);
      toast.error(err?.response?.data?.message || 'Failed to update favorite');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleDownloadMyReceipt = async () => {
    if (!course?.id || !authenticated) return;
    try {
      setReceiptDownloading(true);
      const blob = await downloadMyCourseReceiptPdf(course.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${String(course.title || course.id).replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Receipt not available for this course');
    } finally {
      setReceiptDownloading(false);
    }
  };

  const ratingDistribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    courseReviews.forEach((r) => {
      const star = Math.round(Number(r.rating));
      if (star >= 1 && star <= 5) counts[star] += 1;
    });
    return [5, 4, 3, 2, 1].map((star) => ({
      name: `${star} Star`,
      starCount: counts[star],
      reviewCount: counts[star],
    }));
  }, [courseReviews]);

  const ratingDistributionTotal = useMemo(
    () => ratingDistribution.reduce((acc, r) => acc + r.reviewCount, 0),
    [ratingDistribution]
  );

  if (loading) {
    return (
      <DashboardContent sx={{ minHeight: 'calc(100vh - 160px)' }}>
        <LoadingScreen sx={{ minHeight: '100%' }} />
      </DashboardContent>
    );
  }

  if (error || !course) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Course not found!"
          action={
            <Button
              component={RouterLink}
              to={paths.learning}
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

  const paidCourse = isPaidCourse(course.freeOrPaid);
  const price = formatPrice(paidCourse, course.amount);
  const { synopsis, topics, remainder, plainDesc } = getOverviewContent(course);
  const courseCode = course.id ? `ACC ${String(course.id).slice(0, 6).toUpperCase()}` : '—';
  const market = parseMarketData(course.marketData);
  const lessonCount = market.lessonCount ?? market.lessons ?? '—';
  const cpeHoursRaw = market.cpeHours ?? market.cpe ?? market.hours;
  const cpeHours = cpeHoursRaw != null && cpeHoursRaw !== '' ? `${Number(cpeHoursRaw)} CPE Hour${Number(cpeHoursRaw) !== 1 ? 's' : ''}` : '—';
  const languageLabels = (course.languageIds || []).filter((label) => typeof label === 'string' && label.trim());
  const languageLabel = languageLabels.length > 1 ? 'Multiple languages' : (languageLabels[0] || 'English');
  const courseSpeakers = (course.speakerIds || []).map((id) => speakerMap[id]).filter(Boolean);
  const { averageRating, reviewCount } = courseReviewStats;
  const learningOutcomes = topics.length > 0 ? topics : ['Establish a foundational understanding of the course subject and why it matters.', 'Apply key concepts in practical scenarios.'];
  const sectionCount = courseModules.reduce((acc, module) => acc + (module.sections?.length || 0), 0);
  const resolvedLessonCount = sectionCount || lessonCount;
  const moduleCount = courseModules.length || market.moduleCount || '—';
  const bundleCount = Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds.length : 0;
  const isBundleCourse = Boolean(course.isBundle);
  const hasAccess = !paidCourse || isEnrolled;
  /** Included course: user paid for / unlocked a bundle — no second payment for this program. */
  const unlockedByBundleOnly = hasAccess && paidCourse && accessViaBundle && !isBundleCourse;
  const hasCourseContent = sectionCount > 0;
  const canStartCourse = hasAccess && hasCourseContent;
  const updatedLabel = course.updatedAt
    ? fDate(course.updatedAt)
    : course.createdAt
      ? fDate(course.createdAt)
      : 'Recently updated';
  const sidebarIncludes = isBundleCourse
    ? [
        bundleCount > 0
          ? `${bundleCount} full program${bundleCount === 1 ? '' : 's'} included in this bundle`
          : 'Multiple programs packaged together in one enrollment',
        'Each program opens in the learning player with its own lessons and progress',
        cpeHours !== '—' ? cpeHours : 'Self-paced learning for every included program',
        hasAccess ? 'Full bundle access unlocked' : 'Instant access to all listed programs after purchase',
      ]
    : [
        resolvedLessonCount === '—'
          ? 'Structured lessons and guided learning materials'
          : `${resolvedLessonCount} lesson${Number(resolvedLessonCount) === 1 ? '' : 's'} available`,
        cpeHours !== '—' ? cpeHours : 'Self-paced learning access',
        hasAccess ? 'Full course access unlocked' : 'Instant access after purchase',
        'Progress tracking inside the learning player',
      ];
  const sidebarFacts = isBundleCourse
    ? [
        {
          label: 'Programs included',
          value: bundleCount > 0 ? String(bundleCount) : '—',
          icon: 'solar:layers-bold',
        },
        { label: 'Lessons (on this page)', value: String(resolvedLessonCount), icon: 'solar:document-text-bold' },
        { label: 'Modules', value: String(moduleCount), icon: 'solar:widget-5-bold' },
        { label: 'Updated', value: updatedLabel, icon: 'solar:calendar-bold' },
      ]
    : [
        { label: 'Lessons', value: String(resolvedLessonCount), icon: 'solar:document-text-bold' },
        { label: 'Modules', value: String(moduleCount), icon: 'solar:widget-5-bold' },
        { label: 'Level', value: course.level || 'All levels', icon: 'solar:bookmark-bold' },
        { label: 'Updated', value: updatedLabel, icon: 'solar:calendar-bold' },
      ];

  const showBrowseBundlePrograms =
    hasAccess && !hasCourseContent && isBundleCourse && bundleCount > 0;

  return (
    <DashboardContent>
      <Grid container spacing={{ xs: 3, md: 4 }}>

        <Grid
          xs={12}
          md={4}
          sx={{
            order: { xs: 1, md: 1 },
          }}
        >
          <Card
            sx={{
              position: 'sticky',
              top: 100,
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: theme.customShadows.z16,
            }}
          >
            <Box sx={{ position: 'relative', aspectRatio: '16/9' }}>
              <Image
                alt={`${course.title} trailer`}
                src={course.image || ''}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.common.black, 0.3),
                }}
              >
                <Box
                  component={canStartCourse ? RouterLink : 'div'}
                  href={canStartCourse ? paths.learningCourse.learn(course.id) : undefined}
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.common.white, 0.95),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: enrolledLoading || (hasAccess && !hasCourseContent) ? 'not-allowed' : 'pointer',
                    textDecoration: 'none',
                    color: 'inherit',
                    opacity: enrolledLoading || (hasAccess && !hasCourseContent) ? 0.6 : 1,
                    pointerEvents: enrolledLoading || (hasAccess && !hasCourseContent) ? 'none' : undefined,
                  }}
                  onClick={
                    !hasAccess && !enrolledLoading
                      ? (e) => {
                          e.preventDefault();
                          if (!isInCart(course.id)) {
                            addCourseToCart({
                              id: course.id,
                              title: course.title,
                              image: course.image,
                              amount: course.amount,
                              freeOrPaid: paidCourse,
                            });
                            toast.success('Added to cart');
                          }
                          navigate(paths.product.checkout);
                        }
                      : undefined
                  }
                  role={!hasAccess ? 'button' : undefined}
                >
                  <Iconify
                    icon={
                      hasAccess
                        ? 'solar:play-bold'
                        : !paidCourse
                          ? 'solar:play-bold'
                          : isInCart(course.id)
                            ? 'solar:cart-check-bold'
                            : 'solar:cart-plus-bold'
                    }
                    width={32}
                    sx={{
                      color: isInCart(course.id) ? 'success.main' : 'primary.main',
                      ml: hasAccess ? 0.5 : 0,
                    }}
                  />
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: alpha(theme.palette.common.white, 0.9),
                  color: isFavorite ? 'error.main' : 'grey.600',
                  '&:hover': { bgcolor: 'common.white' },
                  opacity: favoriteLoading ? 0.6 : 1,
                }}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Iconify icon={isFavorite ? 'solar:heart-bold' : 'solar:heart-outline'} width={22} />
              </IconButton>
            </Box>
            <Typography variant="caption" sx={{ display: 'block', px: 2, pt: 1.25, color: 'text.secondary', fontWeight: 600 }}>
              Course preview
            </Typography>
            <Box sx={{ px: 2, py: 2.25 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                flexWrap="wrap"
                sx={{ mb: 1.5, gap: 0.75 }}
              >
                <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.75 }}>
                  {isBundleCourse && (
                    <Chip
                      size="small"
                      icon={<Iconify icon="solar:layers-bold" width={16} />}
                      label="Bundle"
                      color="secondary"
                      variant="soft"
                      sx={{ fontWeight: 800 }}
                    />
                  )}
                  {unlockedByBundleOnly && (
                    <Chip
                      size="small"
                      icon={<Iconify icon="solar:shield-check-bold" width={16} />}
                      label="Via your bundle"
                      color="info"
                      variant="soft"
                      sx={{ fontWeight: 800 }}
                    />
                  )}
                  <Chip
                    size="small"
                    label={
                      hasAccess
                        ? unlockedByBundleOnly
                          ? 'Full access'
                          : 'Purchased'
                        : isInCart(course.id)
                          ? 'In Cart'
                          : paidCourse
                            ? 'Paid Course'
                            : 'Free Course'
                    }
                    color={hasAccess ? 'success' : isInCart(course.id) ? 'primary' : paidCourse ? 'secondary' : 'success'}
                    variant={hasAccess || isInCart(course.id) ? 'filled' : 'soft'}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Iconify icon="solar:star-bold" width={18} sx={{ color: 'warning.main' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {averageRating > 0 ? averageRating.toFixed(1) : 'New'}
                  </Typography>
                </Stack>
              </Stack>

              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: 'secondary.main',
                  mb: 0.5,
                  ...(unlockedByBundleOnly && {
                    textDecoration: 'line-through',
                    opacity: 0.55,
                    fontSize: '1.35rem',
                  }),
                }}
              >
                {price}
              </Typography>
              {unlockedByBundleOnly && (
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'success.main', mb: 0.5 }}>
                  No extra charge for you
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                {isBundleCourse
                  ? paidCourse
                    ? 'One payment unlocks every program in this bundle'
                    : 'Complimentary access to all included programs'
                  : unlockedByBundleOnly
                    ? 'You already unlocked this program through a bundle (paid or free). No separate purchase is required.'
                    : paidCourse
                      ? 'One-time payment with full access'
                      : 'Free access for this course'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 2 }}>
                {reviewCount > 0 ? `${reviewCount} review${reviewCount > 1 ? 's' : ''}` : 'Be the first learner to review this course'}
              </Typography>

              <Button
                component={canStartCourse ? RouterLink : 'button'}
                href={canStartCourse ? paths.learningCourse.learn(course.id) : undefined}
                variant="outlined"
                color="info"
                fullWidth
                disabled={enrolledLoading || (hasAccess && !hasCourseContent && !showBrowseBundlePrograms)}
                startIcon={
                  <Iconify
                    icon={showBrowseBundlePrograms ? 'solar:layers-bold' : 'solar:play-bold'}
                    width={20}
                  />
                }
                sx={{
                  py: 1.25,
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': { borderWidth: 2 },
                }}
                onClick={
                  showBrowseBundlePrograms
                    ? (e) => {
                        e.preventDefault();
                        scrollToBundlePrograms();
                      }
                    : !hasAccess && !enrolledLoading
                      ? () => {
                          if (!isInCart(course.id)) {
                            addCourseToCart({
                              id: course.id,
                              title: course.title,
                              image: course.image,
                              amount: course.amount,
                              freeOrPaid: paidCourse,
                            });
                            toast.success('Added to cart');
                          }
                          navigate(paths.product.checkout);
                        }
                      : undefined
                }
              >
                {enrolledLoading
                  ? 'Checking...'
                  : hasAccess
                    ? hasCourseContent
                      ? 'Start now'
                      : showBrowseBundlePrograms
                        ? 'Browse included programs'
                        : 'No content added'
                    : 'Purchase to watch'}
              </Button>
              {paidCourse && (
                <Button
                  variant={hasAccess ? 'soft' : isInCart(course.id) ? 'soft' : 'outlined'}
                  color={hasAccess ? 'success' : isInCart(course.id) ? 'success' : 'primary'}
                  fullWidth
                  disabled={enrolledLoading || hasAccess}
                  startIcon={<Iconify icon={hasAccess ? 'solar:check-circle-bold' : isInCart(course.id) ? 'solar:cart-check-bold' : 'solar:cart-plus-bold'} width={20} />}
                  sx={{ mt: 1.5, py: 1.25, fontWeight: 600 }}
                  onClick={() => {
                    if (hasAccess) return;
                    if (isInCart(course.id)) {
                      toast.info('Already in cart');
                    } else {
                      addCourseToCart({
                        id: course.id,
                        title: course.title,
                        image: course.image,
                        amount: course.amount,
                        freeOrPaid: paidCourse,
                      });
                      toast.success('Added to cart');
                    }
                  }}
                >
                  {hasAccess ? 'Purchased' : isInCart(course.id) ? 'In cart' : 'Add to cart'}
                </Button>
              )}

              {authenticated && paidCourse && hasAccess && (
                <Button
                  variant="soft"
                  color="info"
                  fullWidth
                  sx={{ mt: 1.25, py: 1.1, fontWeight: 600 }}
                  startIcon={<Iconify icon="solar:download-bold" width={18} />}
                  disabled={receiptDownloading}
                  onClick={handleDownloadMyReceipt}
                >
                  {receiptDownloading ? 'Preparing receipt...' : 'Download my receipt'}
                </Button>
              )}

              <Divider sx={{ my: 2.25 }} />

              <Grid container spacing={1.25}>
                {sidebarFacts.map((item) => (
                  <Grid key={item.label} xs={12} sm={6} md={6}>
                    <Box
                      sx={{
                        height: '100%',
                        p: 1.5,
                        borderRadius: 1.75,
                        bgcolor: alpha(theme.palette.secondary.main, 0.06),
                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.12)}`,
                      }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 1.25,
                            bgcolor: alpha(theme.palette.secondary.main, 0.12),
                            color: 'secondary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Iconify icon={item.icon} width={18} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.25 }}>
                            {item.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: 'text.primary',
                              lineHeight: 1.45,
                              wordBreak: 'break-word',
                            }}
                          >
                            {item.value}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2.25 }} />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                  {isBundleCourse ? 'This bundle includes' : 'This course includes'}
                </Typography>
                <Stack spacing={1}>
                  {sidebarIncludes.map((item) => (
                    <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                      <Iconify
                        icon="solar:verified-check-bold"
                        width={16}
                        sx={{ color: 'success.main', mt: 0.25, flexShrink: 0 }}
                      />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {item}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid
          xs={12}
          md={8}
          sx={{
            order: { xs: 2, md: 2 },
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            {course.title}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {courseCode}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>•</Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Iconify icon="solar:global-bold" width={18} sx={{ color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {languageLabel}
              </Typography>
            </Stack>
          </Stack>

          {isBundleCourse && (
            <LearningBundleHighlight count={bundleCount} sx={{ mb: 3 }} />
          )}

          <Card
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 2.5,
              boxShadow: theme.customShadows.z8,
            }}
          >
            <Stack spacing={4}>
              {isBundleCourse && (
                <Box id="bundle-included" sx={{ scrollMarginTop: 96 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Included programs
                    </Typography>
                    {bundleCount > 0 && (
                      <Chip
                        size="small"
                        label={`${bundleCount} program${bundleCount === 1 ? '' : 's'}`}
                        color="secondary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </Stack>
                  <Divider sx={{ mb: 2 }} />
                  {bundleIncludedLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
                  {!bundleIncludedLoading && bundleIncludedCourses.length === 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {bundleCount > 0
                        ? 'Program details are loading or temporarily unavailable.'
                        : 'Programs in this bundle will appear here once configured.'}
                    </Typography>
                  )}
                  <Stack spacing={1.5}>
                    {bundleIncludedCourses.map((inc, index) => (
                      <Card
                        key={inc.id}
                        component={RouterLink}
                        to={paths.learningCourse.details(inc.id)}
                        sx={{
                          p: 1.75,
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 2,
                          textDecoration: 'none',
                          color: 'inherit',
                          borderRadius: 2,
                          border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                          boxShadow: 'none',
                          transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
                          '&:hover': {
                            boxShadow: theme.customShadows.z12,
                            borderColor: alpha(theme.palette.secondary.main, 0.35),
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            bgcolor: alpha(theme.palette.secondary.main, 0.12),
                            color: 'secondary.dark',
                          }}
                        >
                          {index + 1}
                        </Typography>
                        <Box
                          sx={{
                            width: 96,
                            height: 56,
                            flexShrink: 0,
                            borderRadius: 1.25,
                            overflow: 'hidden',
                            bgcolor: 'grey.100',
                            border: (t) => `1px solid ${t.palette.divider}`,
                          }}
                        >
                          <Image
                            alt=""
                            src={inc.image || DEFAULT_COURSE_IMAGE}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
                            {inc.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.35 }}>
                            {inc.level || 'All levels'}
                            {hasAccess && isBundleCourse
                              ? ' · Included with this bundle'
                              : inc.freeOrPaid
                                ? ' · Paid'
                                : ' · Free'}
                          </Typography>
                        </Box>
                        <Iconify
                          icon="solar:arrow-right-up-bold"
                          width={22}
                          sx={{ color: 'text.secondary', flexShrink: 0 }}
                        />
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}

              {isBundleCourse && <Divider sx={{ borderStyle: 'dashed' }} />}

              <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {isBundleCourse ? 'Curriculum on this page' : 'Curriculum'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {modulesLoading ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Loading curriculum...
                </Typography>
              ) : courseModules.length > 0 ? (
                <Stack spacing={1}>
                  {courseModules.map((module, moduleIndex) => {
                    const sections = module.sections || [];
                    const sectionCount = sections.length;
                    return (
                      <Accordion
                        key={module.id}
                        defaultExpanded={moduleIndex === 0}
                        disableGutters
                        sx={{
                          boxShadow: 'none',
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          '&:before': { display: 'none' },
                          '&.Mui-expanded': {
                            margin: 0,
                            '&:not(:last-child)': {
                              marginBottom: 1,
                            },
                          },
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<Iconify icon="solar:alt-arrow-down-bold" width={20} />}
                          sx={{
                            px: 2,
                            py: 1.5,
                            minHeight: 48,
                            '& .MuiAccordionSummary-content': {
                              my: 0,
                            },
                            '&.Mui-expanded': {
                              minHeight: 48,
                            },
                          }}
                        >
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%', pr: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {moduleIndex + 1}. {module.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {sectionCount} {sectionCount === 1 ? 'Lesson' : 'Lesson(s)'}
                            </Typography>
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0, pb: 1.5, px: 2 }}>
                          <Stack spacing={1}>
                            {sections.map((section, sectionIndex) => (
                              (() => {
                                const hasVideo = Boolean(section.videoUrl);
                                const hasImages = Array.isArray(section.images) && section.images.length > 0;
                                const isYouTubeVideo = Boolean(
                                  section.videoUrl
                                  && (section.videoUrl.includes('youtube.com') || section.videoUrl.includes('youtu.be'))
                                );
                                const fallbackPreviewImage = course?.image || '/assets/images/cover/cover-1.jpg';
                                const previewImage = hasImages ? section.images[0] : fallbackPreviewImage;
                                const mediaLabel = hasVideo
                                  ? section.watchtime
                                    ? `Video lesson • ${section.watchtime}`
                                    : 'Video lesson'
                                  : hasImages
                                    ? `Image lesson • ${section.images.length} image(s)`
                                    : section.content
                                      ? 'Text lesson'
                                      : 'Lesson';
                                return (
                              <Stack
                                key={section.id}
                                component={hasAccess ? RouterLink : 'div'}
                                to={hasAccess ? paths.learningCourse.learn(course.id, section.id) : undefined}
                                direction="row"
                                alignItems="center"
                                spacing={1.5}
                                sx={{
                                  py: 1,
                                  px: 1.5,
                                  borderRadius: 1,
                                  bgcolor: alpha(theme.palette.grey[500], 0.04),
                                  cursor: hasAccess ? 'pointer' : 'default',
                                  textDecoration: 'none',
                                  color: 'inherit',
                                  transition: 'all 0.2s ease',
                                  ...(hasAccess && {
                                    '&:hover': {
                                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                                      transform: 'translateX(4px)',
                                    },
                                  }),
                                }}
                                onClick={!hasAccess ? (e) => { e.preventDefault(); toast.info('Purchase this course to access lessons'); } : undefined}
                                role={!hasAccess ? 'button' : undefined}
                              >
                                <Box
                                  sx={{
                                    width: 56,
                                    height: 36,
                                    borderRadius: 0.75,
                                    overflow: 'hidden',
                                    bgcolor: 'common.black',
                                    border: (t) => `1px solid ${t.palette.divider}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {hasVideo && !isYouTubeVideo ? (
                                    <Box
                                      component="video"
                                      src={section.videoUrl}
                                      muted
                                      preload="metadata"
                                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <Box
                                      component="img"
                                      src={previewImage}
                                      alt=""
                                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  )}
                                </Box>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                    {sectionIndex + 1}. {section.title}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                    {mediaLabel}
                                  </Typography>
                                </Box>
                              </Stack>
                                );
                              })()
                            ))}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {isBundleCourse
                    ? "Lessons for each program are inside that program's page. Use the included programs list above to open a course and start learning."
                    : lessonCount !== '—'
                      ? `This course includes ${lessonCount} lesson(s).`
                      : 'View full curriculum after you start the course.'}
                </Typography>
              )}
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Speaker(s)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {courseSpeakers.length > 0 ? (
                <Stack spacing={2}>
                  {courseSpeakers.map((s) => (
                    <Stack key={s.id} direction="row" spacing={2} alignItems="flex-start">
                      {s.profileimage ? (
                        <Box
                          component="img"
                          src={s.profileimage}
                          alt={s.name}
                          sx={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Iconify icon="solar:user-bold" width={28} sx={{ color: 'primary.main' }} />
                        </Box>
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
                        {s.about && (
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              mt: 0.5,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {s.about}
                          </Typography>
                        )}
                        <Button
                          component={RouterLink}
                          to={paths.speaker.details(s.id)}
                          size="small"
                          variant="text"
                          endIcon={<Iconify icon="solar:arrow-right-bold" width={16} />}
                          sx={{ mt: 1, textTransform: 'none' }}
                        >
                          View more
                        </Button>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Instructor information will be shown here when assigned.
                </Typography>
              )}
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Reviews {reviewCount > 0 ? `(${reviewCount})` : ''}
              </Typography>
              <Divider sx={{ mb: 2 }} />
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
                        {averageRating > 0 ? Number(averageRating).toFixed(1) : '0'}/5
                      </Typography>
                      <Rating
                        readOnly
                        value={averageRating}
                        precision={0.1}
                        size="medium"
                        sx={{ '& .MuiRating-iconFilled': { color: 'warning.main' } }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
                      </Typography>
                    </Stack>

                    <Stack spacing={1.5} sx={{ px: { md: 3 }, borderLeft: { md: `dashed 1px ${theme.palette.divider}` } }}>
                      {ratingDistribution.map((rating) => (
                        <Stack key={rating.name} direction="row" alignItems="center" spacing={2}>
                          <Typography variant="subtitle2" component="span" sx={{ width: 56 }}>
                            {rating.name}
                          </Typography>
                          <LinearProgress
                            color="inherit"
                            variant="determinate"
                            value={ratingDistributionTotal > 0 ? (rating.reviewCount / ratingDistributionTotal) * 100 : 0}
                            sx={{ flexGrow: 1, height: 8, borderRadius: 1, bgcolor: 'grey.200' }}
                          />
                          <Typography variant="body2" component="span" sx={{ minWidth: 32, color: 'text.secondary' }}>
                            {rating.reviewCount}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>

                  <Divider sx={{ borderStyle: 'dashed', my: 2 }} />

                  {courseReviews.length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', py: 3 }}>
                      No reviews yet. Be the first to review after completing the course.
                    </Typography>
                  ) : (
                    <Stack spacing={3} sx={{ pt: 1 }}>
                      {courseReviews.map((review) => {
                        const user = review.user || {};
                        const name = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username || 'User';
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
                              {review.feedback && (
                                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                  {review.feedback}
                                </Typography>
                              )}
                            </Stack>
                          </Stack>
                        );
                      })}
                    </Stack>
                  )}
                </>
              )}
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Course Description
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>
                Synopsis
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mb: 2,
                  lineHeight: 1.7,
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: showFullDescription ? 'unset' : 4,
                  overflow: 'hidden',
                }}
              >
                {synopsis}
              </Typography>
              {remainder ? (
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    mb: 2,
                    lineHeight: 1.7,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: showFullDescription ? 'unset' : 6,
                    overflow: 'hidden',
                  }}
                >
                  {remainder}
                </Typography>
              ) : null}
              {plainDesc.length > 260 && (
                <Button
                  size="small"
                  color="secondary"
                  onClick={() => setShowFullDescription((prev) => !prev)}
                  sx={{ textTransform: 'none', px: 0, mb: topics.length > 0 ? 2 : 0 }}
                >
                  {showFullDescription ? 'Read less' : 'Read more'}
                </Button>
              )}
              {topics.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                    The session covers the following topics:
                  </Typography>
                  <Stack component="ol" sx={{ pl: 2.5, m: 0 }}>
                    {topics.map((t, i) => (
                      <Typography key={i} component="li" variant="body2" sx={{ color: 'text.secondary', mb: 0.5, lineHeight: 1.6 }}>
                        {t}
                      </Typography>
                    ))}
                  </Stack>
                </>
              )}
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Related courses - full width below */}
      {relatedCourses.length > 0 && (
        <Box sx={{ mt: { xs: 4, md: 6 } }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Related courses
          </Typography>
          <Grid container spacing={2}>
            {relatedCourses.map((rel) => (
              <Grid key={rel.id} xs={12} sm={6} md={3}>
                <Card
                  component={RouterLink}
                  to={paths.learningCourse.details(rel.id)}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'inherit',
                    boxShadow: theme.customShadows.z4,
                    transition: 'box-shadow 0.25s ease',
                    '&:hover': { boxShadow: theme.customShadows.z16 },
                  }}
                >
                  <Box sx={{ position: 'relative', height: 170 }}>
                    <Image
                      alt={rel.title}
                      src={rel.image || DEFAULT_COURSE_IMAGE}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_COURSE_IMAGE;
                      }}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                  <Box sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                        minHeight: 40,
                      }}
                    >
                      {rel.title}
                    </Typography>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 'auto', pt: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {rel.level || 'Beginner'}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                        {formatPrice(isPaidCourse(rel.freeOrPaid), rel.amount)}
                      </Typography>
                    </Stack>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </DashboardContent>
  );
}
