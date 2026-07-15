import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Rating from '@mui/material/Rating';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import { alpha, useTheme } from '@mui/material/styles';

import { fDate, fDateTimePersonal, fToNow } from 'src/utils/format-time';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import { RichTextContent } from 'src/components/html-content';
import { courseService } from 'src/services/course.service';
import { useAuthContext } from 'src/auth/hooks';
import { toast } from 'src/components/snackbar';
import { htmlToPlainText } from 'src/utils/html-plain-text';
import { getCourseDefaultImage } from 'src/utils/course-default-image';
import { isSpotlightrUrl } from 'src/utils/spotlightr';
import { useCheckoutContext } from 'src/sections/checkout/context';
import { downloadMyCourseReceiptPdf } from 'src/services/order.service';

import { LearningBundleHighlight } from '../components/course-bundle-badge';
import { LearningProgramLinkedCourses } from '../components/learning-program-linked-courses';
import { LearningCourseGridCard } from '../components/learning-course-grid-card';
import { LEARNING_ADD_TO_CART_ENABLED } from '../learning-feature-flags';
import {
  COURSE_DETAIL_META_SX,
  COURSE_DETAIL_PAGE_TITLE_SX,
  COURSE_DETAIL_RATING_AVERAGE_SX,
  COURSE_DETAIL_RICH_TEXT_SX,
  COURSE_DETAIL_SECTION_HEADING_SX,
  COURSE_DETAIL_SIDEBAR_PRICE_SX,
  COURSE_DETAIL_SIDEBAR_SUBPRICE_SX,
  COURSE_DETAIL_SIDEBAR_EMPHASIS_SX,
  DETAIL_PAGE_SECTION_TITLE_SX,
} from 'src/components/page-section-header/detail-page-styles';

// ----------------------------------------------------------------------

const formatPrice = (freeOrPaid, amount) => {
  if (!freeOrPaid) return 'AI Fluency';
  return `${Number(amount || 0).toFixed(2)} SGD`;
};

const isPaidCourse = (value) => value === true || value === 'true' || value === 1 || value === '1';
const DEFAULT_COURSE_IMAGE = getCourseDefaultImage();
const REVIEW_PREVIEW_COUNT = (() => {
  const parsed = Number(import.meta.env.VITE_COURSE_REVIEW_PREVIEW_COUNT ?? 2);
  if (!Number.isFinite(parsed)) return 2;
  return Math.min(20, Math.max(1, Math.trunc(parsed)));
})();

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

