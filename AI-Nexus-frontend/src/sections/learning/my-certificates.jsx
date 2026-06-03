import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { useAuthContext } from 'src/auth/hooks';
import { LoadingScreen } from 'src/components/loading-screen';
import { LearningGuestSignInPrompt } from './components/learning-guest-sign-in-prompt';
import { LearningSectionHeader } from './components/learning-section-header';
import { pdf } from '@react-pdf/renderer';
import { CertificatePdfDocument } from './certificate-pdf-document';
import { svgToPngDataUrl } from 'src/utils/svg-to-png';
import {
  buildCertificateLinkedInShareText,
  buildLinkedInFeedShareUrl,
} from 'src/utils/linkedin-share';
import { courseService } from 'src/services/course.service';
import { appSettingsService } from 'src/services/app-settings.service';

// ----------------------------------------------------------------------

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
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

export function MyCertificates() {
  const theme = useTheme();
  const { authenticated, loading: authLoading } = useAuthContext();
  const [certificateRows, setCertificateRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [logoSource, setLogoSource] = useState('/logo/logo-full.svg');

  useEffect(() => {
    let cancelled = false;

    const resolveDynamicLogo = async () => {
      const fallbackLogo =
        (typeof window !== 'undefined' && window.localStorage.getItem('site-logo-url')) ||
        '/logo/logo-full.svg';

      let candidate = fallbackLogo;
      try {
        const settings = await appSettingsService.getPublic();
        if (settings?.logoUrl) candidate = settings.logoUrl;
      } catch {
        // Keep fallback logo when settings API is unavailable.
      }

      const isSvg = /\.svg(\?.*)?$/i.test(String(candidate || ''));
      if (isSvg) {
        const dataUrl = await svgToPngDataUrl(candidate, 96, 96);
        if (!cancelled) setLogoSource(dataUrl || '/logo/logo-full.svg');
      } else if (!cancelled) {
        setLogoSource(candidate || '/logo/logo-full.svg');
      }
    };

    resolveDynamicLogo();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authLoading) {
      return () => {};
    }
    if (!authenticated) {
      setCertificateRows([]);
      setLoading(false);
      return () => {};
    }
    let cancelled = false;
    const loadCertificates = async () => {
      try {
        setLoading(true);
        const rows = await courseService.getMyCertificates();
        if (!cancelled) setCertificateRows(rows);
      } catch {
        if (!cancelled) setCertificateRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadCertificates();
    return () => {
      cancelled = true;
    };
  }, [authenticated, authLoading]);

  const certificates = useMemo(() => {
    if (!certificateRows?.length) return [];
    return certificateRows
      .map((row) => {
        const market = parseMarketData(row.marketData);
        const cpeHoursRaw = market.cpeHours ?? market.cpe ?? market.hours;
        const cpeHours = cpeHoursRaw != null && cpeHoursRaw !== '' ? Number(cpeHoursRaw) : null;
        return {
          id: row.id,
          courseId: row.courseId,
          courseTitle: row.courseTitle || 'Untitled Course',
          certificateNo: row.certificateNo || '',
          learnerName: row.learnerName || 'Learner',
          completedAt: row.completedAt ? formatCompletedDate(row.completedAt) : '—',
          cpeHours: cpeHours != null ? cpeHours : '—',
        };
      })
      .filter(Boolean);
  }, [certificateRows]);

  const handleDownload = async (cert) => {
    setDownloadingId(cert.id);
    try {
      const blob = await pdf(
        <CertificatePdfDocument
          courseTitle={cert.courseTitle}
          learnerName={cert.learnerName}
          completedAt={cert.completedAt}
          cpeHours={cert.cpeHours}
          logoSource={logoSource}
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
    setPreviewLoading(true);
    try {
      const blob = await pdf(
        <CertificatePdfDocument
          courseTitle={cert.courseTitle}
          learnerName={cert.learnerName}
          completedAt={cert.completedAt}
          cpeHours={cert.cpeHours}
          logoSource={logoSource}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const previewWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!previewWindow) {
        console.error('Certificate preview blocked by browser popup settings.');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('Certificate PDF preview failed:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleShareLinkedIn = (cert) => {
    const url = buildLinkedInFeedShareUrl(
      buildCertificateLinkedInShareText({
        courseTitle: cert?.courseTitle,
        certificateNo: cert?.certificateNo,
      })
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  // Guest: same reusable sign-in shell as Progress & Favorites (`learning-guest-sign-in-prompt` presets.certificates).
  if (!authenticated) {
    return <LearningGuestSignInPrompt variant="certificates" />;
  }

  return (
    <>
      <LearningSectionHeader
        icon="solar:medal-ribbons-star-bold"
        iconGradient={(t) =>
          `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.secondary.main} 100%)`
        }
        title="My Certificates"
        subtitle="Certificates earned from completed courses"
      />

      <Grid container spacing={{ xs: 2, sm: 2.5, md: 2 }}>
        {(() => {
          const minDesktopCards = 4;
          const placeholdersNeeded = Math.max(0, minDesktopCards - certificates.length);
          const displayedCertificates = [
            ...certificates.map((cert) => ({ cert, isPlaceholder: false })),
            ...Array.from({ length: placeholdersNeeded }, () => ({ cert: null, isPlaceholder: true })),
          ];
          return (
            <>
              {displayedCertificates.map((item, index) => (
          <Grid key={item.cert?.id || `placeholder-${index}`} xs={12} sm={6} md={3}>
            {item.isPlaceholder ? (
              <Card
                sx={{
                  p: { xs: 2, md: 1.75 },
                  height: '100%',
                  minHeight: 190,
                  borderRadius: 2,
                  border: `1px dashed ${alpha(theme.palette.primary.main, 0.32)}`,
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  Empty certificate slot
                </Typography>
              </Card>
            ) : (
            <Card
              sx={{
                p: { xs: 2, md: 1.75 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                bgcolor: 'background.paper',
                boxShadow: `0 8px 24px ${alpha(theme.palette.grey[500], 0.12)}`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  right: -18,
                  top: -18,
                  width: 92,
                  height: 92,
                  borderRadius: '50%',
                  background: alpha(theme.palette.primary.main, 0.06),
                },
                '& .certificate-watermark': {
                  position: 'absolute',
                  left: 10,
                  bottom: 10,
                  color: theme.palette.success.main,
                  pointerEvents: 'none',
                },
                '&:hover': {
                  boxShadow: `0 14px 30px ${alpha(theme.palette.grey[500], 0.2)}`,
                  transform: 'translateY(-3px)',
                  borderColor: alpha(theme.palette.primary.main, 0.32),
                },
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.25 }}>
                <Box
                  sx={{
                    width: { xs: 44, lg: 38 },
                    height: { xs: 44, lg: 38 },
                    borderRadius: 1.25,
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Iconify icon="solar:medal-ribbons-star-bold" width={24} sx={{ color: 'success.main' }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                  <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.2, fontSize: '0.8rem', fontWeight: 700, letterSpacing: 0.6 }}>
                    Certificate
                  </Typography>
              
                </Box>
                <Chip
                  size="small"
                  label="Issued"
                  color="success"
                  variant="soft"
                  sx={{ flexShrink: 0 }}
                />
              </Stack>

              <Divider sx={{ mb: 1.35, borderColor: alpha(theme.palette.grey[500], 0.18) }} />

              <Stack spacing={0.7} sx={{ mb: 1.4 }}>
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  <Iconify icon="solar:book-bold" width={16} sx={{ color: 'text.secondary', mt: 0.2 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 400,
                      fontSize: '0.875rem',
                      width: '100%',
                      maxWidth: '100%',
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      lineHeight: 1.3,
                    }}
                  >
                    Course: {item.cert.courseTitle || '—'}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:clipboard-text-bold" width={16} sx={{ color: 'text.secondary' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      width: '100%',
                      maxWidth: '100%',
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      lineHeight: 1.3,
                    }}
                  >
                    No: {item.cert.certificateNo || '—'}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:calendar-bold" width={16} sx={{ color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 400, fontSize: '0.875rem' }}>
                    Completed: {item.cert.completedAt}
                  </Typography>
                </Stack>
                {typeof item.cert.cpeHours === 'number' && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, pl: 3.25, fontSize: '0.875rem' }}>
                    {`${item.cert.cpeHours} CPE Hour${item.cert.cpeHours !== 1 ? 's' : ''}`}
                  </Typography>
                )}
              </Stack>

              <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ mt: 'auto', pt: 1 }}>
                <Tooltip title="Share on LinkedIn">
                  <IconButton
                    size="small"
                    color="info"
                    onClick={() => handleShareLinkedIn(item.cert)}
                    sx={{
                      border: `1px solid ${alpha(theme.palette.info.main, 0.28)}`,
                      bgcolor: alpha(theme.palette.info.main, 0.08),
                    }}
                  >
                    <Iconify icon="mdi:linkedin" width={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Preview">
                  <IconButton
                    size="small"
                    color="default"
                    onClick={() => handlePreview(item.cert)}
                    disabled={previewLoading}
                    sx={{
                      border: `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
                      bgcolor: alpha(theme.palette.grey[500], 0.04),
                    }}
                  >
                    <Iconify icon="solar:eye-bold" width={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleDownload(item.cert)}
                    disabled={downloadingId === item.cert?.id}
                    sx={{
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    }}
                  >
                    <Iconify icon="solar:download-bold" width={18} />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Iconify icon="solar:verified-check-bold" width={54} className="certificate-watermark" />
            </Card>
            )}
          </Grid>
              ))}
            </>
          );
        })()}
      </Grid>
    </>
  );
}
