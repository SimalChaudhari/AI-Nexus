import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Button from '@mui/material/Button';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { useAuthContext } from 'src/auth/hooks';
import { LoadingScreen } from 'src/components/loading-screen';
import { LearningGuestSignInPrompt } from './components/learning-guest-sign-in-prompt';
import { LearningSectionHeader } from './components/learning-section-header';
import { courseService } from 'src/services/course.service';
import {
  formatCpeHoursLabel,
  mapCertificateRows,
  groupTranscriptByPillar,
  getCompletedTranscriptModules,
  getTranscriptModuleKey,
} from './components/credential-shared';
import {
  CREDENTIAL_GRID_PROPS,
  CREDENTIAL_GRID_SPACING,
  getCredentialCardSx,
} from './components/credential-card-shell';

// ----------------------------------------------------------------------

function TranscriptPillarHeading({ group }) {
  if (!group) return null;

  if (!group.pillarLabel) {
    return (
      <Typography
        variant="caption"
        sx={{
          fontWeight: 800,
          color: 'primary.main',
          display: 'block',
          fontSize: '0.75rem',
          lineHeight: 1.3,
          wordBreak: 'break-word',
        }}
      >
        {group.courseTitle || 'Course'}
      </Typography>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 800,
          color: 'primary.main',
          display: 'block',
          fontSize: '0.75rem',
          lineHeight: 1.3,
        }}
      >
        {group.pillarLabel}
      </Typography>
      {group.courseTitle ? (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
            mt: 0.25,
            fontSize: '0.7rem',
            lineHeight: 1.35,
            wordBreak: 'break-word',
          }}
        >
          {group.courseTitle}
        </Typography>
      ) : null}
    </Box>
  );
}

