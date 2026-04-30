import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Grow from '@mui/material/Grow';
import { keyframes, alpha, styled } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const backdropEnter = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const paperPop = keyframes`
  0% { opacity: 0; transform: perspective(900px) rotateX(-8deg) scale(0.88) translateY(26px); }
  60% { opacity: 1; transform: perspective(900px) rotateX(1deg) scale(1.03) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

const spotlightPulse = keyframes`
  0%, 100% { transform: scale(0.98); opacity: 0.55; }
  50% { transform: scale(1.02); opacity: 0.85; }
`;

const heroBadgeEnter = keyframes`
  0% { transform: scale(0.75) rotate(-14deg); opacity: 0; }
  65% { transform: scale(1.08) rotate(3deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const titleSweep = keyframes`
  0% { opacity: 0; transform: translateY(8px); filter: blur(4px); }
  100% { opacity: 1; transform: translateY(0); filter: blur(0); }
`;

const MembershipPrimaryCta = styled(Button)(({ theme }) => {
  const ctaGlow = keyframes({
    '0%, 100%': {
      boxShadow: `0 10px 20px -10px ${alpha(theme.palette.primary.main, 0.6)}, 0 0 0 0 ${alpha(theme.palette.primary.main, 0.35)}`,
    },
    '50%': {
      boxShadow: `0 14px 28px -12px ${alpha(theme.palette.primary.main, 0.55)}, 0 0 0 10px ${alpha(theme.palette.primary.main, 0)}`,
    },
  });

  return {
    minHeight: 50,
    fontWeight: 800,
    fontSize: '0.9375rem',
    letterSpacing: 0.02,
    textTransform: 'none',
    borderRadius: 0,
    animation: `${ctaGlow} 2.2s ease-in-out infinite`,
    transition: theme.transitions.create(['transform', 'filter'], { duration: 200 }),
    '&:hover': {
      transform: 'translateY(-1px) scale(1.02)',
      filter: 'brightness(1.06)',
    },
    '&:active': {
      transform: 'translateY(0) scale(0.99)',
    },
    alignSelf: 'center',
    minWidth: 250,
  };
});

export function MembershipSignupDialog({ open, onClose, onContinue }) {
  return (
    <Dialog
      open={open}
      disableScrollLock
      TransitionComponent={Grow}
      TransitionProps={{ timeout: 380 }}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        onClose();
      }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: (theme) => alpha(theme.palette.common.black, 0.72),
            backdropFilter: 'blur(4px)',
            animation: open ? `${backdropEnter} 0.35s ease-out` : 'none',
          },
        },
      }}
      PaperProps={{
        sx: (theme) => ({
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 0,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
          boxShadow: `0 24px 48px -12px ${alpha(theme.palette.common.black, 0.35)},
            0 0 0 1px ${alpha(theme.palette.primary.main, 0.12)},
            0 0 40px -8px ${alpha(theme.palette.primary.main, 0.35)}`,
          animation: open ? `${paperPop} 0.45s cubic-bezier(0.34, 1.3, 0.64, 1)` : 'none',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            top: 0,
            height: 5,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundSize: '220% 100%',
            animation: open ? 'membership-sweep 2.4s linear infinite' : 'none',
            opacity: 0.95,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 320,
            height: 320,
            right: -120,
            top: -160,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.22)} 0%, ${alpha(theme.palette.primary.main, 0)} 70%)`,
            animation: `${spotlightPulse} 2.8s ease-in-out infinite`,
            pointerEvents: 'none',
          },
          '@keyframes membership-sweep': {
            from: { backgroundPosition: '0% 0%' },
            to: { backgroundPosition: '220% 0%' },
          },
        }),
      }}
    >
      <DialogTitle sx={{ pr: 3, pl: 3.5, pt: 3.25, pb: 1.75 }}>
        <Button
          variant="text"
          color="inherit"
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 14,
            right: 14,
            fontWeight: 600,
            opacity: 0.72,
            textTransform: 'none',
            '&:hover': { opacity: 1, bgcolor: 'action.hover' },
          }}
        >
          Skip
        </Button>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={(theme) => ({
              width: 52,
              height: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.22)} 0%, ${alpha(theme.palette.secondary.main, 0.18)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
              boxShadow: `0 8px 24px -8px ${alpha(theme.palette.primary.main, 0.5)}`,
              animation: open ? `${heroBadgeEnter} 0.55s cubic-bezier(0.22, 1.2, 0.36, 1)` : 'none',
            })}
          >
            <Iconify icon="solar:user-plus-bold-duotone" width={32} sx={{ color: 'primary.main' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                color: 'primary.main',
                fontWeight: 800,
                letterSpacing: 1.2,
                lineHeight: 1.2,
                animation: open ? `${titleSweep} 0.35s ease-out 0.05s both` : 'none',
              }}
            >
              One quick step
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                lineHeight: 1.2,
                mt: 0.25,
                animation: open ? `${titleSweep} 0.45s ease-out 0.1s both` : 'none',
              }}
            >
              Join to continue
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 0.25, px: 3.5, pb: 1.5 }}>
        <Box
          sx={(theme) => ({
            mb: 1.5,
            px: 1.25,
            py: 0.75,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            bgcolor: alpha(theme.palette.success.main, 0.1),
            border: `1px solid ${alpha(theme.palette.success.main, 0.28)}`,
            color: 'success.dark',
            fontWeight: 700,
            fontSize: 13,
          })}
        >
          <Iconify icon="solar:shield-check-bold" width={16} />
          Membership required to continue
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          Create your membership to unlock this course, checkout, and saved progress. Tap below to go to sign up — it only
          takes a minute.
        </Typography>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3.5,
          pb: 3,
          pt: 1,
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 1.5,
        }}
      >
        <MembershipPrimaryCta variant="contained" color="primary" size="large" onClick={onContinue} autoFocus>
          <Stack direction="row" alignItems="center" justifyContent="center" component="span" sx={{ width: 1 }}>
            Continue to sign up
            <Iconify icon="solar:arrow-right-bold" width={20} sx={{ ml: 1 }} />
          </Stack>
        </MembershipPrimaryCta>
      </DialogActions>
    </Dialog>
  );
}
