import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { LoadingScreen } from 'src/components/loading-screen';

import {
  downloadCorporateCertificateFile,
  getCorporateCertificates,
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

  const loading = certLoading || learnersLoading;
  const error = certError || learnersError;

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
            Send reminder emails to inactive learners or those with pending quizzes and assessments.
          </Typography>
          <CorpBtn variant="ghost" fullWidth>
            Create nudge list
          </CorpBtn>
        </CorpCard>
      </Box>

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
