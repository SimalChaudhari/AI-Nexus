import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

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
import { RichTextContent } from 'src/components/html-content';
import { fetchSpeakers } from 'src/store/slices/speakerSlice';
import { courseService } from 'src/services/course.service';
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
  const dispatch = useDispatch();
  const { speakers } = useSelector((state) => state.speakers);
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

  useEffect(() => {
    dispatch(fetchSpeakers());
  }, [dispatch]);

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

  const languageIds = Array.isArray(course?.languageIds) ? course.languageIds : [];
  const languageLabels = languageIds.filter((label) => label && typeof label === 'string');

  const speakerIds = Array.isArray(course?.speakerIds) ? course.speakerIds : [];
  const speakerList = speakerIds
    .map((id) => (speakers || []).find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => ({ id: s.id, name: s.name, profileimage: s.profileimage || '' }));

  // Hero media: first section video if available, else course image (YouTube-style)
  const heroMedia = useMemo(() => {
    if (!course) return { type: 'image', url: '' };
    const firstSectionWithVideo = courseModules
      .flatMap((m) => m.sections || [])
      .find((s) => s?.videoUrl);
    const videoUrl = firstSectionWithVideo?.videoUrl?.trim();
    if (videoUrl) {
      const embedUrl = (() => {
        if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) return null;
        const match = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([^&?]+)/);
        return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
      })();
      if (embedUrl) return { type: 'video', url: embedUrl };
      return { type: 'video', url: videoUrl };
    }
    return { type: 'image', url: course.image || '' };
  }, [course, courseModules]);

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

  if (loading) {
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
      {/* Full-width hero (YouTube-style): video or image */}
      <Box
        sx={{
          width: '100%',
          position: 'relative',
          bgcolor: 'grey.900',
          aspectRatio: '16/9',
          maxHeight: { xs: 240, sm: 360, md: 480 },
        }}
      >
        {heroMedia.type === 'video' && heroMedia.url ? (
          heroMedia.url.startsWith('https://www.youtube-nocookie.com/embed/') ? (
            <iframe
              title="Course preview"
              src={heroMedia.url}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
            />
          ) : (
            <Box
              component="video"
              src={heroMedia.url}
              controls
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          )
        ) : (
          <Box
            component="img"
            src={heroMedia.url || '/assets/images/cover/cover-1.jpg'}
            alt={course?.title}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </Box>

      {/* Content below hero: breadcrumbs, tabs, table-like content */}
      <Box sx={{ px: { xs: 2, lg: 3 }, py: 3, pt: 2 }}>
        <CustomBreadcrumbs
          heading="Course Details"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Course', href: paths.admin.course.list },
            { name: course?.title },
          ]}
          action={
            <Button
              component={RouterLink}
              href={paths.admin.course.edit(course?.id)}
              variant="contained"
              startIcon={<Iconify icon="solar:pen-bold" />}
            >
              Edit
            </Button>
          }
          sx={{ mb: 2 }}
        />

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            mb: 2,
            '& .MuiTab-root': { minHeight: 48, fontWeight: 600 },
          }}
        >
          <Tab value="overview" label="Overview" icon={<Iconify icon="solar:info-circle-bold" width={18} sx={{ mr: 0.5 }} />} iconPosition="start" />
          <Tab value="curriculum" label="Curriculum" icon={<Iconify icon="solar:widget-5-bold" width={18} sx={{ mr: 0.5 }} />} iconPosition="start" />
          <Tab value="reviews" label="Reviews" icon={<Iconify icon="solar:chat-round-dots-bold" width={18} sx={{ mr: 0.5 }} />} iconPosition="start" />
        </Tabs>

      {activeTab === 'overview' && (
      <Card sx={{ p: 3 }}>
        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1.5} sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {course.title}
          </Typography>
          <Chip
            label={course.level || 'Beginner'}
            color={course.level === 'Advanced' ? 'error' : course.level === 'Intermediate' ? 'warning' : 'info'}
            size="small"
          />
          <Chip
            label={course.freeOrPaid ? 'Paid' : 'Free'}
            color={course.freeOrPaid ? 'success' : 'default'}
            size="small"
          />
        </Stack>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Course Information
        </Typography>

        <Grid container spacing={3}>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Title
            </Typography>
            <Typography variant="body2">{course.title || '—'}</Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Level
            </Typography>
            <Chip
              label={course.level || 'Beginner'}
              color={course.level === 'Advanced' ? 'error' : course.level === 'Intermediate' ? 'warning' : 'info'}
              size="small"
            />
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Type
            </Typography>
            <Chip
              label={course.freeOrPaid ? 'Paid' : 'Free'}
              color={course.freeOrPaid ? 'success' : 'default'}
              size="small"
            />
          </Grid>
          {course.freeOrPaid && (Number(course.amount) || 0) > 0 && (
            <Grid xs={12} sm={6} md={4}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                Amount
              </Typography>
              <Typography variant="body2">${Number(course.amount || 0).toFixed(2)}</Typography>
            </Grid>
          )}
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Created At
            </Typography>
            <Typography variant="body2">
              {course.createdAt ? new Date(course.createdAt).toLocaleString() : '—'}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Updated At
            </Typography>
            <Typography variant="body2">
              {course.updatedAt ? new Date(course.updatedAt).toLocaleString() : '—'}
            </Typography>
          </Grid>

          <Grid xs={12}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Languages
            </Typography>
            {languageLabels.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {languageLabels.map((label) => (
                  <Chip key={label} label={label} size="small" variant="soft" />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2">—</Typography>
            )}
          </Grid>

          <Grid xs={12}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
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
              <Typography variant="body2">—</Typography>
            )}
          </Grid>

          {(() => {
            const raw = course.marketData != null ? String(course.marketData) : '';
            let text = raw.trim();
            if (raw.startsWith('"') && raw.endsWith('"')) {
              try {
                text = JSON.parse(raw);
              } catch {
                // use as-is
              }
            }
            const lines = text ? String(text).split(/\r?\n/).filter((line) => line.trim() !== '') : [];
            return lines.length > 0 ? (
              <Grid xs={12}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                  Market Data
                </Typography>
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    pl: 2.5,
                    py: 1.5,
                    px: 2,
                    borderRadius: 1.5,
                    bgcolor: 'background.neutral',
                    border: (t) => `1px solid ${t.palette.divider}`,
                    fontSize: '0.8125rem',
                    lineHeight: 1.8,
                    maxHeight: 280,
                    overflow: 'auto',
                  }}
                >
                  {lines.map((line, index) => (
                    <Box component="li" key={index} sx={{ mb: 0.5 }}>
                      {line.trim()}
                    </Box>
                  ))}
                </Box>
              </Grid>
            ) : null;
          })()}

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
      <Card sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Curriculum
        </Typography>
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
                      '& .MuiAccordionSummary-content': { my: 0 },
                      '&.Mui-expanded': { minHeight: 48 },
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
                      {sections.map((section, sectionIndex) => {
                        const previewType = getSectionPreviewType(section);
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
                              '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.08) },
                            }}
                            onClick={() => openPreview(section)}
                          >
                            <Iconify icon="solar:play-bold" width={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                {sectionIndex + 1}. {section.title}
                              </Typography>
                              {section.videoUrl && (
                                <Typography
                                  variant="caption"
                                  component="a"
                                  href={section.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  sx={{
                                    color: 'primary.main',
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                    display: 'block',
                                    mt: 0.25,
                                    '&:hover': { textDecoration: 'underline' },
                                  }}
                                >
                                  {section.videoUrl}
                                </Typography>
                              )}
                              {previewType === 'images' && Array.isArray(section.images) && section.images.length > 0 && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                  {section.images.length} image(s) — click to preview
                                </Typography>
                              )}
                              {previewType === 'text' && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                  Text lesson — click to preview
                                </Typography>
                              )}
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

      {activeTab === 'reviews' && (
      <Card sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Reviews {courseReviews.length > 0 ? `(${courseReviews.length})` : ''}
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
