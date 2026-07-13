import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { LoadingScreen } from 'src/components/loading-screen';

import { CORP } from '../corporate-theme';
import { useCorporateCertificates, useCorporateLearners } from '../use-corporate-data';
import {
  CorpBtn,
  CorpCard,
  CorpPageHeader,
  CorpPill,
  CorpTableHead,
  CorpTextBtn,
  corpTableSx,
} from '../corporate-ui';

// ----------------------------------------------------------------------

export function CorporateReportsView() {
  const { data: certificates, loading: certLoading, error: certError } = useCorporateCertificates();
  const { data: learners, loading: learnersLoading, error: learnersError } = useCorporateLearners();

  const loading = certLoading || learnersLoading;
  const error = certError || learnersError;

  const exportProgressCsv = () => {
    const header = ['Name', 'Email', 'Status', 'P1', 'P2', 'P3', 'Certificate', 'Pending'];
    const lines = learners.map((s) =>
      [
        s.name,
        s.email,
        s.status,
        `${s.p1?.c ?? 0}/${s.p1?.t ?? 0}`,
        `${s.p2?.c ?? 0}/${s.p2?.t ?? 0}`,
        `${s.p3?.c ?? 0}/${s.p3?.t ?? 0}`,
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
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !certificates.length && !learners.length) return <LoadingScreen />;

  const availableCerts = certificates.filter((c) => c.certificateAvailable);

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
          <CorpBtn variant="ghost" fullWidth disabled={!availableCerts.length}>
            {availableCerts.length
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
                      {s.certificateAvailable ? (
                        <CorpTextBtn>Download Certificate</CorpTextBtn>
                      ) : (
                        <CorpTextBtn disabled>Certificate not available yet</CorpTextBtn>
                      )}
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
