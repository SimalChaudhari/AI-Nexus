import { useCallback, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { LoadingScreen } from 'src/components/loading-screen';

import { downloadCorporateCertificateFile } from 'src/services/corporate.service';

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

export function CorporateReportsView() {
  const { data: certificates, loading: certLoading, error: certError } = useCorporateCertificates();
  const { data: learners, loading: learnersLoading, error: learnersError } = useCorporateLearners({
    limit: 100,
    page: 1,
  });
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const loading = certLoading || learnersLoading;
  const error = certError || learnersError;

  const handleDownloadAll = useCallback(async () => {
    const available = certificates.filter((c) => c.certificateAvailable && c.certificateId);
    if (!available.length || bulkDownloading) return;
    setDownloadError('');
    setBulkDownloading(true);
    try {
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
  }, [certificates, bulkDownloading]);

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

  const availableCerts = certificates.filter((c) => c.certificateAvailable && c.certificateId);

  return (
    <Box>
      <CorpPageHeader
        title="Reports & Certificates"
        subtitle="Download CSV reports, certificates, and send reminders."
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
            disabled={!availableCerts.length || bulkDownloading}
            onClick={handleDownloadAll}
          >
            {bulkDownloading
              ? 'Downloading...'
              : availableCerts.length
                ? `Download available certificates (${availableCerts.length})`
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
      </CorpCard>
    </Box>
  );
}