function CertificateTranscript({ transcript = [], compact = false }) {
  const theme = useTheme();
  const groups = groupTranscriptByPillar(transcript);

  if (!groups.length) {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary', py: 0.5, display: 'block' }}>
        No completed modules yet.
      </Typography>
    );
  }

  if (compact) {
    return (
      <Stack spacing={1.25}>
        {groups.map((group) => (
          <Box key={group.key} sx={{ minWidth: 0 }}>
            <Box sx={{ mb: 0.5 }}>
              <TranscriptPillarHeading group={group} />
            </Box>
            <Stack spacing={0.75}>
              {group.modules.map((module) => {
                const completedSections = (module.sections || []).filter((section) => section.isCompleted);
                return (
                  <Box
                    key={getTranscriptModuleKey(module)}
                    sx={{
                      px: 1.25,
                      py: 1,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.grey[500], 0.06),
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, display: 'block', lineHeight: 1.35, fontSize: '0.8125rem' }}
                    >
                      {module.moduleTitle || 'Module'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {completedSections.length} lesson{completedSections.length === 1 ? '' : 's'} completed
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.25}>
      {groups.map((group) => (
        <Box key={group.key} sx={{ minWidth: 0 }}>
          <Box sx={{ mb: 0.75 }}>
            <TranscriptPillarHeading group={group} />
          </Box>
          <Stack spacing={0.75}>
            {group.modules.map((module) => {
              const completedSections = (module.sections || []).filter((section) => section.isCompleted);
              return (
                <Accordion
                  key={getTranscriptModuleKey(module)}
                  disableGutters
                  elevation={0}
                  sx={{
                    border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
                    borderRadius: '8px !important',
                    '&:before': { display: 'none' },
                    overflow: 'hidden',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" width={16} />}
                    sx={{ px: 1.25, minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                  >
                    <Stack spacing={0} sx={{ minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {module.moduleTitle || 'Module'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        {module.completedSections ?? completedSections.length}/
                        {module.totalSections ?? completedSections.length} lessons
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 1.25, pt: 0, pb: 1 }}>
                    <Stack spacing={0.35}>
                      {completedSections.map((section) => (
                        <Stack
                          key={section.sectionId || section.sectionTitle}
                          direction="row"
                          spacing={0.5}
                          alignItems="flex-start"
                        >
                          <Iconify
                            icon="solar:check-circle-bold"
                            width={14}
                            sx={{ color: 'success.main', mt: 0.1, flexShrink: 0 }}
                          />
                          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.35 }}>
                            {section.sectionTitle || 'Lesson'}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function CertificateCard({
  cert,
  theme,
  previewLoading,
  downloadingId,
  onShareLinkedIn,
  onPreview,
  onDownload,
}) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const moduleCount = getCompletedTranscriptModules(cert.transcript).length;
  const pillarCount = groupTranscriptByPillar(cert.transcript).length;

  return (
    <Card sx={getCredentialCardSx(theme)}>
      <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mb: 1.25 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 1.25,
            bgcolor: alpha(theme.palette.success.main, 0.12),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Iconify icon="solar:medal-ribbons-star-bold" width={22} sx={{ color: 'success.main' }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              letterSpacing: 0.5,
              fontSize: '0.72rem',
              textTransform: 'uppercase',
            }}
          >
            Certificate
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.35,
              fontSize: { xs: '0.95rem', md: '1rem' },
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {cert.courseTitle}
          </Typography>
        </Box>
        <Chip size="small" label="Issued" color="success" variant="soft" sx={{ height: 24, fontSize: '0.75rem' }} />
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1.25 }}>
        <Chip
          size="small"
          variant="outlined"
          label={formatCpeHoursLabel(cert.earnedCpeHours)}
          sx={{ height: 26, fontSize: '0.75rem', fontWeight: 600 }}
        />
      </Stack>

      <Stack spacing={0.5} sx={{ mb: 1.25 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4, fontSize: '0.8125rem' }}>
          <Box component="span" sx={{ fontWeight: 600 }}>No:</Box> {cert.certificateNo || '—'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4, fontSize: '0.8125rem' }}>
          <Box component="span" sx={{ fontWeight: 600 }}>Completed:</Box> {cert.completedAt}
        </Typography>
      </Stack>

      {moduleCount > 0 ? (
        <Box sx={{ mb: 1.25 }}>
          <Button
            size="small"
            color="inherit"
            onClick={() => setTranscriptOpen((open) => !open)}
            endIcon={
              <Iconify
                icon={transcriptOpen ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                width={16}
              />
            }
            sx={{
              px: 0.75,
              minWidth: 0,
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'text.secondary',
              justifyContent: 'flex-start',
            }}
          >
            Transcript ({pillarCount > 1 ? `${pillarCount} pillars, ` : ''}{moduleCount} module
            {moduleCount === 1 ? '' : 's'})
          </Button>
          <Collapse in={transcriptOpen}>
            <Box sx={{ mt: 0.75, maxHeight: 220, overflowY: 'auto' }}>
              <CertificateTranscript transcript={cert.transcript} compact />
            </Box>
          </Collapse>
        </Box>
      ) : null}

      <Divider sx={{ borderColor: alpha(theme.palette.grey[500], 0.16), mb: 1 }} />

      <Stack direction="row" justifyContent="flex-end" spacing={0.75} sx={{ mt: 'auto' }}>
        <Tooltip title="Share on LinkedIn">
          <IconButton
            size="small"
            color="info"
            onClick={() => onShareLinkedIn(cert)}
            sx={{
              width: 34,
              height: 34,
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
            onClick={() => onPreview(cert)}
            disabled={previewLoading}
            sx={{
              width: 34,
              height: 34,
              border: `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
              bgcolor: alpha(theme.palette.grey[500], 0.06),
            }}
          >
            <Iconify icon="solar:eye-bold" width={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download">
          <IconButton
            size="small"
            color="primary"
            onClick={() => onDownload(cert)}
            disabled={downloadingId === cert.id}
            sx={{
              width: 34,
              height: 34,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            }}
          >
            <Iconify icon="solar:download-bold" width={18} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Card>
  );
}

export function MyCertificates() {
  const theme = useTheme();
  const { authenticated, loading: authLoading } = useAuthContext();
  const [certificateRows, setCertificateRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return () => {};
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

  const certificates = useMemo(() => mapCertificateRows(certificateRows), [certificateRows]);

  const openCertificatePdf = async (cert, { download = false } = {}) => {
    const blob = await courseService.downloadCertificatePdf(cert.id);
    const url = URL.createObjectURL(blob);
    if (download) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate-${(cert.courseTitle || 'Course').replace(/[^a-z0-9]/gi, '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    const previewWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!previewWindow) {
      console.error('Certificate preview blocked by browser popup settings.');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleDownload = async (cert) => {
    setDownloadingId(cert.id);
    try {
      await openCertificatePdf(cert, { download: true });
    } catch (err) {
      console.error('Certificate PDF download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (cert) => {
    setPreviewLoading(true);
    try {
      await openCertificatePdf(cert, { download: false });
    } catch (err) {
      console.error('Certificate PDF preview failed:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleShareLinkedIn = async (cert) => {
    if (!cert?.id) return;
    try {
      const share = await courseService.getCertificateLinkedInShare(cert.id, 'certificate');
      if (!share?.url) {
        toast.error('Unable to build LinkedIn share link');
        return;
      }
      window.open(share.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error?.message || 'Failed to share certificate on LinkedIn');
    }
  };

  if (authLoading || loading) return <LoadingScreen />;
  if (!authenticated) return <LearningGuestSignInPrompt variant="certificates" />;

  return (
    <>
      <LearningSectionHeader
        icon="solar:medal-ribbons-star-bold"
        iconGradient={(t) =>
          `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.secondary.main} 100%)`
        }
        title="My Certificates"
        subtitle="Formal certificates with earned CPE hours and learning transcripts"
      />

      {certificates.length === 0 ? (
        <Card
          sx={{
            p: 4,
            textAlign: 'center',
            border: `1px dashed ${theme.palette.divider}`,
            boxShadow: 'none',
          }}
        >
          <Iconify icon="solar:medal-ribbons-star-bold" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            No certificates yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Complete a course or programme to receive your certificate.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={CREDENTIAL_GRID_SPACING}>
          {certificates.map((cert) => (
            <Grid key={cert.id} {...CREDENTIAL_GRID_PROPS}>
              <CertificateCard
                cert={cert}
                theme={theme}
                previewLoading={previewLoading}
                downloadingId={downloadingId}
                onShareLinkedIn={handleShareLinkedIn}
                onPreview={handlePreview}
                onDownload={handleDownload}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
