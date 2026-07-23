import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import QRCode from 'qrcode';

import { toast } from 'src/components/snackbar';

import { CORP } from '../corporate-theme';
import { CorpBtn, CorpCard } from '../corporate-ui';

function resolveWebsiteBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return String(window.location.origin).replace(/\/$/, '');
  }
  return '';
}

function buildSignupLink(companyCode) {
  const base = resolveWebsiteBaseUrl();
  const code = String(companyCode || '').trim().toUpperCase();
  if (!code) return '';
  const path = `/auth/sign-up?membershipOutcome=paid-signup&companyCode=${encodeURIComponent(code)}&viaQr=1`;
  return base ? `${base}${path}` : path;
}

function useQrDataUrl(link) {
  const [dataUrl, setDataUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!link) {
      setDataUrl('');
      return undefined;
    }
    setLoading(true);
    QRCode.toDataURL(link, { width: 200, margin: 1 })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl('');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [link]);

  return { dataUrl, loading };
}

/**
 * Corporate dashboard — view-only QR (no expiry / no edit). Admin manages limits elsewhere.
 */
export function CorporateEnrollmentQrCard({ invite, companyCode }) {
  const code = String(invite?.companyCode || companyCode || '').trim();
  const link = buildSignupLink(code);
  const { dataUrl, loading: qrLoading } = useQrDataUrl(link);

  const remaining =
    !invite?.maxEnrollment || Number(invite.maxEnrollment) <= 0
      ? 'Unlimited'
      : invite.remainingSeats != null
        ? invite.remainingSeats
        : Math.max(0, Number(invite.maxEnrollment) - Number(invite.enrolledCount || 0));

  if (!code) return null;

  return (
    <CorpCard>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2.5}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <Box
            sx={{
              width: 200,
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
              border: `1px solid ${CORP.border || '#d7e3f4'}`,
              bgcolor: '#fff',
              flexShrink: 0,
            }}
          >
            {qrLoading ? (
              <CircularProgress size={28} />
            ) : dataUrl ? (
              <Box component="img" src={dataUrl} alt={`QR ${code}`} sx={{ width: 180, height: 180 }} />
            ) : (
              <Typography variant="body2" color="error">
                QR unavailable
              </Typography>
            )}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.5 }}>
              Company enrollment QR
            </Typography>
            <Typography sx={{ color: CORP.muted, fontSize: 13, mb: 1.25 }}>
              Share this QR or link so staff can sign up with company code{' '}
              <strong>{code}</strong> pre-filled.
            </Typography>

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Box>
                <Typography sx={{ fontSize: 11, color: CORP.muted, fontWeight: 700 }}>
                  USER LIMIT
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>
                  {!invite?.maxEnrollment || Number(invite.maxEnrollment) <= 0
                    ? 'Unlimited'
                    : invite.maxEnrollment}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: CORP.muted, fontWeight: 700 }}>
                  ENROLLED
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>{Number(invite?.enrolledCount) || 0}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: CORP.muted, fontWeight: 700 }}>
                  REMAINING
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>{remaining}</Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>

        <Stack spacing={1} sx={{ flexShrink: 0, minWidth: { md: 160 } }}>
          <CorpBtn
            variant="blue"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                toast.success('Signup link copied');
              } catch {
                toast.error('Could not copy link');
              }
            }}
          >
            Copy link
          </CorpBtn>
        </Stack>
      </Stack>
    </CorpCard>
  );
}
