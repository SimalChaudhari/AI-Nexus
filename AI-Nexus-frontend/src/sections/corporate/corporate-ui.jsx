import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { CORP, STATUS_PILL_SX, statusTone } from './corporate-theme';

// ----------------------------------------------------------------------

export function CorpCard({ children, sx, ...other }) {
  return (
    <Box
      sx={{
        bgcolor: CORP.card,
        border: `1px solid ${CORP.line}`,
        borderRadius: CORP.radius,
        p: '22px',
        boxShadow: CORP.shadow,
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
  const completed = Number(pillar?.c) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const text =
    textType === 'long' ? `${completed}h out of ${total}h` : `${completed}h / ${total}h`;

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
    </Box>
  );
}

export function CorpAdminChip() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        bgcolor: '#fff',
        border: `1px solid ${CORP.line}`,
        borderRadius: 999,
        px: '13px',
        py: '9px',
        boxShadow: CORP.shadow,
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${CORP.blue}, ${CORP.cyan})`,
          display: 'grid',
          placeItems: 'center',
          color: 'white',
          fontWeight: 900,
          fontSize: 13,
        }}
      >
        HR
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: CORP.ink, lineHeight: 1.2 }}>
          HR Admin
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}>
          Corporate account
        </Typography>
      </Box>
    </Box>
  );
}

export function CorpPageHeader({ eyebrow, title, subtitle }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 2,
        alignItems: { xs: 'flex-start', md: 'center' },
        mb: 3,
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      <Box>
        {eyebrow ? (
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -0.4 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary', maxWidth: 720 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <CorpAdminChip />
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
        fontWeight: 900,
        p: '4px 0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
        font: 'inherit',
        textAlign: 'left',
        ...sx,
      }}
      {...other}
    >
      {children}
    </Box>
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
          letterSpacing: '0.08em',
          color: CORP.muted,
          p: '12px',
          borderBottom: `1px solid ${CORP.line}`,
          fontWeight: 800,
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
    minWidth,
    '& td': {
      p: '15px 12px',
      borderBottom: `1px solid ${CORP.line}`,
      verticalAlign: 'top',
      color: CORP.ink,
      fontSize: 14,
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
