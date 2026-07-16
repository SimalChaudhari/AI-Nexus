import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { toast } from 'src/components/snackbar';
import { LoadingScreen } from 'src/components/loading-screen';

import {
  createCorporateNudgeCampaign,
  downloadCorporateCertificateFile,
  getCorporateCertificates,
  previewCorporateNudgeCampaign,
} from 'src/services/corporate.service';
import { useAuthContext } from 'src/auth/hooks';

import { CORP } from '../corporate-theme';
import { useCorporateCertificates, useCorporateLearners } from '../use-corporate-data';
import {
  CorpBtn,
  CorpCard,
  CorpCertificateDownloadBtn,
  CorpPageHeader,
  CorpPill,
  CorpTableHead,
  corpTableSx,
} from '../corporate-ui';

// ----------------------------------------------------------------------

const PAGE_SIZE = 5;

function readParam(params, key, fallback = '') {
  return String(params.get(key) || fallback);
}

export function CorporateReportsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthContext();
  const isCorporate = String(user?.role || '').toLowerCase() === 'corporate';

  const page = Math.max(1, Number(readParam(searchParams, 'page', '1')) || 1);

  const {
    data: certificates,
    pagination,
    availableTotal,
    loading: certLoading,
    error: certError,
    companyCode,
  } = useCorporateCertificates({ page, limit: PAGE_SIZE });

  const { data: learners, loading: learnersLoading, error: learnersError } = useCorporateLearners({
    limit: 100,
    page: 1,
  });
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [nudgePreview, setNudgePreview] = useState(null);
  const [nudgePreviewLoading, setNudgePreviewLoading] = useState(false);
  const [nudgeSending, setNudgeSending] = useState(false);
  const [nudgeError, setNudgeError] = useState('');

  const loading = certLoading || learnersLoading;
  const error = certError || learnersError;

  const resolvedCompanyCode = isCorporate ? undefined : companyCode || undefined;

  const openSendDialog = useCallback(async () => {
    setNudgeError('');
    setSendDialogOpen(true);
    setNudgePreviewLoading(true);
    try {
      const preview = await previewCorporateNudgeCampaign(resolvedCompanyCode);
      setNudgePreview(preview?.data || preview);
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to load nudge list preview';
      setNudgeError(Array.isArray(message) ? message.join(', ') : message);
      setNudgePreview(null);
    } finally {
      setNudgePreviewLoading(false);
    }
  }, [resolvedCompanyCode]);

  const handleSendNudgeCampaign = useCallback(async () => {
    if (nudgeSending) return;
    setNudgeSending(true);
    setNudgeError('');
    try {
      const result = await createCorporateNudgeCampaign(resolvedCompanyCode);
      const eligible = Number(result?.data?.eligibleCount) || 0;
      const batches = Number(result?.data?.batchCount) || 0;
      toast.success(
        result?.message ||
          `Campaign started in background for ${eligible} learner(s) in ${batches} batch(es). You can close this now.`,
      );
      setSendDialogOpen(false);
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to start nudge campaign';
      setNudgeError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setNudgeSending(false);
    }
  }, [nudgeSending, resolvedCompanyCode]);

  const updateParams = useCallback(
    (patch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([key, value]) => {
            if (value == null || value === '') next.delete(key);
            else next.set(key, String(value));
          });
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleDownloadAll = useCallback(async () => {
    if (!availableTotal || bulkDownloading) return;
    setDownloadError('');
    setBulkDownloading(true);
    try {
      const result = await getCorporateCertificates({
        companyCode: isCorporate ? undefined : companyCode || undefined,
        page: 1,
        limit: Math.min(Math.max(availableTotal, 1), 100),
        availableOnly: true,
      });
      const available = Array.isArray(result?.data) ? result.data : [];
      if (!available.length) return;

      for (const row of available) {
        const safeName = String(row?.name || 'learner').replace(/[^a-z0-9]+/gi, '-');
        // eslint-disable-next-line no-await-in-loop
        await downloadCorporateCertificateFile(row.certificateId, {
          fileName: `Certificate-${safeName}.pdf`,
        });
      }
    } catch (err) {
      console.error('Bulk certificate download failed:', err);
      setDownloadError('One or more certificate downloads failed. Please try again.');
    } finally {
      setBulkDownloading(false);
    }
  }, [availableTotal, bulkDownloading, companyCode, isCorporate]);

  const exportProgressCsv = () => {
    const fmt = (n) => {
      const v = Number(n) || 0;
      return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
    };
    const pillarHours = (p) => `${fmt(p?.c)}hr / ${fmt(p?.t)}hr`;
    const header = [
      'Name',
      'Email',
      'Status',
      'Pillar 1 Foundations',
      'Pillar 2 Specialisation',
      'Pillar 3 Leadership',
      'Certificate',
      'Pending item',
    ];
    const lines = learners.map((s) =>
      [
        s.name,
        s.email,
        s.status,
        pillarHours(s.p1),
        pillarHours(s.p2),
        pillarHours(s.p3),
        s.cert ? 'Available' : 'Not yet',
        s.pending,
      ]
        .map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'corporate-progress.csv';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  if (loading && !certificates.length && !learners.length) return <LoadingScreen />;

  const totalItems = Number(pagination?.totalItems) || 0;
  const totalPages = Number(pagination?.totalPages) || 1;
  const currentPage = Number(pagination?.page) || page;
  const from = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, totalItems);
  const pageLabel =
    totalItems === 0 ? 'No learners' : `Showing ${from}–${to} of ${totalItems} learners`;

  return (
    <Box>
      <CorpPageHeader
        eyebrow="Reports & Certificates"
        title="Download evidence and act on gaps"
        subtitle="Give HR users a clear area for CSV exports, certificate downloads, reminders and completion evidence."
        titleSx={{ fontSize: { xs: 24, md: 32 } }}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {downloadError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {downloadError}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3,minmax(0,1fr))' },
          gap: 2.25,
          mb: 2.25,
        }}
      >
        <CorpCard>
          <Typography sx={{ color: CORP.navy, fontWeight: 700, fontSize: 18, mb: 1.25 }}>
            CSV reports
          </Typography>
          <Typography sx={{ color: CORP.muted, lineHeight: 1.5, mb: 2 }}>
            Export learner sign-ups, pillar hours, quiz/assessment statuses and pending completion
            items.
          </Typography>
          <CorpBtn variant="blue" fullWidth onClick={exportProgressCsv}>
            Download progress CSV
          </CorpBtn>
        </CorpCard>
        <CorpCard>
          <Typography sx={{ color: CORP.navy, fontWeight: 700, fontSize: 18, mb: 1.25 }}>
            Certificates
          </Typography>
          <Typography sx={{ color: CORP.muted, lineHeight: 1.5, mb: 2 }}>
            Download certificates for learners who have met the programme completion criteria.
          </Typography>
          <CorpBtn
            variant="ghost"
            fullWidth
            disabled={!availableTotal || bulkDownloading}
            onClick={handleDownloadAll}
          >
            {bulkDownloading
              ? 'Downloading...'
              : availableTotal
                ? `Download available certificates (${availableTotal})`
                : 'No certificates available yet'}
          </CorpBtn>
        </CorpCard>
        <CorpCard>
          <Typography sx={{ color: CORP.navy, fontWeight: 700, fontSize: 18, mb: 1.25 }}>
            Nudge campaigns
          </Typography>
          <Typography sx={{ color: CORP.muted, lineHeight: 1.5, mb: 2 }}>
            Send reminders to learners who have not completed the course, or view the email send
            track.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <CorpBtn
              variant="ghost"
              fullWidth
              component={RouterLink}
              href={paths.corporate.nudgeTrack}
            >
              View
            </CorpBtn>
            <CorpBtn
              variant="blue"
              fullWidth
              onClick={openSendDialog}
              sx={{
                color: '#fff !important',
                bgcolor: CORP.blue,
                boxShadow: '0 8px 18px rgba(13, 95, 255, 0.28)',
                '&:hover': {
                  bgcolor: '#0a4fd6',
                  color: '#fff !important',
                  boxShadow: '0 10px 22px rgba(13, 95, 255, 0.34)',
                },
                '&.Mui-disabled': {
                  color: '#fff !important',
                  bgcolor: CORP.blue,
                  opacity: 0.55,
                },
              }}
            >
              Send
            </CorpBtn>
          </Box>
        </CorpCard>
      </Box>

      <Dialog
        fullWidth
        maxWidth="sm"
        open={sendDialogOpen}
        onClose={() => {
          if (!nudgeSending) setSendDialogOpen(false);
        }}
        disableScrollLock
      >
        <DialogTitle sx={{ pb: 1.5, color: CORP.navy, fontWeight: 800, bgcolor: '#eef5ff' }}>
          Send nudge campaign
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {nudgeError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {nudgeError}
            </Alert>
          ) : null}
          {nudgePreviewLoading ? (
            <Typography sx={{ color: CORP.muted }}>Loading incomplete learners…</Typography>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                This sends the same AI fluency reminder template to all learners who have{' '}
                <b>not completed</b> the course.
              </Typography>
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  mb: 1.5,
                  borderRadius: 1,
                  bgcolor: 'grey.100',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="subtitle2" sx={{ color: CORP.navy }}>
                  Incomplete learners: {nudgePreview?.incompleteCount ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Eligible to email now: {nudgePreview?.eligibleCount ?? 0}
                  {(nudgePreview?.skippedCooldownCount || 0) > 0
                    ? ` · Skipped (24h cooldown): ${nudgePreview.skippedCooldownCount}`
                    : ''}
                  {(nudgePreview?.missingEmailCount || 0) > 0
                    ? ` · Missing email: ${nudgePreview.missingEmailCount}`
                    : ''}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Sending runs in the background in batches of 100. You can close this dialog after
                starting — use View to track progress.
              </Typography>
              {!nudgePreviewLoading &&
              nudgePreview &&
              !(nudgePreview.eligibleCount > 0) ? (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  {(nudgePreview.incompleteCount || 0) === 0
                    ? 'No incomplete learners found for this company code. Learners must share the same company code as your corporate account.'
                    : (nudgePreview.missingEmailCount || 0) > 0
                      ? 'Incomplete learners have no email address, so nothing can be sent yet.'
                      : 'No eligible learners to email right now.'}
                </Alert>
              ) : null}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <CorpBtn
            variant="ghost"
            disabled={nudgeSending}
            onClick={() => setSendDialogOpen(false)}
          >
            Cancel
          </CorpBtn>
          <CorpBtn
            variant="blue"
            disabled={
              nudgeSending ||
              nudgePreviewLoading ||
              !nudgePreview ||
              !(Number(nudgePreview.eligibleCount) > 0)
            }
            onClick={handleSendNudgeCampaign}
            sx={{
              color: '#fff !important',
              bgcolor: CORP.blue,
              minWidth: 140,
              boxShadow: '0 8px 18px rgba(13, 95, 255, 0.28)',
              '&:hover': {
                bgcolor: '#0a4fd6',
                color: '#fff !important',
                boxShadow: '0 10px 22px rgba(13, 95, 255, 0.34)',
              },
              '&.Mui-disabled': {
                color: '#fff !important',
                bgcolor: CORP.blue,
                opacity: 0.55,
              },
            }}
          >
            {nudgeSending ? 'Starting…' : 'Send emails'}
          </CorpBtn>
        </DialogActions>
      </Dialog>

      <CorpCard>
        <Typography sx={{ color: CORP.navy, fontWeight: 700, fontSize: 18, mb: 1.25 }}>
          Certificate readiness
        </Typography>
        <Box sx={{ overflow: 'auto' }}>
          <Box component="table" sx={corpTableSx()}>
            <CorpTableHead
              columns={[
                'Learner',
                'Status',
                'Certificate',
                'Specific learner action',
                'Next action if pending',
              ]}
            />
            <tbody>
              {certificates.length === 0 ? (
                <tr>
                  <td colSpan={5}>No learners found.</td>
                </tr>
              ) : (
                certificates.map((s) => (
                  <tr key={s.userId || s.email}>
                    <td>
                      <b>{s.name}</b>
                      <small>{s.email}</small>
                    </td>
                    <td>
                      <CorpPill status={s.status} />
                    </td>
                    <td>{s.certificateAvailable ? 'Available' : 'Not yet available'}</td>
                    <td>
                      <CorpCertificateDownloadBtn
                        available={Boolean(s.certificateAvailable)}
                        certificateId={s.certificateId}
                        learnerName={s.name}
                      />
                    </td>
                    <td>{s.nextAction}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1.5,
            mt: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography sx={{ color: CORP.muted, fontSize: 13 }}>{pageLabel}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <CorpBtn
              variant="ghost"
              disabled={currentPage <= 1 || certLoading}
              onClick={() => updateParams({ page: currentPage - 1 })}
            >
              Previous
            </CorpBtn>
            <Typography sx={{ color: CORP.ink, fontSize: 13, fontWeight: 700, px: 1 }}>
              Page {currentPage} / {totalPages}
            </Typography>
            <CorpBtn
              variant="ghost"
              disabled={currentPage >= totalPages || certLoading}
              onClick={() => updateParams({ page: currentPage + 1 })}
            >
              Next
            </CorpBtn>
          </Box>
        </Box>
      </CorpCard>
    </Box>
  );
}
