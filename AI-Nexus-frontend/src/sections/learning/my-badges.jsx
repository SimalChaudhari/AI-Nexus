import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { useAuthContext } from 'src/auth/hooks';
import { LoadingScreen } from 'src/components/loading-screen';
import { LearningGuestSignInPrompt } from './components/learning-guest-sign-in-prompt';
import { LearningSectionHeader } from './components/learning-section-header';
import { courseService } from 'src/services/course.service';
import {
  BADGE_IMAGE,
  CERTIFICATE_ISSUER,
  mapCertificateRows,
} from './components/credential-shared';
import {
  CREDENTIAL_GRID_PROPS,
  CREDENTIAL_GRID_SPACING,
  getCredentialCardSx,
} from './components/credential-card-shell';

// ----------------------------------------------------------------------

function DigitalBadgeCard({ badge }) {
  const theme = useTheme();
  const issuer = badge.programTitle ? `${CERTIFICATE_ISSUER} · ${badge.programTitle}` : CERTIFICATE_ISSUER;

  return (
    <Card sx={getCredentialCardSx(theme)}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1,
          pt: 1.5,
          pb: 1,
          minHeight: 148,
        }}
      >
        <Box
          component="img"
          src={BADGE_IMAGE}
          alt="Digital badge"
          sx={{ width: '100%', maxWidth: 128, maxHeight: 128, objectFit: 'contain' }}
        />
      </Box>

      <Box sx={{ px: 0.5, pb: 1.25, minHeight: 68 }}>
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
          {badge.courseTitle}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.8125rem' }}>
          {issuer}
        </Typography>
      </Box>

      <Box
        sx={{
          mt: 'auto',
          px: 0.5,
          py: 1.1,
          borderRadius: 1.25,
          bgcolor: 'action.hover',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: 'success.main' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
            Issued on: {badge.issuedOn}
          </Typography>
        </Stack>
      </Box>
    </Card>
  );
}

export function MyBadges() {
  const theme = useTheme();
  const { authenticated, loading: authLoading } = useAuthContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return () => {};
    if (!authenticated) {
      setRows([]);
      setLoading(false);
      return () => {};
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await courseService.getMyCertificates();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, authLoading]);

  const badges = useMemo(() => mapCertificateRows(rows), [rows]);

  if (authLoading || loading) return <LoadingScreen />;
  if (!authenticated) return <LearningGuestSignInPrompt variant="badges" />;

  return (
    <>
      <LearningSectionHeader
        icon="solar:verified-check-bold"
        iconGradient={(t) =>
          `linear-gradient(135deg, ${t.palette.success.main} 0%, ${t.palette.primary.main} 100%)`
        }
        title="Digital Badge"
        subtitle={
          badges.length === 0
            ? 'Complete a course to earn your first digital badge'
            : `You have earned ${badges.length} digital badge${badges.length === 1 ? '' : 's'}`
        }
      />

      {badges.length === 0 ? (
        <Card
          sx={{
            p: 4,
            textAlign: 'center',
            border: `1px dashed ${theme.palette.divider}`,
            boxShadow: 'none',
          }}
        >
          <Iconify icon="solar:verified-check-bold" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            No badges yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Complete a course or programme to earn your first digital badge.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={CREDENTIAL_GRID_SPACING}>
          {badges.map((badge) => (
            <Grid key={badge.id} {...CREDENTIAL_GRID_PROPS}>
              <DigitalBadgeCard badge={badge} />
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
