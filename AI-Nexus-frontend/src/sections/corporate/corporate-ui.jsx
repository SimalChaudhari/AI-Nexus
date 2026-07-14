import { useRef, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useAuthContext } from 'src/auth/hooks';
import { signOut } from 'src/auth/context/jwt';
import { downloadCorporateCertificateFile } from 'src/services/corporate.service';

import { CORP, STATUS_PILL_SX, statusTone } from './corporate-theme';

// ----------------------------------------------------------------------

export function CorpCard({ children, sx, ...other }) {
  return (
    <Box
      sx={{
        bgcolor: CORP.card,
        border: `1px solid ${CORP.line}`,
        borderRadius: { xs: '18px', md: CORP.radius },
        p: { xs: '16px', sm: '20px', md: '22px' },
        boxShadow: CORP.shadow,
        minWidth: 0,
        ...sx,
      }}
      {...other}
    >
      {children}
    </Box>
  );
}

export function CorpPill({ status, children, sx }) {
  const tone = statusTone(status);
  const colors = STATUS_PILL_SX[tone] || STATUS_PILL_SX.default;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        borderRadius: 999,
        px: '10px',
        py: '7px',
        fontSize: 12,
        fontWeight: 900,
        ...colors,
        ...sx,
      }}
    >
      {children || status}
    </Box>
  );
}

export function CorpProgressBar({ pillar, textType = 'short' }) {
  const total = Number(pillar?.t) || 0;
  // CPE earned: floor watch time to nearest 0.5h (same rule as player/certificates).
  const earnedCpe = Number(pillar?.c) || 0;
  const watchedHours = Number(pillar?.w) || 0;
  const watchedMinutes = Math.max(0, Math.round(watchedHours * 60));
  const pct =
    total > 0
      ? Math.min(100, Math.round((earnedCpe / total) * 100))
      : earnedCpe > 0
        ? 100
        : 0;

  const formatH = (n) => {
    const v = Number(n) || 0;
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  };

  const text = `${formatH(earnedCpe)}hr / ${formatH(total)}hr`;

  return (
    <Box>
      <Box
        sx={{
          height: 9,
          bgcolor: '#e8eef7',
          borderRadius: 999,
          overflow: 'hidden',
          mb: '6px',
          minWidth: 110,
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${CORP.blue}, ${CORP.cyan}, ${CORP.mint})`,
          }}
        />
      </Box>
      <Typography component="small" sx={{ display: 'block', color: CORP.muted, fontSize: 12, mt: 0.5 }}>
        {text}
      </Typography>
      {earnedCpe <= 0 && watchedMinutes > 0 ? (
        <Box
          component="span"
          sx={{ display: 'block', color: CORP.muted, fontSize: 11, mt: 0.25, lineHeight: 1.3 }}
        >
          {watchedMinutes} min watched
        </Box>
      ) : null}
    </Box>
  );
}

export function CorpAdminChip({ compact = false }) {
  const router = useRouter();
  const { user, checkUserSession } = useAuthContext();
  
  const [loggingOut, setLoggingOut] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const closeTimerRef = useRef(null);

  const displayName =
    [user?.firstname, user?.lastname].filter(Boolean).join(' ').trim() ||
    user?.displayName ||
    user?.username ||
    'HR Admin';
  const email = String(user?.email || '').trim() || 'Corporate account';

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = (el) => {
    clearCloseTimer();
    setAnchorEl(el);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setAnchorEl(null), 180);
  };

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
      await checkUserSession?.();
      router.replace(
        `${paths.auth.simple.signIn}?returnTo=${encodeURIComponent(paths.corporate.overview)}`
      );
    } catch (err) {
      console.error('Corporate logout failed:', err);
      setLoggingOut(false);
    }
  }, [checkUserSession, loggingOut, router]);

  const open = Boolean(anchorEl);

  return (
    <>
      <Box
        onMouseEnter={(e) => openMenu(e.currentTarget)}
        onMouseLeave={scheduleClose}
        onClick={(e) => {
          if (open) {
            setAnchorEl(null);
            return;
          }
          openMenu(e.currentTarget);
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 0 : 1.25,
          bgcolor: compact ? 'transparent' : '#fff',
          border: compact ? 'none' : `1px solid ${CORP.line}`,
          borderRadius: 999,
          px: compact ? 0 : { xs: '10px', sm: '13px' },
          py: compact ? 0 : '9px',
          boxShadow: compact ? 'none' : CORP.shadow,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          maxWidth: '100%',
          minWidth: 0,
          width: 'auto',
          alignSelf: { xs: 'stretch', md: 'flex-start' },
        }}
      >
        <Box
          sx={{
            width: compact ? 36 : 36,
            height: compact ? 36 : 36,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${CORP.blue}, ${CORP.cyan})`,
            display: 'grid',
            placeItems: 'center',
            color: 'white',
            fontWeight: 900,
            fontSize: compact ? 12 : 13,
            flexShrink: 0,
            boxShadow: compact ? CORP.shadow : 'none',
          }}
        >
          {String(user?.role || '').toLowerCase() === 'corporate' ? 'HR' : 'User'}
        </Box>
        {!compact ? (
          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: 13, sm: 14 },
                color: CORP.ink,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              noWrap
            >
              {displayName}
            </Typography>
            <Typography
              variant="caption"
              title={email}
              sx={{
                display: 'block',
                color: 'text.secondary',
                mt: 0.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 12,
              }}
            >
              {email}
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="bottom-end"
        modifiers={[
          { name: 'offset', options: { offset: [0, 8] } },
          { name: 'preventOverflow', options: { padding: 12 } },
        ]}
        sx={{ zIndex: (theme) => theme.zIndex.tooltip, maxWidth: 'calc(100vw - 24px)' }}
      >
        <Paper
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          elevation={0}
          sx={{
            minWidth: 260,
            maxWidth: 340,
            p: 1.75,
            borderRadius: '16px',
            border: `1px solid ${CORP.line}`,
            boxShadow: CORP.shadow,
            bgcolor: '#fff',
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 14, color: CORP.navy, lineHeight: 1.3 }} noWrap>
            {displayName}
          </Typography>
          <Typography
            variant="body2"
            title={email}
            sx={{
              color: 'text.secondary',
              mt: 0.35,
              mb: 1.5,
              fontSize: 13,
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email}
          </Typography>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            color="inherit"
            disabled={loggingOut}
            onClick={handleLogout}
            startIcon={
              loggingOut ? <CircularProgress size={14} color="inherit" /> : null
            }
            sx={{
              borderRadius: '12px',
              fontWeight: 700,
              borderColor: CORP.line,
              color: CORP.blue,
              '&:hover': { borderColor: CORP.blue, bgcolor: '#eef5ff' },
            }}
          >
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </Paper>
      </Popper>
    </>
  );
}

export function CorpPageHeader({ eyebrow, title, subtitle, titleSx }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: { xs: 1.5, md: 2.75 },
        alignItems: 'flex-start',
        mb: { xs: 2, md: 3 },
        flexDirection: { xs: 'column', sm: 'row' },
        width: '100%',
        minWidth: 0,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {eyebrow ? (
          <Typography
            sx={{
              color: CORP.blue,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 900,
              fontSize: { xs: 11, md: 12 },
            }}
          >
            {eyebrow}
          </Typography>
        ) : null}
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 22, sm: 26, md: 46 },
            letterSpacing: '-0.05em',
            color: CORP.navy,
            my: 1,
            fontWeight: 800,
            lineHeight: 1.15,
            wordBreak: 'break-word',
            ...titleSx,
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{
              color: CORP.muted,
              lineHeight: 1.55,
              m: 0,
              maxWidth: 880,
              fontSize: { xs: 13, md: 14 },
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
        <CorpAdminChip />
      </Box>
    </Box>
  );
}

