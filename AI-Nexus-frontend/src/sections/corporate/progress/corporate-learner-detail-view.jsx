import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { LoadingScreen } from 'src/components/loading-screen';
import { useAuthContext } from 'src/auth/hooks';
import { getCorporateLearner } from 'src/services/corporate.service';

import { CORP } from '../corporate-theme';
import {
  CorpBtn,
  CorpCard,
  CorpCertificateDownloadBtn,
  CorpNudgeBtn,
  CorpPageHeader,
  CorpPill,
  CorpPillarLessonMeta,
  CorpProgressBar,
} from '../corporate-ui';

// ----------------------------------------------------------------------

function DetailRow({ label, value }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' },
        gap: { xs: 0.35, sm: 1.5 },
        py: 1,
        borderBottom: `1px solid ${CORP.line}`,
        '&:last-child': { borderBottom: 0 },
      }}
    >
      <Typography sx={{ color: CORP.muted, fontSize: 13, fontWeight: 700 }}>{label}</Typography>
      <Typography sx={{ color: CORP.ink, fontSize: 14, fontWeight: 600, wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

function PillarDetailCard({ title, pillar }) {
  return (
    <CorpCard>
      <Typography sx={{ color: CORP.navy, fontWeight: 800, fontSize: 16, mb: 1.5 }}>
        {title}
      </Typography>
      <CorpProgressBar pillar={pillar} textType="long" />
      <Box sx={{ mt: 1 }}>
        <CorpPillarLessonMeta pillar={pillar} fullText />
      </Box>
    </CorpCard>
  );
}

// ----------------------------------------------------------------------

export function CorporateLearnerDetailView() {
  const { userId } = useParams();
  const { user } = useAuthContext();
  const isCorporate = String(user?.role || '').toLowerCase() === 'corporate';

  const [learner, setLearner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) {
      setError('Learner not found');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const companyCode = isCorporate ? undefined : String(user?.companyCode || '').trim() || undefined;
      const data = await getCorporateLearner(userId, companyCode);
      setLearner(data);
    } catch (err) {
      console.error('Load learner detail failed:', err);
      setLearner(null);
      setError(err?.message || 'Failed to load learner details');
    } finally {
      setLoading(false);
    }
  }, [isCorporate, user?.companyCode, userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen />;

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <CorpPageHeader
        eyebrow="Learner Progress"
        title={learner?.name || 'Learner details'}
        subtitle="Full progress details for this staff learner across Pillar 1, 2 and 3."
        titleSx={{ fontSize: { xs: 24, md: 32 } }}
      />

      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <CorpBtn
          variant="ghost"
          component={RouterLink}
          href={paths.corporate.progress}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          ← Back to progress
        </CorpBtn>
        {learner ? (
          <CorpNudgeBtn
            userId={learner.userId || userId}
            learnerName={learner.name}
            companyCode={isCorporate ? undefined : String(user?.companyCode || '').trim() || undefined}
            canNudge={learner.canNudge !== false}
            lastNudgedAt={learner.lastNudgedAt}
            onSent={(nudge) => {
              setLearner((prev) =>
                prev
                  ? {
                      ...prev,
                      lastNudgedAt: nudge?.lastNudgedAt ?? new Date().toISOString(),
                      canNudge: nudge?.canNudge ?? false,
                      nextNudgeAt: nudge?.nextNudgeAt ?? null,
                    }
                  : prev,
              );
            }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          />
        ) : null}
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {!learner && !error ? (
        <Alert severity="info">Learner not found.</Alert>
      ) : null}

      {learner ? (
        <Box sx={{ display: 'grid', gap: 2.25 }}>
          <CorpCard>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1.5,
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                mb: 1,
              }}
            >
              <Box>
                <Typography sx={{ color: CORP.navy, fontWeight: 800, fontSize: 18 }}>
                  {learner.name}
                </Typography>
                <Typography sx={{ color: CORP.muted, fontSize: 13, mt: 0.35 }}>
                  {learner.email}
                </Typography>
              </Box>
              <CorpPill status={learner.status} />
            </Box>

            <DetailRow label="Department" value={learner.department} />
            <DetailRow label="Role" value={learner.role} />
            <DetailRow label="Eligibility" value={learner.eligibility} />
            <DetailRow label="Profession" value={learner.profession} />
            <DetailRow
              label="Last login"
              value={learner.lastLogin || learner.lastActive || 'Never'}
            />
            <DetailRow label="Pending item" value={learner.pending} />
            <DetailRow
              label="Certificate"
              value={
                learner.cert
                  ? learner.certificateNo
                    ? `Available (${learner.certificateNo})`
                    : 'Available'
                  : 'Not available yet'
              }
            />

            <Box sx={{ mt: 2 }}>
              <CorpCertificateDownloadBtn
                available={Boolean(learner.cert)}
                certificateId={learner.certificateId}
                learnerName={learner.name}
                unavailableNote={learner.pending}
              />
            </Box>
          </CorpCard>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 2,
            }}
          >
            <PillarDetailCard title="Pillar 1 Foundations" pillar={learner.p1} />
            <PillarDetailCard title="Pillar 2 Specialisation" pillar={learner.p2} />
            <PillarDetailCard title="Pillar 3 Leadership" pillar={learner.p3} />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
