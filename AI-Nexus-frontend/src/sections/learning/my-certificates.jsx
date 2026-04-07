import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCourses } from 'src/store/slices/courseSlice';
import { useAuthContext } from 'src/auth/hooks';
import { LoadingScreen } from 'src/components/loading-screen';
import { pdf } from '@react-pdf/renderer';
import { CertificatePdfDocument } from './certificate-pdf-document';
import { svgToPngDataUrl } from 'src/utils/svg-to-png';
import Pagination, { paginationClasses } from '@mui/material/Pagination';

// ----------------------------------------------------------------------

const CERTIFICATES_PER_PAGE = 8;

function parseMarketData(marketData) {
  if (!marketData || typeof marketData !== 'string') return {};
  try {
    return JSON.parse(marketData) || {};
  } catch {
    return {};
  }
}

function formatCompletedDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10);
}

export function MyCertificates() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { authenticated } = useAuthContext();
  const { courses } = useSelector((state) => state.courses);
  const [progressByCourse, setProgressByCourse] = useState({});
  const [modulesByCourse, setModulesByCourse] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [previewCert, setPreviewCert] = useState(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [logoPngDataUrl, setLogoPngDataUrl] = useState(null);

  useEffect(() => {
    svgToPngDataUrl('/logo/logo-full.svg', 96, 96).then((dataUrl) => {
      if (dataUrl) setLogoPngDataUrl(dataUrl);
    });
  }, []);

  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  useEffect(() => {
    if (!courses?.length) {
      setLoading(false);
      return () => {};
    }
    setProgressByCourse({});
    setModulesByCourse({});
    setLoading(false);
    return () => {};
  }, [authenticated, courses?.length]);

  const certificates = useMemo(() => {
    if (!courses?.length) return [];
    return courses
      .map((course) => {
        const progress = progressByCourse[course.id];
        const modules = modulesByCourse[course.id] || [];
        const flatSections = modules.flatMap((m) => m.sections || []);
        const totalLessons = flatSections.length;
        const viewedIds = Array.isArray(progress?.viewedSectionIds) ? progress.viewedSectionIds : [];
        const viewedInCourse = viewedIds.filter((id) => flatSections.some((s) => s.id === id));
        const viewedCount = viewedInCourse.length;
        const isComplete = totalLessons > 0 && viewedCount >= totalLessons;
        if (!isComplete) return null;
        const market = parseMarketData(course.marketData);
        const cpeHoursRaw = market.cpeHours ?? market.cpe ?? market.hours;
        const cpeHours = cpeHoursRaw != null && cpeHoursRaw !== '' ? Number(cpeHoursRaw) : null;
        return {
          id: course.id,
          courseId: course.id,
          courseTitle: course.title || 'Untitled Course',
          completedAt: progress?.lastAccessedAt ? formatCompletedDate(progress.lastAccessedAt) : '—',
          cpeHours: cpeHours != null ? cpeHours : '—',
        };
      })
      .filter(Boolean);
  }, [courses, progressByCourse, modulesByCourse]);

  // Reset to page 1 when certificate list shrinks
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(certificates.length / CERTIFICATES_PER_PAGE));
    if (page > maxPage) setPage(1);
  }, [certificates.length, page]);

  const handleDownload = async (cert) => {
    setDownloadingId(cert.id);
    try {
      const blob = await pdf(
        <CertificatePdfDocument
          courseTitle={cert.courseTitle}
          completedAt={cert.completedAt}
          cpeHours={cert.cpeHours}
          logoSource={logoPngDataUrl}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate-${(cert.courseTitle || 'Course').replace(/[^a-z0-9]/gi, '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Certificate PDF download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (cert) => {
    setPreviewCert(cert);
    setPreviewLoading(true);
    setPreviewPdfUrl(null);
    try {
      const blob = await pdf(
        <CertificatePdfDocument
          courseTitle={cert.courseTitle}
          completedAt={cert.completedAt}
          cpeHours={cert.cpeHours}
          logoSource={logoPngDataUrl}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (err) {
      console.error('Certificate PDF preview failed:', err);
      setPreviewCert(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
    setPreviewPdfUrl(null);
    setPreviewCert(null);
  };

  if (loading && authenticated) {
    return <LoadingScreen />;
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
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          }}
        >
          <Iconify icon="solar:medal-ribbons-star-bold" width={24} sx={{ color: 'common.white' }} />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            My Certificates
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Certificates earned from completed courses
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={3}>
        {(() => {
          const pageCount = Math.max(1, Math.ceil(certificates.length / CERTIFICATES_PER_PAGE));
          const displayedCertificates = certificates.slice(
            (page - 1) * CERTIFICATES_PER_PAGE,
            page * CERTIFICATES_PER_PAGE
          );
          return (
            <>
              {displayedCertificates.map((cert) => (
          <Grid key={cert.id} xs={12} sm={6} md={4}>
            <Card
              sx={{
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.24)}`,
                bgcolor: alpha(theme.palette.warning.main, 0.04),
                boxShadow: theme.customShadows.z8,
                transition: 'box-shadow 0.25s ease',
                '&:hover': { boxShadow: theme.customShadows.z16 },
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.warning.main, 0.16),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Iconify icon="solar:medal-ribbons-star-bold" width={28} sx={{ color: 'warning.main' }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                    Certificate of Completion
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                    {cert.courseTitle}
                  </Typography>
                </Box>
              </Stack>
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:calendar-bold" width={18} sx={{ color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Completed: {cert.completedAt}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:clock-circle-bold" width={18} sx={{ color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {typeof cert.cpeHours === 'number' ? `${cert.cpeHours} CPE Hour${cert.cpeHours !== 1 ? 's' : ''}` : cert.cpeHours}
                  </Typography>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<Iconify icon="solar:eye-bold" width={18} />}
                  component={RouterLink}
                  to={paths.learningCourse.details(cert.courseId)}
                  sx={{ flex: 1 }}
                >
                  View course
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<Iconify icon="solar:document-text-bold" width={18} />}
                  onClick={() => handlePreview(cert)}
                  disabled={previewLoading && previewCert?.id === cert.id}
                  sx={{ flex: 1 }}
                >
                  {previewLoading && previewCert?.id === cert.id ? 'Loading…' : 'Preview'}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  startIcon={<Iconify icon="solar:download-bold" width={18} />}
                  onClick={() => handleDownload(cert)}
                  disabled={downloadingId === cert.id}
                  sx={{ flex: 1 }}
                >
                  {downloadingId === cert.id ? 'Generating…' : 'Download'}
                </Button>
              </Stack>
            </Card>
          </Grid>
              ))}
              {pageCount > 1 && (
                <Grid xs={12} sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
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
                </Grid>
              )}
            </>
          );
        })()}
      </Grid>

      {certificates.length === 0 && (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Iconify icon="solar:medal-ribbons-star-bold" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            No certificates yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Complete courses to earn certificates.
          </Typography>
          <Button component={RouterLink} to={paths.learning} variant="contained" color="primary">
            Browse courses
          </Button>
        </Card>
      )}

      <Dialog
        open={!!previewCert}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          Certificate — {previewCert?.courseTitle}
          <IconButton
            aria-label="close"
            onClick={handleClosePreview}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Iconify icon="solar:close-circle-bold" width={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column', minHeight: 560 }}>
          {previewLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 400 }}>
              <Typography color="text.secondary">Generating certificate…</Typography>
            </Box>
          )}
          {!previewLoading && previewPdfUrl && (
            <Box
              component="iframe"
              src={previewPdfUrl}
              title="Certificate preview"
              sx={{
                flex: 1,
                width: '100%',
                minHeight: 560,
                border: 'none',
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={handleClosePreview} color="inherit">
            Close
          </Button>
          {previewCert && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<Iconify icon="solar:download-bold" width={18} />}
              onClick={async () => {
                await handleDownload(previewCert);
                handleClosePreview();
              }}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
