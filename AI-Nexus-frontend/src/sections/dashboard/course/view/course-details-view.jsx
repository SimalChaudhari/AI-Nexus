import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import { useTheme, alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { htmlToPlainText } from 'src/utils/html-plain-text';
import { getCourseDefaultImage } from 'src/utils/course-default-image';
import { RichTextContent } from 'src/components/html-content';
import { courseService } from 'src/services/course.service';
import { CourseQuestionBankPanel } from '../course-question-bank-panel';
import { getCourseReviews, deleteReview } from 'src/services/review.service';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { toast } from 'src/components/snackbar';
import Pagination, { paginationClasses } from '@mui/material/Pagination';

// ----------------------------------------------------------------------

const REVIEWS_PER_PAGE = 8;

export function CourseDetailsView({ course, loading, error }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [courseModules, setCourseModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSection, setPreviewSection] = useState(null);
  const [courseReviews, setCourseReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewsPage, setReviewsPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bundleLinkedCourses, setBundleLinkedCourses] = useState([]);
  const [bundleLinkedLoading, setBundleLinkedLoading] = useState(false);
  const defaultCourseImage = getCourseDefaultImage();

  const ratingDistribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    courseReviews.forEach((r) => {
      const star = Math.round(Number(r.rating));
      if (star >= 1 && star <= 5) counts[star] += 1;
    });
    return [5, 4, 3, 2, 1].map((star) => ({
      name: `${star} Star`,
      reviewCount: counts[star],
    }));
  }, [courseReviews]);

  const ratingDistributionTotal = useMemo(
    () => ratingDistribution.reduce((acc, r) => acc + r.reviewCount, 0),
    [ratingDistribution]
  );

  // Fetch course modules and sections for curriculum
  useEffect(() => {
    if (!course?.id) return undefined;
    let cancelled = false;
    setModulesLoading(true);
    courseService
      .getCourseModulesWithSections(course.id)
      .then((modules) => {
        if (!cancelled) setCourseModules(modules || []);
      })
      .catch(() => {
        if (!cancelled) setCourseModules([]);
      })
      .finally(() => {
        if (!cancelled) setModulesLoading(false);
      });
    return () => { cancelled = true; };
  }, [course?.id]);

  const bundleIds = useMemo(
    () =>
      course?.isBundle && Array.isArray(course.bundleCourseIds)
        ? course.bundleCourseIds.filter(Boolean)
        : [],
    [course?.isBundle, course?.bundleCourseIds]
  );

  useEffect(() => {
    if (bundleIds.length === 0) {
      setBundleLinkedCourses([]);
      return undefined;
    }
    let cancelled = false;
    setBundleLinkedLoading(true);
    Promise.all(bundleIds.map((id) => courseService.getCourseById(id).catch(() => null)))
      .then((results) => {
        if (cancelled) return;
        const byId = Object.fromEntries(results.filter(Boolean).map((c) => [c.id, c]));
        setBundleLinkedCourses(bundleIds.map((id) => byId[id]).filter(Boolean));
      })
      .finally(() => {
        if (!cancelled) setBundleLinkedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bundleIds.join('|')]);

  // Fetch course reviews
  useEffect(() => {
    if (!course?.id) {
      setCourseReviews([]);
      return undefined;
    }
    let cancelled = false;
    setReviewsLoading(true);
    getCourseReviews(course.id)
      .then((reviews) => {
        if (!cancelled) setCourseReviews(Array.isArray(reviews) ? reviews : []);
      })
      .catch(() => {
        if (!cancelled) setCourseReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => { cancelled = true; };
  }, [course?.id]);

  // Reset reviews page when list shrinks (e.g. after delete)
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(courseReviews.length / REVIEWS_PER_PAGE));
    if (reviewsPage > maxPage) setReviewsPage(1);
  }, [courseReviews.length, reviewsPage]);

  const languageLabels = useMemo(() => {
    const rows = Array.isArray(course?.languages) ? course.languages : [];
    return rows
      .map((l) => l?.name || l?.title || '')
      .filter((name) => typeof name === 'string' && name.trim().length > 0);
  }, [course?.languages]);

  const roleLabels = useMemo(
    () => (Array.isArray(course?.roles) ? course.roles.filter(Boolean) : []),
    [course?.roles]
  );
  const aiLevelLabels = useMemo(
    () => (Array.isArray(course?.aiLevel) ? course.aiLevel.filter(Boolean) : []),
    [course?.aiLevel]
  );
  const goalLabels = useMemo(
    () => (Array.isArray(course?.goals) ? course.goals.filter(Boolean) : []),
    [course?.goals]
  );
  const useAreaLabels = useMemo(
    () => (Array.isArray(course?.useAreas) ? course.useAreas.filter(Boolean) : []),
    [course?.useAreas]
  );

  const speakerList = (Array.isArray(course?.speakers) ? course.speakers : [])
    .map((s) => ({
      id: s.id,
      name: htmlToPlainText(s.name || '').trim() || 'Speaker',
      profileimage: s.profileimage || '',
    }));

  // Hero media: admin view should be lightweight – always use course cover image like a small card,
  // do not auto-play or embed the first video here (videos are visible in curriculum instead).
  const heroMedia = useMemo(
    () => ({
      type: 'image',
      url: course?.image || '',
    }),
    [course?.image]
  );

  const getSectionPreviewType = (section) => {
    if (section.videoUrl) return 'video';
    if (Array.isArray(section.images) && section.images.length > 0) return 'images';
    return 'text';
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) return null;
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([^&?]+)/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
  };

  const openPreview = (section) => {
    setPreviewSection(section);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewSection(null);
  };

  const openDeleteConfirm = (review) => {
    setReviewToDelete(review);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setReviewToDelete(null);
  };

  const handleConfirmDeleteReview = async () => {
    if (!reviewToDelete?.id || !course?.id) return;
    setDeleteLoading(true);
    try {
      await deleteReview(reviewToDelete.id);
      const reviews = await getCourseReviews(course.id);
      setCourseReviews(Array.isArray(reviews) ? reviews : []);
      closeDeleteConfirm();
      toast.success('Review deleted');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete review');
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderPreviewContent = () => {
    if (!previewSection) return null;
    const type = getSectionPreviewType(previewSection);
    if (type === 'video') {
      const url = (previewSection.videoUrl || '').trim();
      const embedUrl = getYouTubeEmbedUrl(url);
      return (
        <Stack spacing={2}>
          {embedUrl ? (
            <Box sx={{ position: 'relative', width: '100%', pt: '56.25%', bgcolor: 'grey.900' }}>
              <iframe
                title="Video preview"
                src={embedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                }}
              />
            </Box>
          ) : url ? (
            <Box component="video" src={url} controls sx={{ width: '100%', maxHeight: 400 }} />
          ) : null}
          {/* <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
            {url}
          </Typography> */}
        </Stack>
      );
    }
    if (type === 'images') {
      const images = Array.isArray(previewSection.images) ? previewSection.images : [];
      return (
        <Stack spacing={2}>
          {images.map((imgUrl, idx) => (
            <Box key={idx}>
              <Box
                component="img"
                src={imgUrl}
                alt=""
                sx={{ width: '100%', maxHeight: 360, objectFit: 'contain', display: 'block', borderRadius: 1 }}
              />
              {/* <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all', display: 'block', mt: 0.5 }}>
                {imgUrl}
              </Typography> */}
            </Box>
          ))}
        </Stack>
      );
    }
    return <RichTextContent html={previewSection.content || '<p>—</p>'} />;
  };

  if (loading && !course) {
    return <LoadingScreen />;
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
              href={paths.admin.course.list}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent sx={{ p: 0, display: 'block' }}>
      {/* Compact hero with title overlay */}
      <Box
        sx={{
          width: '100%',
          position: 'relative',
          bgcolor: 'grey.900',
          height: { xs: 200, sm: 260, md: 300 },
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src={heroMedia.url || defaultCourseImage}
          alt={course?.title}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, ${alpha(theme.palette.grey[900], 0.15)} 0%, ${alpha(
              theme.palette.grey[900],
              0.72
            )} 100%)`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            px: { xs: 2, lg: 3 },
            pb: 2.5,
            pt: 6,
          }}
        >
          <Stack spacing={1.25} sx={{ maxWidth: 920 }}>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              <Chip
                size="small"
                label={course.level || 'Beginner'}
                color={
                  course.level === 'Advanced'
                    ? 'error'
                    : course.level === 'Intermediate'
                      ? 'warning'
                      : 'info'
                }
                sx={{ fontWeight: 700 }}
              />
              <Chip
                size="small"
                label={course.freeOrPaid ? 'Paid' : 'Free'}
                color={course.freeOrPaid ? 'success' : 'default'}
                sx={{ fontWeight: 700 }}
              />
              {course.isBundle ? (
                <Chip
                  size="small"
                  icon={<Iconify icon="solar:layers-bold" width={16} />}
                  label="Bundle"
                  color="secondary"
                  variant="filled"
                  sx={{ fontWeight: 700 }}
                />
              ) : null}
            </Stack>
            <Typography
              variant="h4"
              sx={{
                color: 'common.white',
                fontWeight: 800,
                lineHeight: 1.25,
                textShadow: '0 1px 2px rgba(0,0,0,0.35)',
              }}
            >
              {course.title}
            </Typography>
            {course.freeOrPaid && (Number(course.amount) || 0) > 0 ? (
              <Typography variant="subtitle1" sx={{ color: 'common.white', fontWeight: 700 }}>
                ${Number(course.amount || 0).toFixed(2)}
              </Typography>
            ) : null}
          </Stack>
        </Box>
      </Box>

      {/* Content below hero */}
      <Box sx={{ px: { xs: 2, lg: 3 }, py: 3, pt: 2.5 }}>
        <CustomBreadcrumbs
          heading="Course details"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Course', href: paths.admin.course.list },
            { name: course?.title },
          ]}
          action={
            <Stack direction="row" spacing={1}>
              <Button
                component={RouterLink}
                href={paths.admin.course.assessments(course?.id)}
                variant="outlined"
                startIcon={<Iconify icon="solar:clipboard-check-bold" />}
              >
                Assessments
              </Button>
              <Button
                component={RouterLink}
                href={paths.admin.course.edit(course?.id)}
                variant="contained"
                startIcon={<Iconify icon="solar:pen-bold" />}
              >
                Edit course
              </Button>
            </Stack>
          }
          sx={{ mb: 2.5 }}
        />

        <Card
          sx={{
            mb: 2.5,
            px: 1,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.grey[500], 0.04),
            boxShadow: 'none',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => {
              if (v === 'assignments' && course?.id) {
                navigate(paths.admin.course.assessments(course.id));
                return;
              }
              setActiveTab(v);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 52,
              '& .MuiTab-root': {
                minHeight: 52,
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab value="overview" label="Overview" icon={<Iconify icon="solar:info-circle-bold" width={18} sx={{ mr: 0.5 }} />} iconPosition="start" />
            <Tab value="curriculum" label="Curriculum" icon={<Iconify icon="solar:widget-5-bold" width={18} sx={{ mr: 0.5 }} />} iconPosition="start" />
            <Tab value="question-bank" label="Question bank" icon={<Iconify icon="solar:clipboard-list-bold" width={18} sx={{ mr: 0.5 }} />} iconPosition="start" />
            <Tab value="assignments" label="Assessments" icon={<Iconify icon="solar:clipboard-check-bold" width={18} sx={{ mr: 0.5 }} />} iconPosition="start" />
            <Tab value="reviews" label="Reviews" icon={<Iconify icon="solar:chat-round-dots-bold" width={18} sx={{ mr: 0.5 }} />} iconPosition="start" />
          </Tabs>
        </Card>

      {activeTab === 'overview' && (
      <Card
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
        }}
      >
        <Stack spacing={0.5} sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Course information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Key details, targeting, and marketplace metadata for this course.
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          <Grid xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                height: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 700 }}>
                Title
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{course.title || '—'}</Typography>
            </Box>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                height: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 700 }}>
                Level
              </Typography>
              <Chip
                label={course.level || 'Beginner'}
                color={course.level === 'Advanced' ? 'error' : course.level === 'Intermediate' ? 'warning' : 'info'}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Box>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                height: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 700 }}>
                Type
              </Typography>
              <Chip
                label={course.freeOrPaid ? 'Paid' : 'Free'}
                color={course.freeOrPaid ? 'success' : 'default'}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Box>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                height: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 700 }}>
              Bundle
            </Typography>
            {course.isBundle ? (
              <Stack spacing={0.5}>
                <Chip
                  size="small"
                  color="secondary"
                  variant="soft"
                  icon={<Iconify icon="solar:layers-bold" width={16} />}
                  label={`${bundleIds.length} linked program${bundleIds.length === 1 ? '' : 's'}`}
                  sx={{ width: 'fit-content', fontWeight: 700 }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Learners get access to each program below when they own this bundle.
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Standard single course
              </Typography>
            )}
            </Box>
          </Grid>
          {course.freeOrPaid && (Number(course.amount) || 0) > 0 && (
            <Grid xs={12} sm={6} md={4}>
              <Box
                sx={{
                  p: 2,
                  height: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.success.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                }}
              >
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 700 }}>
                Amount
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                ${Number(course.amount || 0).toFixed(2)}
              </Typography>
              </Box>
            </Grid>
          )}
          <Grid xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                height: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 700 }}>
              Created
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {course.createdAt ? fDate(course.createdAt) : '—'}
            </Typography>
            </Box>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Box
              sx={{
                p: 2,
                height: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 700 }}>
              Updated
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {course.updatedAt ? fDate(course.updatedAt) : '—'}
            </Typography>
            </Box>
          </Grid>

          <Grid xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 700 }}>
              Roles
            </Typography>
            {roleLabels.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {roleLabels.map((label) => (
                  <Chip key={label} label={label} size="small" variant="soft" color="primary" />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">—</Typography>
            )}
            </Box>
          </Grid>

          <Grid xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 700 }}>
              AI levels
            </Typography>
            {aiLevelLabels.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {aiLevelLabels.map((label) => (
                  <Chip key={label} label={label} size="small" variant="soft" color="warning" />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">—</Typography>
            )}
            </Box>
          </Grid>

          <Grid xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 700 }}>
              Goals
            </Typography>
            {goalLabels.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {goalLabels.map((label) => (
                  <Chip key={label} label={label} size="small" variant="soft" color="success" />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">—</Typography>
            )}
            </Box>
          </Grid>

          <Grid xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 700 }}>
              Use areas
            </Typography>
            {useAreaLabels.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {useAreaLabels.map((label) => (
                  <Chip key={label} label={label} size="small" variant="soft" color="secondary" />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">—</Typography>
            )}
            </Box>
          </Grid>

          <Grid xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 700 }}>
              Languages
            </Typography>
            {languageLabels.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {languageLabels.map((label) => (
                  <Chip key={label} label={label} size="small" variant="soft" />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">—</Typography>
            )}
            </Box>
          </Grid>

          <Grid xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 700 }}>
              Speakers
            </Typography>
            {speakerList.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {speakerList.map((speaker) => (
                  <Chip
                    key={speaker.id}
                    avatar={<Avatar src={speaker.profileimage} alt={speaker.name} sx={{ width: 24, height: 24 }} />}
                    label={speaker.name}
                    size="small"
                    variant="soft"
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">—</Typography>
            )}
            </Box>
          </Grid>

          {(() => {
            let market = {};
            if (course.marketData && typeof course.marketData === 'string') {
              try {
                // marketData is stored as JSON string, possibly double-encoded
                const firstParse = JSON.parse(course.marketData);
                if (typeof firstParse === 'string') {
                  market = JSON.parse(firstParse);
                } else if (typeof firstParse === 'object' && firstParse !== null) {
                  market = firstParse;
                }
              } catch {
                market = {};
              }
            }
            const rawLessonCount = market.lessonCount ?? market.lessons;
            const rawCpeHours = market.cpeHours ?? market.cpe ?? market.hours;
            const lessonCountText =
              rawLessonCount != null && rawLessonCount !== ''
                ? `${Number(rawLessonCount)} lesson${Number(rawLessonCount) === 1 ? '' : 's'}`
                : null;
            const cpeHoursText =
              rawCpeHours != null && rawCpeHours !== ''
                ? `${Number(rawCpeHours)} CPE Hour${Number(rawCpeHours) === 1 ? '' : 's'}`
                : null;
            const hasMarketFacts = Boolean(lessonCountText || cpeHoursText);
            if (!hasMarketFacts) return null;

            return (
              <Grid xs={12}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
                >
                  Market Data
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {lessonCountText && (
                    <Chip
                      size="small"
                      variant="soft"
                      color="primary"
                      label={lessonCountText}
                    />
                  )}
                  {cpeHoursText && (
                    <Chip
                      size="small"
                      variant="soft"
                      color="secondary"
                      label={cpeHoursText}
                    />
                  )}
                </Stack>
              </Grid>
            );
          })()}

          {course.isBundle && (
            <Grid xs={12}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.28)}`,
                  bgcolor: alpha(theme.palette.secondary.main, 0.06),
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Iconify icon="solar:layers-bold" width={22} sx={{ color: 'secondary.main' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Programs included in this bundle
                  </Typography>
                </Stack>
                {bundleLinkedLoading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}
                {!bundleLinkedLoading && bundleLinkedCourses.length === 0 && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {bundleIds.length > 0
                      ? 'Could not load some linked courses. Check IDs in edit view.'
                      : 'No courses linked yet. Edit this bundle to add programs.'}
                  </Typography>
                )}
                <Stack spacing={1}>
                  {bundleLinkedCourses.map((c, index) => (
                    <Button
                      key={c.id}
                      component={RouterLink}
                      href={paths.admin.course.edit(c.id)}
                      variant="soft"
                      color="inherit"
                      sx={{
                        justifyContent: 'flex-start',
                        py: 1.25,
                        px: 1.5,
                        borderRadius: 1.5,
                        border: `1px solid ${theme.palette.divider}`,
                        textAlign: 'left',
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                      endIcon={<Iconify icon="solar:pen-bold" width={18} />}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: 'secondary.main',
                            minWidth: 24,
                            textAlign: 'center',
                          }}
                        >
                          {index + 1}
                        </Typography>
                        <Avatar
                          src={c.image || undefined}
                          variant="rounded"
                          sx={{ width: 40, height: 40 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {c.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {c.freeOrPaid ? 'Paid' : 'Free'} · {c.level || '—'}
                          </Typography>
                        </Box>
                      </Stack>
                    </Button>
                  ))}
                </Stack>
              </Box>
            </Grid>
          )}

          <Grid xs={12}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Description
            </Typography>
            {course.description ? (
              <RichTextContent html={course.description} sx={{ color: 'text.secondary' }} />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                —
              </Typography>
            )}
          </Grid>
        </Grid>
      </Card>
      )}

      {activeTab === 'curriculum' && (
      <Card
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
        }}
      >
        <Stack spacing={0.5} sx={{ mb: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Curriculum
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Modules and sections available in this course.
          </Typography>
        </Stack>
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
                                  '&.Mui-expanded': { minHeight: 48 },
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
                                      {sectionCount} {sectionCount === 1 ? 'Lesson' : 'Lesson(s)'}
                                    </Typography>
                                  </Stack>
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails sx={{ pt: 0, pb: 1.5, px: 2 }}>
                                <Stack spacing={1}>
                                  {sections.map((section, sectionIndex) => {
                                    const hasVideo = Boolean(section.videoUrl);
                                    const hasImages = Array.isArray(section.images) && section.images.length > 0;
                                    const isYouTubeVideo =
                                      hasVideo &&
                                      (section.videoUrl.includes('youtube.com') ||
                                        section.videoUrl.includes('youtu.be'));
                                    const fallbackPreviewImage = course?.image || defaultCourseImage;
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
                                        direction="row"
                                        alignItems="center"
                                        spacing={1.5}
                                        sx={{
                                          py: 1,
                                          px: 1.5,
                                          borderRadius: 1,
                                          bgcolor: alpha(theme.palette.grey[500], 0.04),
                                          cursor: 'pointer',
                                          textDecoration: 'none',
                                          color: 'inherit',
                                          transition: 'all 0.2s ease',
                                          '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            transform: 'translateX(4px)',
                                          },
                                        }}
                                        onClick={() => openPreview(section)}
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
                                          <Typography
                                            variant="caption"
                                            sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                                          >
                                            {mediaLabel}
                                          </Typography>
                                        </Box>
                                      </Stack>
                                    );
                                  })}
                                </Stack>
                              </AccordionDetails>
                            </Accordion>
                          );
                        })}
          </Stack>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No curriculum added yet.
          </Typography>
        )}
      </Card>
      )}

      {activeTab === 'question-bank' && course?.id && (
        <CourseQuestionBankPanel courseId={course.id} />
      )}

      {activeTab === 'reviews' && (
      <Card
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
        }}
      >
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Reviews {courseReviews.length > 0 ? `(${courseReviews.length})` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Learner ratings and feedback for this course.
          </Typography>
        </Stack>
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
                  {courseReviews.length > 0
                    ? `${(courseReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / courseReviews.length).toFixed(1)}/5`
                    : '0/5'}
                </Typography>
                <Rating
                  readOnly
                  value={
                    courseReviews.length > 0
                      ? courseReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / courseReviews.length
                      : 0
                  }
                  precision={0.1}
                  size="medium"
                  sx={{ '& .MuiRating-iconFilled': { color: 'warning.main' } }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  ({courseReviews.length} review{courseReviews.length !== 1 ? 's' : ''})
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
            {courseReviews.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', py: 3 }}>
                No reviews yet.
              </Typography>
            ) : (
              <Stack spacing={3} sx={{ pt: 1 }}>
                {(() => {
                  const pageCount = Math.max(1, Math.ceil(courseReviews.length / REVIEWS_PER_PAGE));
                  const displayedReviews = courseReviews.slice(
                    (reviewsPage - 1) * REVIEWS_PER_PAGE,
                    reviewsPage * REVIEWS_PER_PAGE
                  );
                  return (
                    <>
                      {displayedReviews.map((review) => {
                  const revUser = review.user || {};
                  const name =
                    [revUser.firstname, revUser.lastname].filter(Boolean).join(' ') || revUser.username || 'User';
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
                      <IconButton
                        aria-label="Delete review"
                        onClick={() => openDeleteConfirm(review)}
                        color="error"
                        sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                      </IconButton>
                    </Stack>
                  );
                })}
                      {pageCount > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                          <Pagination
                            count={pageCount}
                            page={reviewsPage}
                            onChange={(_, value) => setReviewsPage(value)}
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
            )}
          </>
        )}
      </Card>
      )}

      </Box>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={closeDeleteConfirm}
        title="Delete review"
        content="Are you sure you want to delete this review? This action cannot be undone."
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDeleteReview} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        }
      />

      <Dialog open={previewOpen} onClose={closePreview} maxWidth="md" fullWidth>
        <DialogTitle>
          {previewSection?.title || 'Preview'}
          <IconButton
            aria-label="close"
            onClick={closePreview}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Iconify icon="solar:close-circle-bold" width={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {renderPreviewContent()}
        </DialogContent>
        {/* <DialogActions>
          <Button onClick={closePreview}>Close</Button>
        </DialogActions> */}
      </Dialog>
    </DashboardContent>
  );
}