export function CorpBtn({ variant = 'blue', fullWidth, children, sx, ...other }) {
  const variants = {
    blue: { bgcolor: CORP.blue, color: '#fff', '&:hover': { bgcolor: '#0a4fd6' } },
    primary: { bgcolor: '#fff', color: CORP.navy, '&:hover': { bgcolor: '#f5f8fc' } },
    secondary: {
      bgcolor: 'rgba(255,255,255,.13)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,.24)',
      '&:hover': { bgcolor: 'rgba(255,255,255,.2)' },
    },
    ghost: { bgcolor: '#eef5ff', color: CORP.blue, '&:hover': { bgcolor: '#e0edff' } },
  };

  return (
    <Button
      fullWidth={fullWidth}
      sx={{
        border: 0,
        borderRadius: 999,
        px: '17px',
        py: '12px',
        fontWeight: 900,
        textTransform: 'none',
        boxShadow: 'none',
        ...variants[variant],
        ...sx,
      }}
      {...other}
    >
      {children}
    </Button>
  );
}

export function CorpTextBtn({ disabled, children, sx, ...other }) {
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      sx={{
        display: 'block',
        border: 0,
        background: 'transparent',
        color: disabled ? CORP.muted : CORP.blue,
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 800,
        p: '4px 0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
        textAlign: 'left',
        ...sx,
      }}
      {...other}
    >
      {children}
    </Box>
  );
}

/** Same UI as mock; download runs without React re-renders (no table shake). */
export function CorpCertificateDownloadBtn({
  certificateId,
  learnerName,
  availableNote = 'Available for this learner',
  unavailableNote,
  available = true,
}) {
  const busyRef = useRef(false);

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!certificateId || busyRef.current) return;

    busyRef.current = true;
    const safeName = String(learnerName || 'learner').replace(/[^a-z0-9]+/gi, '-');

    // Fire-and-forget: no setState → parent table stays mounted/stable.
    void downloadCorporateCertificateFile(certificateId, {
      fileName: `Certificate-${safeName}.pdf`,
    })
      .catch((err) => {
        console.error('Certificate download failed:', err);
      })
      .finally(() => {
        busyRef.current = false;
      });
  };

  if (!available || !certificateId) {
    return (
      <>
        <CorpTextBtn disabled>Certificate not available yet</CorpTextBtn>
        {unavailableNote ? <small>{unavailableNote}</small> : null}
      </>
    );
  }

  return (
    <>
      <CorpTextBtn onClick={handleClick}>Download Certificate</CorpTextBtn>
      <small>{availableNote}</small>
    </>
  );
}

export function CorpTableHead({ columns }) {
  return (
    <Box
      component="thead"
      sx={{
        '& th': {
          textAlign: 'left',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: CORP.muted,
          p: '12px',
          borderBottom: `1px solid ${CORP.line}`,
          fontWeight: 600,
        },
      }}
    >
      <tr>
        {columns.map((col) => (
          <th key={col}>{col}</th>
        ))}
      </tr>
    </Box>
  );
}

export function corpTableSx(minWidth = 760) {
  return {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: { xs: Math.min(minWidth, 640), sm: minWidth },
    '& td': {
      p: { xs: '12px 10px', md: '15px 12px' },
      borderBottom: `1px solid ${CORP.line}`,
      verticalAlign: 'top',
      color: CORP.ink,
      fontSize: { xs: 13, md: 14 },
    },
    '& tr:last-child td': { borderBottom: 0 },
    '& small': {
      display: 'block',
      color: CORP.muted,
      fontSize: 12,
      mt: '4px',
      lineHeight: 1.35,
    },
  };
}
