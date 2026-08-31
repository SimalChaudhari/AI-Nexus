import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { useAuthContext } from 'src/auth/hooks';
import { LoadingScreen } from 'src/components/loading-screen';
import { appSettingsService } from 'src/services/app-settings.service';
import { courseService } from 'src/services/course.service';
import {
  DEFAULT_DIGITAL_BADGE_IMAGE,
  DEFAULT_DIGITAL_BADGE_ISSUER,
  getDigitalBadgeImage,
  getDigitalBadgeIssuer,
  persistDigitalBadgeSettings,
} from 'src/utils/digital-badge';
import { LearningGuestSignInPrompt } from './components/learning-guest-sign-in-prompt';
import { LearningSectionHeader } from './components/learning-section-header';
import { mapCertificateRows } from './components/credential-shared';
import {
  CREDENTIAL_GRID_PROPS,
  CREDENTIAL_GRID_SPACING,
  getCredentialCardSx,
} from './components/credential-card-shell';

// ----------------------------------------------------------------------

const BLOCKED_CREDENTIAL_MESSAGE =
  'This digital badge is no longer available. Access has been revoked by an administrator.';

function DigitalBadgeCard({ badge, badgeImage, issuerLabel, onShareLinkedIn }) {
  const theme = useTheme();
  const issuer = badge.programTitle ? `${issuerLabel} · ${badge.programTitle}` : issuerLabel;
  const isBlocked = badge.badgeBlocked;

  return (
    <Card
      sx={{
        ...getCredentialCardSx(theme),
        ...(isBlocked && {
          opacity: 0.92,
          bgcolor: alpha(theme.palette.grey[500], 0.04),
          borderColor: alpha(theme.palette.warning.main, 0.35),
        }),
      }}
    >
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
          position: 'relative',
        }}
      >
        <Box
          component="img"
          src={badgeImage}
          alt="Digital badge"
          sx={{
            width: '100%',
            maxWidth: 128,
            maxHeight: 128,
            objectFit: 'contain',
            ...(isBlocked && { filter: 'grayscale(1)', opacity: 0.35 }),
          }}
        />
        {isBlocked ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 1.5,
            }}
          >
            <Stack
              alignItems="center"
              spacing={0.75}
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.background.paper, 0.92),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
                textAlign: 'center',
                maxWidth: 220,
              }}
            >
              <Iconify icon="solar:shield-cross-bold" width={22} sx={{ color: 'warning.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.darker' }}>
                No longer available
              </Typography>
            </Stack>
          </Box>
        ) : null}
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

      {isBlocked ? (
        <Alert severity="warning" variant="outlined" sx={{ py: 0.75, px: 1, borderRadius: 1.25 }}>
          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.45 }}>
            {badge.message || BLOCKED_CREDENTIAL_MESSAGE}
          </Typography>
        </Alert>
      ) : (
        <Box
          sx={{
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
      )}

      <Divider sx={{ borderColor: alpha(theme.palette.grey[500], 0.16), my: 1 }} />

      <Stack direction="row" justifyContent="flex-end" spacing={0.75} sx={{ mt: 'auto' }}>
        <Tooltip title={isBlocked ? 'Sharing unavailable' : 'Share on LinkedIn'}>
          <span>
            <IconButton
              size="small"
              color="info"
              disabled={isBlocked}
              onClick={() => onShareLinkedIn(badge)}
              sx={{
                width: 34,
                height: 34,
                border: `1px solid ${alpha(theme.palette.info.main, 0.28)}`,
                bgcolor: alpha(theme.palette.info.main, 0.08),
              }}
            >
              <Iconify icon="mdi:linkedin" width={18} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Card>
  );
}

export function MyBadges() {
  const theme = useTheme();
  const { authenticated, loading: authLoading } = useAuthContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [badgeImage, setBadgeImage] = useState(() => getDigitalBadgeImage());
  const [issuerLabel, setIssuerLabel] = useState(() => getDigitalBadgeIssuer());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const appSettings = await appSettingsService.getPublic();
        if (cancelled) return;
        const nextImage = appSettings?.digitalBadgeImageUrl || DEFAULT_DIGITAL_BADGE_IMAGE;
        const nextIssuer = appSettings?.digitalBadgeIssuer || DEFAULT_DIGITAL_BADGE_ISSUER;
        setBadgeImage(nextImage);
        setIssuerLabel(nextIssuer);
        persistDigitalBadgeSettings({
          imageUrl: appSettings?.digitalBadgeImageUrl || '',
          issuer: appSettings?.digitalBadgeIssuer || '',
        });
      } catch {
        // keep local/static fallbacks
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
  const activeBadges = useMemo(() => badges.filter((b) => !b.badgeBlocked), [badges]);
  const blockedBadges = useMemo(() => badges.filter((b) => b.badgeBlocked), [badges]);

  const handleShareLinkedIn = async (badge) => {
    if (!badge?.id || badge.badgeBlocked) return;
    try {
      const share = await courseService.getCertificateLinkedInShare(badge.id, 'badge');
      if (!share?.url) {
        toast.error('Unable to build LinkedIn share link');
        return;
      }
      window.open(share.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(
        error?.message ||
          BLOCKED_CREDENTIAL_MESSAGE
      );
    }
  };

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
          activeBadges.length === 0 && blockedBadges.length === 0
            ? 'Complete a course to earn your first digital badge'
            : activeBadges.length === 0
              ? 'Your earned badges are currently unavailable'
              : `You have earned ${activeBadges.length} digital badge${activeBadges.length === 1 ? '' : 's'}`
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
        <Stack spacing={3}>
          {activeBadges.length > 0 ? (
            <Grid container spacing={CREDENTIAL_GRID_SPACING}>
              {activeBadges.map((badge) => (
                <Grid key={badge.id} {...CREDENTIAL_GRID_PROPS}>
                  <DigitalBadgeCard
                    badge={badge}
                    badgeImage={badgeImage}
                    issuerLabel={issuerLabel}
                    onShareLinkedIn={handleShareLinkedIn}
                  />
                </Grid>
              ))}
            </Grid>
          ) : null}

          {blockedBadges.length > 0 ? (
            <Stack spacing={1.5}>
              <Alert severity="warning" variant="outlined">
                {blockedBadges.length === 1
                  ? '1 badge is no longer available because access was revoked by an administrator.'
                  : `${blockedBadges.length} badges are no longer available because access was revoked by an administrator.`}
              </Alert>
              <Grid container spacing={CREDENTIAL_GRID_SPACING}>
                {blockedBadges.map((badge) => (
                  <Grid key={badge.id} {...CREDENTIAL_GRID_PROPS}>
                    <DigitalBadgeCard
                      badge={badge}
                      badgeImage={badgeImage}
                      issuerLabel={issuerLabel}
                      onShareLinkedIn={handleShareLinkedIn}
                    />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          ) : null}
        </Stack>
      )}
    </>
  );
}
