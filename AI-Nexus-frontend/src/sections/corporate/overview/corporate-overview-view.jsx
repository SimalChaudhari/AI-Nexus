import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { LoadingScreen } from 'src/components/loading-screen';

import { CORP } from '../corporate-theme';
import { useCorporateOverview } from '../use-corporate-data';
import {
  CorpBtn,
  CorpCard,
  CorpPageHeader,
  CorpPill,
  CorpPillarLessonMeta,
  CorpProgressBar,
  CorpTableHead,
  corpTableSx,
} from '../corporate-ui';
import { CorporateEnrollmentQrCard } from './corporate-enrollment-qr-card';

// ----------------------------------------------------------------------

export function CorporateOverviewView() {
  const { data, loading, error } = useCorporateOverview();

  if (loading) return <LoadingScreen />;

  const companyCode = data?.companyCode || '—';
  const metrics = data?.metrics || {};
  const learners = Array.isArray(data?.learnersPreview) ? data.learnersPreview : [];
  const actions = Array.isArray(data?.actions) ? data.actions : [];
  const enrollmentInvite = data?.enrollmentInvite || null;

  const metricCards = [
    {
      label: 'Total learners',
      value: String(metrics.totalLearners ?? 0),
      hint: companyCode !== '—' ? `Tagged to ${companyCode}` : 'No company code yet',
    },
    {
      label: 'Completed',
      value: String(metrics.completed ?? 0),
      hint: `${metrics.completionRate ?? 0}% completion rate`,
    },
    {
      label: 'At risk',
      value: String(metrics.atRisk ?? 0),
      hint: 'Inactive or low progress',
    },
    {
      label: 'Certificates',
      value: String(metrics.certificatesReady ?? 0),
      hint: 'Ready for download',
    },
  ];

  return (
    <Box>
      <CorpPageHeader
        eyebrow="Corporate HR Dashboard"
        title="Manage AI Fluency progress with confidence"
        subtitle="Enrol learners, track completion by pillar, and download reports from one place."
        titleSx={{ fontSize: { xs: 24, md: 32 } }}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {companyCode && companyCode !== '—' ? (
        <Box sx={{ mb: 2.25 }}>
          <CorporateEnrollmentQrCard
            invite={enrollmentInvite}
            companyCode={companyCode}
          />
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2.5,
          background: 'linear-gradient(135deg,#061833,#0a397d 58%,#0a8bc7)',
          borderRadius: { xs: '22px', md: '32px' },
          color: '#fff',
          p: { xs: '20px', sm: '24px', md: '30px' },
          boxShadow: CORP.shadow,
          mb: 2.5,
          overflow: 'hidden',
          position: 'relative',
          flexDirection: { xs: 'column', md: 'row' },
          '&:after': {
            content: '""',
            position: 'absolute',
            right: -120,
            top: -130,
            width: 360,
            height: 360,
            borderRadius: '50%',
            background:
              'radial-gradient(circle,rgba(43,214,163,.45),rgba(22,184,255,.2),transparent 70%)',
          },
          '& > *': { position: 'relative', zIndex: 1 },
        }}
      >
        <Box sx={{ maxWidth: 720 }}>
          <Typography
            sx={{
              color: 'white',
              fontSize: { xs: 20, md: 24 },
              fontWeight: 800,
              mb: 1.25,
              letterSpacing: '-0.025em',
            }}
          >
            Completion rule built into the dashboard
          </Typography>
          <Typography sx={{ color: '#d7e8ff', lineHeight: 1.55, m: 0 }}>
            Finish all Pillar 1 modules (9.5 hours), pass the quizzes and assessment, then complete
            one eligible Pillar 2 specialisation with its quiz and assessment.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.75 }}>
            <CorpPill status="Completed">Pillar 1 required</CorpPill>
            <CorpPill status="In Progress">One eligible Pillar 2 specialisation</CorpPill>
            <CorpPill>Quizzes + assessments</CorpPill>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', flexShrink: 0 }}>
          <CorpBtn variant="primary" component={RouterLink} href={paths.corporate.enrol}>
            Enrol staff
          </CorpBtn>
          <CorpBtn variant="secondary" component={RouterLink} href={paths.corporate.reports}>
            Export reports
          </CorpBtn>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,minmax(0,1fr))' },
          gap: 2.25,
          mb: 2.25,
        }}
      >
        {metricCards.map((metric) => (
          <CorpCard key={metric.label}>
            <Typography sx={{ color: CORP.muted, fontWeight: 700, fontSize: 13 }}>
              {metric.label}
            </Typography>
            <Typography
              component="strong"
              sx={{
                display: 'block',
                fontSize: 34,
                color: CORP.navy,
                letterSpacing: '-0.04em',
                my: 1,
                fontWeight: 700,
              }}
            >
              {metric.value}
            </Typography>
            <Typography sx={{ display: 'block', color: CORP.muted, fontSize: 12 }}>
              {metric.hint}
            </Typography>
          </CorpCard>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.55fr) minmax(320px,.75fr)' },
          gap: 2.25,
        }}
      >
        <CorpCard>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1.5,
              alignItems: 'center',
              mb: 1.75,
            }}
          >
            <Typography sx={{ color: CORP.navy, fontWeight: 700, fontSize: 18, m: 0 }}>
              Learner progress snapshot
            </Typography>
            <Box
              component={RouterLink}
              href={paths.corporate.progress}
              sx={{ color: CORP.blue, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}
            >
              View all
            </Box>
          </Box>
          <Box sx={{ overflow: 'auto' }}>
            <Box component="table" sx={corpTableSx()}>
              <CorpTableHead columns={['Learner', 'Pillar 1', 'Pillar 2', 'Pillar 3', 'Status']} />
              <tbody>
                {learners.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        No learners found for this company code.
                      </Typography>
                    </td>
                  </tr>
                ) : (
                  learners.map((s) => (
                    <tr key={s.userId || s.email}>
                      <td>
                        <b>{s.name}</b>
                        <small>
                          {s.email}
                          <br />
                          {s.role}
                        </small>
                      </td>
                      <td>
                        <CorpProgressBar pillar={s.p1} />
                        <CorpPillarLessonMeta pillar={s.p1} compact />
                      </td>
                      <td>
                        <CorpProgressBar pillar={s.p2} />
                        <CorpPillarLessonMeta pillar={s.p2} compact />
                      </td>
                      <td>
                        <CorpProgressBar pillar={s.p3} />
                        <CorpPillarLessonMeta pillar={s.p3} compact />
                      </td>
                      <td>
                        <CorpPill status={s.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Box>
          </Box>
        </CorpCard>

        <CorpCard>
          <Typography sx={{ color: CORP.navy, fontWeight: 800, fontSize: 18, mb: 1.25 }}>
            Admin action centre
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.5, my: 2 }}>
            {(actions.length
              ? actions
              : [
                  'No pending admin actions right now',
                ]
            ).map((text, index) => (
              <Box
                key={`${index}-${text}`}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'flex-start',
                  p: '14px',
                  border: `1px solid ${CORP.line}`,
                  borderRadius: '16px',
                  bgcolor: '#f8fbff',
                }}
              >
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '9px',
                    bgcolor: '#eaf2ff',
                    color: CORP.blue,
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </Box>
                <Typography sx={{ m: '2px 0 0', lineHeight: 1.4, fontSize: 14, color: CORP.ink }}>
                  {text}
                </Typography>
              </Box>
            ))}
          </Box>
          <CorpBtn variant="blue" fullWidth>
            Send nudges to inactive learners
          </CorpBtn>
        </CorpCard>
      </Box>
    </Box>
  );
}