export function LearningCourseDetailsView({ course, loading, error }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [courseModules, setCourseModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [accessViaBundle, setAccessViaBundle] = useState(false);
  const enrolledLoading = false;
  const [courseReviewStats, setCourseReviewStats] = useState({ averageRating: 0, reviewCount: 0 });
  const [courseReviews, setCourseReviews] = useState([]);
  const reviewsLoading = false;
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [bundleIncludedCourses, setBundleIncludedCourses] = useState([]);
  const [bundleIncludedLoading, setBundleIncludedLoading] = useState(false);
  const [receiptDownloading, setReceiptDownloading] = useState(false);
  const [reviewsDrawerOpen, setReviewsDrawerOpen] = useState(false);
  const [relatedFavoriteOverrides, setRelatedFavoriteOverrides] = useState({});
  const [relatedFavoriteLoading, setRelatedFavoriteLoading] = useState(() => new Set());
  const [relatedProgressById, setRelatedProgressById] = useState({});

  // Speaker rows come from course API (`speakers`) — no GET /speakers
  const speakerMap = useMemo(
    () => Object.fromEntries((Array.isArray(course?.speakers) ? course.speakers : []).map((s) => [s.id, s])),
    [course?.speakers]
  );

  // Enrollment comes from main course payload; avoid extra enrolled-status API call.
  useEffect(() => {
    if (!course?.id || !authenticated) {
      setIsEnrolled(false);
      setAccessViaBundle(false);
      return undefined;
    }
    setIsEnrolled(Boolean(course.isEnrolled));
    setAccessViaBundle(Boolean(course.accessViaBundle));
    return undefined;
  }, [course?.id, course?.isEnrolled, course?.accessViaBundle, authenticated]);

  // Reviews now come from main course payload (no separate /reviews call needed)
  useEffect(() => {
    if (!course?.id) {
      setCourseReviewStats({ averageRating: 0, reviewCount: 0 });
      setCourseReviews([]);
      return undefined;
    }
    setCourseReviewStats({
      averageRating: Number(course?.reviewStats?.averageRating || 0),
      reviewCount: Number(course?.reviewStats?.reviewCount || 0),
    });
    setCourseReviews(Array.isArray(course?.reviews) ? course.reviews : []);
    return undefined;
  }, [course?.id, course?.reviewStats, course?.reviews]);

  // Initialize favorite status from course data
  useEffect(() => {
    if (course?.isFavorite !== undefined) {
      setIsFavorite(course.isFavorite);
    }
  }, [course?.isFavorite]);

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

  const relatedCourses = useMemo(
    () => (Array.isArray(course?.relatedCourses) ? course.relatedCourses : []),
    [course?.relatedCourses]
  );

  useEffect(() => {
    setRelatedFavoriteOverrides({});
    setRelatedFavoriteLoading(new Set());
  }, [course?.id]);

  useEffect(() => {
    if (!authenticated || relatedCourses.length === 0) {
      setRelatedProgressById({});
      return undefined;
    }

    let cancelled = false;
    const relatedIds = new Set(relatedCourses.map((rel) => rel.id).filter(Boolean));

    courseService
      .getMyProgressOverview()
      .then((rows) => {
        if (cancelled) return;
        const nextProgressMap = (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
          const courseId = row?.course?.id ? String(row.course.id) : '';
          if (!courseId || !relatedIds.has(courseId)) return acc;
          const progress = row?.progress && typeof row.progress === 'object' ? row.progress : {};
          acc[courseId] = {
            completionPercent: Math.max(0, Math.min(100, Number(progress.completionPercent ?? 0))),
            status: String(progress.status || '').toLowerCase(),
          };
          return acc;
        }, {});
        setRelatedProgressById(nextProgressMap);
      })
      .catch(() => {
        if (!cancelled) setRelatedProgressById({});
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, relatedCourses]);

  const getRelatedIsFavorite = (rel) => {
    if (Object.prototype.hasOwnProperty.call(relatedFavoriteOverrides, rel.id)) {
      return relatedFavoriteOverrides[rel.id];
    }
    return Boolean(rel.isFavorite);
  };

  const handleRelatedCourseImageClick = (event, rel) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(
      rel.isEnrolled ? paths.learningCourse.learn(rel.id) : paths.learningCourse.details(rel.id)
    );
  };

  const handleRelatedGoToDetails = (event, courseId) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(paths.learningCourse.details(courseId));
  };

  const handleRelatedAddToCart = (event, rel) => {
    event.preventDefault();
    event.stopPropagation();

    if (rel.isEnrolled) return;
    if (!authenticated) {
      redirectToSignIn();
      return;
    }

    if (!isInCart(rel.id)) {
      addCourseToCart({
        id: rel.id,
        title: rel.title,
        image: rel.image,
        amount: rel.amount,
        freeOrPaid: rel.freeOrPaid,
      });
      toast.success('Added to cart');
      return;
    }
    toast.info('Already in cart');
  };

  const handleRelatedFavorite = async (event, courseId) => {
    event.preventDefault();
    event.stopPropagation();

    if (!authenticated) {
      toast.info('Please sign in to favorite courses');
      return;
    }

    const rel = relatedCourses.find((item) => item.id === courseId);
    const wasFavorite = getRelatedIsFavorite(rel || { id: courseId, isFavorite: false });

    setRelatedFavoriteOverrides((prev) => ({ ...prev, [courseId]: !wasFavorite }));
    setRelatedFavoriteLoading((prev) => new Set(prev).add(courseId));

    try {
      const result = await courseService.toggleCourseFavorite(courseId);
      setRelatedFavoriteOverrides((prev) => ({ ...prev, [courseId]: result.isFavorite }));
      toast.success(
        result.isFavorite ? 'Course added to favorites' : 'Course removed from favorites'
      );
    } catch (err) {
      setRelatedFavoriteOverrides((prev) => ({ ...prev, [courseId]: wasFavorite }));
      toast.error(err?.response?.data?.message || 'Failed to update favorite');
    } finally {
      setRelatedFavoriteLoading((prev) => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
    }
  };

  const scrollToBundlePrograms = () => {
    document.getElementById('bundle-included')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const redirectToSignIn = () => {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search || ''}`);
    navigate(`${paths.auth.simple.signIn}?returnTo=${returnTo}`);
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
  const languageLabels = (Array.isArray(course?.languages) ? course.languages : [])
    .map((l) => l?.name || l?.title || '')
    .filter((label) => typeof label === 'string' && label.trim());
  const languageLabel = languageLabels.length > 1 ? 'Multiple languages' : (languageLabels[0] || 'English');
  const courseSpeakers = (Array.isArray(course?.speakers) ? course.speakers : []).filter(Boolean);
  const { averageRating, reviewCount } = courseReviewStats;
  const learningOutcomes = topics.length > 0 ? topics : ['Establish a foundational understanding of the course subject and why it matters.', 'Apply key concepts in practical scenarios.'];
  const sectionCount = courseModules.reduce((acc, module) => acc + (module.sections?.length || 0), 0);
  const hasAnyVideoLesson = courseModules.some((module) =>
    Array.isArray(module?.sections) && module.sections.some((section) => Boolean(section?.videoUrl))
  );
  const hasCourseCoverImage = Boolean(course?.image);
  const resolvedLessonCount = sectionCount || lessonCount;
  const moduleCount = courseModules.length || market.moduleCount || '—';
  const bundleCount = Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds.length : 0;
  const isBundleCourse = Boolean(course.isBundle);
  const hasAccess = !paidCourse || isEnrolled;
  /** Included course: user paid for / unlocked a bundle — no second payment for this program. */
  const unlockedByBundleOnly = hasAccess && paidCourse && accessViaBundle && !isBundleCourse;
  const showSidebarStatusChips = isBundleCourse || unlockedByBundleOnly || !hasAccess;
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
  const previewReviews = courseReviews.slice(0, REVIEW_PREVIEW_COUNT);

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
                src={course.image || DEFAULT_COURSE_IMAGE}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {!hasCourseCoverImage && hasAnyVideoLesson && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.common.black, 0.55),
                    color: 'common.white',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    zIndex: 2,
                  }}
                >
                  <Iconify icon="solar:play-circle-bold" width={14} />
                  <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>
                    Video
                  </Typography>
                </Box>
              )}
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
                  component={canStartCourse && authenticated ? RouterLink : 'div'}
                  href={canStartCourse && authenticated ? paths.learningCourse.learn(course.id) : undefined}
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
                  onClick={(e) => {
                    if (!authenticated) {
                      e.preventDefault();
                      redirectToSignIn();
                      return;
                    }
                    if (!hasAccess && !enrolledLoading) {
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
                  }}
                  role={!hasAccess ? 'button' : undefined}
                >
                  <Iconify
                    icon={
                      hasAccess || !paidCourse || !authenticated
                        ? 'solar:play-bold'
                        : isInCart(course.id)
                          ? 'solar:cart-check-bold'
                          : 'solar:cart-plus-bold'
                    }
                    width={32}
                    sx={{
                      color:
                        authenticated && !hasAccess && paidCourse && isInCart(course.id)
                          ? 'success.main'
                          : 'primary.main',
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
            <Box sx={{ px: 2, py: 1.75 }}>
              {showSidebarStatusChips && (
                <Stack
                  direction="row"
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ mb: 0.75, gap: 0.75 }}
                >
                  {isBundleCourse && (
                    <Chip
                      size="small"
                      icon={<Iconify icon="solar:layers-bold" width={16} />}
                      label="Bundle"
                      color="secondary"
                      variant="soft"
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  )}
                  {unlockedByBundleOnly && (
                    <Chip
                      size="small"
                      icon={<Iconify icon="solar:shield-check-bold" width={16} />}
                      label="Via your bundle"
                      color="info"
                      variant="soft"
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  )}
                  {(!hasAccess || unlockedByBundleOnly) && (
                    <Chip
                      size="small"
                      label={
                        hasAccess
                          ? 'Full access'
                          : authenticated && isInCart(course.id)
                            ? 'In Cart'
                            : paidCourse
                              ? 'Paid Course'
                              : 'AI Fluency Course'
                      }
                      color={
                        hasAccess
                          ? 'success'
                          : authenticated && isInCart(course.id)
                            ? 'primary'
                            : paidCourse
                              ? 'secondary'
                              : 'success'
                      }
                      variant={hasAccess || (authenticated && isInCart(course.id)) ? 'filled' : 'soft'}
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  )}
                </Stack>
              )}

              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 0.5, width: 1, gap: 0.75 }}
              >
                <Typography
                  component="p"
                  sx={{
                    ...COURSE_DETAIL_SIDEBAR_PRICE_SX,
                    mb: 0,
                    minWidth: 0,
                    flex: 1,
                    ...(unlockedByBundleOnly && {
                      textDecoration: 'line-through',
                      opacity: 0.55,
                    }),
                  }}
                >
                  {price}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0, ml: 'auto' }}>
                  <Iconify icon="solar:star-bold" width={16} sx={{ color: 'warning.main' }} />
                  <Typography sx={COURSE_DETAIL_SIDEBAR_EMPHASIS_SX}>
                    {averageRating > 0 ? averageRating.toFixed(1) : 'New'}
                  </Typography>
                </Stack>
              </Stack>
              {unlockedByBundleOnly && (
                <Typography component="p" sx={COURSE_DETAIL_SIDEBAR_SUBPRICE_SX}>
                  No extra charge for you
                </Typography>
              )}
              <Typography sx={{ ...COURSE_DETAIL_META_SX, mb: 0.25 }}>
                {isBundleCourse
                  ? paidCourse
                    ? 'One payment unlocks every program in this bundle'
                    : 'Complimentary access to all included programs'
                  : unlockedByBundleOnly
                    ? 'You already unlocked this program through a bundle (paid or free). No separate purchase is required.'
                    : paidCourse
                      ? 'One-time payment with full access'
                      : 'AI Fluency access for this course'}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', display: 'block', mb: 1.5, lineHeight: 1.45 }}
              >
                {reviewCount > 0 ? `${reviewCount} review${reviewCount > 1 ? 's' : ''}` : 'Be the first learner to review this course'}
              </Typography>

              <Button
                component={canStartCourse && authenticated ? RouterLink : 'button'}
                href={canStartCourse && authenticated ? paths.learningCourse.learn(course.id) : undefined}
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
                onClick={(e) => {
                  if (showBrowseBundlePrograms) {
                    e.preventDefault();
                    scrollToBundlePrograms();
                    return;
                  }
                  if (!authenticated) {
                    e.preventDefault();
                    redirectToSignIn();
                    return;
                  }
                  if (!hasAccess && !enrolledLoading) {
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
                }}
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
              {LEARNING_ADD_TO_CART_ENABLED && authenticated && paidCourse && !hasAccess && (
                <Button
                  variant={isInCart(course.id) ? 'soft' : 'outlined'}
                  color={isInCart(course.id) ? 'success' : 'primary'}
                  fullWidth
                  disabled={enrolledLoading}
                  startIcon={
                    <Iconify
                      icon={isInCart(course.id) ? 'solar:cart-check-bold' : 'solar:cart-plus-bold'}
                      width={20}
                    />
                  }
                  sx={{ mt: 1.5, py: 1.25, fontWeight: 600 }}
                  onClick={() => {
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
                  {isInCart(course.id) ? 'In cart' : 'Add to cart'}
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
                            sx={{
                              ...COURSE_DETAIL_SIDEBAR_EMPHASIS_SX,
                              color: 'text.primary',
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
                <Typography sx={{ ...COURSE_DETAIL_SECTION_HEADING_SX, mb: 1.25 }}>
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
                      <Typography sx={COURSE_DETAIL_META_SX}>
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
          <Typography component="h1" sx={COURSE_DETAIL_PAGE_TITLE_SX}>
            {course.title}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Typography sx={COURSE_DETAIL_META_SX}>
              {courseCode}
            </Typography>
            <Typography sx={COURSE_DETAIL_META_SX}>•</Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Iconify icon="solar:global-bold" width={18} sx={{ color: 'text.secondary' }} />
              <Typography sx={COURSE_DETAIL_META_SX}>
                {languageLabel}
              </Typography>
            </Stack>
          </Stack>

          {isBundleCourse && (
            <LearningBundleHighlight count={bundleCount} sx={{ mb: 3 }} />
          )}

          <LearningProgramLinkedCourses courseId={course.id} />

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
                    <Typography sx={COURSE_DETAIL_SECTION_HEADING_SX}>
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
                    <Typography sx={COURSE_DETAIL_META_SX}>
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
                          <Typography sx={{ ...COURSE_DETAIL_SIDEBAR_EMPHASIS_SX, lineHeight: 1.35 }}>
                            {inc.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.35 }}>
                            {inc.level || 'All levels'}
                            {hasAccess && isBundleCourse
                              ? ' · Included with this bundle'
                              : inc.freeOrPaid
                                ? ' · Paid'
                                : ' · AI Fluency'}
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
              <Typography sx={COURSE_DETAIL_SECTION_HEADING_SX}>
                {isBundleCourse ? 'Curriculum on this page' : 'Curriculum'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {modulesLoading ? (
                <Typography sx={COURSE_DETAIL_META_SX}>
                  Loading curriculum...
                </Typography>
              ) : courseModules.length > 0 ? (
                <Stack spacing={1}>
                  {courseModules.map((module, moduleIndex) => {
                    const sections = module.sections || [];
                    const moduleSectionCount = sections.length;
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
                            px: { xs: 1.5, sm: 2 },
                            py: 1.5,
                            minHeight: 48,
                            '& .MuiAccordionSummary-content': {
                              my: 0,
                              minWidth: 0,
                              mr: 1,
                              overflow: 'hidden',
                            },
                            '& .MuiAccordionSummary-expandIconWrapper': {
                              flexShrink: 0,
                            },
                            '&.Mui-expanded': {
                              minHeight: 48,
                            },
                          }}
                        >
                          <Box sx={{ width: '100%', minWidth: 0 }}>
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                              justifyContent="space-between"
                              spacing={{ xs: 0.25, sm: 1 }}
                              sx={{ width: '100%' }}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  fontWeight: 600,
                                  flex: { sm: 1 },
                                  minWidth: 0,
                                  wordBreak: 'break-word',
                                  lineHeight: 1.4,
                                }}
                              >
                                {moduleIndex + 1}. {module.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  flexShrink: 0,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {moduleSectionCount} {moduleSectionCount === 1 ? 'Lesson' : 'Lesson(s)'}
                              </Typography>
                            </Stack>
                          </Box>
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
                                const isSpotlightrVideo = Boolean(
                                  section.videoUrl && isSpotlightrUrl(section.videoUrl)
                                );
                                const isEmbeddedVideo = isYouTubeVideo || isSpotlightrVideo;
                                const fallbackPreviewImage = course?.image || DEFAULT_COURSE_IMAGE;
                                const previewImage = hasImages ? section.images[0] : fallbackPreviewImage;
                                const mediaLabel = hasVideo
                                  ? [
                                      'Video lesson',
                                      section.durationTime && `duration ${section.durationTime}`,
                                    ]
                                      .filter(Boolean)
                                      .join(' • ')
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
                                  {hasVideo && !isEmbeddedVideo ? (
                                    <Box
                                      component="video"
                                      src={section.videoUrl}
                                      muted
                                      preload="metadata"
                                      controlsList="nodownload"
                                      disablePictureInPicture
                                      onContextMenu={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                      }}
                                      onDragStart={(event) => event.preventDefault()}
                                      sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        WebkitUserSelect: 'none',
                                        userSelect: 'none',
                                        WebkitTouchCallout: 'none',
                                      }}
                                    />
                                  ) : hasVideo && isEmbeddedVideo ? (
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                      <Iconify icon="solar:video-frame-bold" width={16} sx={{ color: 'common.white' }} />
                                      <Iconify icon="solar:play-bold" width={14} sx={{ color: 'common.white' }} />
                                    </Stack>
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
                <Typography sx={COURSE_DETAIL_META_SX}>
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
              <Typography sx={COURSE_DETAIL_SECTION_HEADING_SX}>
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
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {htmlToPlainText(s.name || '').trim() || 'Speaker'}
                        </Typography>
                        {htmlToPlainText(s.about || '').trim() && (
                          <Box sx={{ mt: 0.5, color: 'text.secondary' }}>
                            <RichTextContent
                              html={s.about}
                              sx={{
                                ...COURSE_DETAIL_RICH_TEXT_SX,
                                '& p': { my: 0.5 },
                              }}
                            />
                          </Box>
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
                <Typography sx={COURSE_DETAIL_META_SX}>
                  Instructor information will be shown here when assigned.
                </Typography>
              )}
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box>
              <Typography sx={COURSE_DETAIL_SECTION_HEADING_SX}>
                Reviews {reviewCount > 0 ? `(${reviewCount})` : ''}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {reviewsLoading ? (
                <Typography sx={COURSE_DETAIL_META_SX}>
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
                      <Typography component="p" sx={COURSE_DETAIL_RATING_AVERAGE_SX}>
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
                    <Typography sx={{ ...COURSE_DETAIL_META_SX, py: 3 }}>
                      No reviews yet. Be the first to review after completing the course.
                    </Typography>
                  ) : (
                    <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                      {previewReviews.map((review) => {
                        const user = review.user || {};
                        const name = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username || 'User';
                        const initials = name.slice(0, 2).toUpperCase();
                        return (
                          <Box
                            key={review.id}
                            sx={{
                              p: 1.5,
                              border: `1px solid ${alpha(theme.palette.grey[500], 0.18)}`,
                              borderRadius: 1.5,
                              bgcolor: alpha(theme.palette.background.neutral, 0.32),
                            }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                              <Avatar
                                sx={{
                                  width: 42,
                                  height: 42,
                                  bgcolor: 'primary.main',
                                  color: 'primary.contrastText',
                                  flexShrink: 0,
                                }}
                              >
                                {initials}
                              </Avatar>
                              <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  spacing={1}
                                  sx={{ minWidth: 0 }}
                                >
                                  <Typography variant="subtitle2" noWrap sx={{ maxWidth: '60%' }}>
                                    {name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                                    {review.createdAt ? `${fDateTimePersonal(review.createdAt)} (${fToNow(review.createdAt)} ago)` : ''}
                                  </Typography>
                                </Stack>
                                <Rating
                                  size="small"
                                  value={Number(review.rating)}
                                  precision={0.1}
                                  readOnly
                                  sx={{ '& .MuiRating-iconFilled': { color: 'warning.main' } }}
                                />
                                {review.feedback && (
                                  <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.5 }}>
                                    {review.feedback}
                                  </Typography>
                                )}
                              </Stack>
                            </Stack>
                          </Box>
                        );
                      })}
                      {courseReviews.length > REVIEW_PREVIEW_COUNT && (
                        <Box sx={{ pt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            endIcon={<Iconify icon="solar:arrow-right-bold" width={16} />}
                            onClick={() => setReviewsDrawerOpen(true)}
                            sx={{ textTransform: 'none' }}
                          >
                            View all reviews ({courseReviews.length})
                          </Button>
                        </Box>
                      )}
                    </Stack>
                  )}
                </>
              )}
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box>
              <Typography sx={COURSE_DETAIL_SECTION_HEADING_SX}>
                Course Description
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <RichTextContent
                html={course.description || '<p>No description available.</p>'}
                clampLines={showFullDescription ? undefined : 10}
                sx={COURSE_DETAIL_RICH_TEXT_SX}
              />
              {plainDesc.length > 260 && (
                <Button
                  size="small"
                  color="secondary"
                  onClick={() => setShowFullDescription((prev) => !prev)}
                  sx={{ textTransform: 'none', px: 0, mt: 1 }}
                >
                  {showFullDescription ? 'Read less' : 'Read more'}
                </Button>
              )}
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Related courses — same card UI as All Courses grid */}
      {relatedCourses.length > 0 && (
        <Box sx={{ mt: { xs: 4, md: 6 } }}>
          <Typography component="h2" sx={{ ...DETAIL_PAGE_SECTION_TITLE_SX, mb: 2 }}>
            Related courses
          </Typography>
          <Grid
            container
            spacing={{ xs: 1.75, sm: 1.5, md: 2 }}
            columns={{ xs: 2, sm: 2, md: 4, lg: 4, xl: 4 }}
            sx={{ overflow: 'visible' }}
          >
            {relatedCourses.map((rel) => {
              const { moduleCount, sectionCount } = getCourseContentMeta(rel);
              const progressRow = relatedProgressById[rel.id] || {};
              const courseProgress = Number.isFinite(progressRow.completionPercent)
                ? progressRow.completionPercent
                : 0;
              const showCourseProgress =
                authenticated && (!rel.freeOrPaid || rel.isEnrolled);
              const progressStatus = getCourseProgressStatus(progressRow.status, courseProgress);

              return (
                <Grid key={rel.id} xs={1} sx={{ overflow: 'visible', display: 'flex' }}>
                  <LearningCourseGridCard
                    course={rel}
                    defaultCourseImage={DEFAULT_COURSE_IMAGE}
                    groupKey="related"
                    moduleCount={moduleCount}
                    sectionCount={sectionCount}
                    showCourseProgress={showCourseProgress}
                    courseProgress={courseProgress}
                    progressStatus={progressStatus}
                    isFavorite={getRelatedIsFavorite(rel)}
                    favoriteLoading={relatedFavoriteLoading.has(rel.id)}
                    isEnrolled={Boolean(rel.isEnrolled)}
                    isInCart={isInCart(rel.id)}
                    showFavorite={authenticated}
                    detailsHref={paths.learningCourse.details(rel.id)}
                    onImageClick={handleRelatedCourseImageClick}
                    onFavorite={handleRelatedFavorite}
                    onAddToCart={handleRelatedAddToCart}
                    onViewDetails={handleRelatedGoToDetails}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      <Drawer
        anchor="right"
        open={reviewsDrawerOpen}
        onClose={() => setReviewsDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 520 },
            p: 0,
          },
        }}
      >
        <Stack sx={{ height: '100%' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}
          >
            <Box>
              <Typography sx={COURSE_DETAIL_SECTION_HEADING_SX}>All Reviews</Typography>
              <Typography sx={COURSE_DETAIL_META_SX}>
                {courseReviews.length} review{courseReviews.length !== 1 ? 's' : ''} from learners
              </Typography>
            </Box>
            <IconButton onClick={() => setReviewsDrawerOpen(false)}>
              <Iconify icon="mingcute:close-line" width={20} />
            </IconButton>
          </Stack>
          <Box sx={{ px: 2.5, py: 2, overflowY: 'auto', flex: 1 }}>
            {courseReviews.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No reviews yet.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {courseReviews.map((review) => {
                  const user = review.user || {};
                  const name =
                    [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username || 'User';
                  const initials = name.slice(0, 2).toUpperCase();
                  return (
                    <Stack
                      key={`drawer-${review.id}`}
                      direction="row"
                      spacing={1.5}
                      sx={{ p: 1.5, border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}
                    >
                      <Avatar
                        sx={{
                          width: 42,
                          height: 42,
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </Avatar>
                      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                          <Typography variant="subtitle2" noWrap>
                            {name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                            {review.createdAt ? `${fDateTimePersonal(review.createdAt)} (${fToNow(review.createdAt)} ago)` : ''}
                          </Typography>
                        </Stack>
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
          </Box>
        </Stack>
      </Drawer>
    </DashboardContent>
  );
}
