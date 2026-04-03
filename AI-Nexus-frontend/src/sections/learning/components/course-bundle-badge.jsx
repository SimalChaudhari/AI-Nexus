import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

/**
 * Learning catalog bundle treatments: ribbon on thumbnails, pill on lists, compact inline.
 */
export function LearningBundleRibbon({ count, sx }) {
  const theme = useTheme();
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.75}
      sx={{
        position: 'absolute',
        left: 10,
        bottom: 10,
        zIndex: 1,
        px: 1.1,
        py: 0.55,
        borderRadius: 1,
        color: 'common.white',
        typography: 'caption',
        fontWeight: 800,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        fontSize: '0.62rem',
        lineHeight: 1.2,
        background: `linear-gradient(125deg, ${theme.palette.secondary.dark} 0%, ${alpha(theme.palette.primary.dark, 0.92)} 55%, ${alpha('#1a237e', 0.85)} 100%)`,
        boxShadow: `0 6px 16px ${alpha(theme.palette.common.black, 0.28)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.2)}`,
        border: `1px solid ${alpha(theme.palette.common.white, 0.22)}`,
        backdropFilter: 'blur(8px)',
        ...sx,
      }}
    >
      <Iconify icon="solar:layers-bold" width={14} sx={{ opacity: 0.95 }} />
      <Box component="span">Bundle</Box>
      {count > 0 ? (
        <Box
          component="span"
          sx={{
            ml: 0.25,
            px: 0.65,
            py: 0.1,
            borderRadius: 0.75,
            bgcolor: alpha(theme.palette.common.white, 0.2),
            fontWeight: 800,
            fontSize: '0.58rem',
          }}
        >
          {count}
        </Box>
      ) : null}
    </Stack>
  );
}

export function LearningBundlePill({ count, sx }) {
  const theme = useTheme();
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{
        width: 'fit-content',
        maxWidth: '100%',
        px: 1,
        py: 0.35,
        borderRadius: 10,
        bgcolor: alpha(theme.palette.secondary.main, 0.1),
        border: `1px solid ${alpha(theme.palette.secondary.main, 0.28)}`,
        ...sx,
      }}
    >
      <Iconify icon="solar:layers-minimalistic-bold" width={14} sx={{ color: 'secondary.main', flexShrink: 0 }} />
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: 'secondary.dark',
          letterSpacing: 0.2,
          fontSize: '0.72rem',
          lineHeight: 1.3,
        }}
      >
        Course bundle
        {count > 0 ? (
          <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600, ml: 0.5 }}>
            · {count} program{count === 1 ? '' : 's'}
          </Box>
        ) : null}
      </Typography>
    </Stack>
  );
}

/** Prominent callout for course detail / marketing hero. */
export function LearningBundleHighlight({ count, sx }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.secondary.main, 0.22)}`,
        background: `linear-gradient(
          105deg,
          ${alpha(theme.palette.secondary.main, 0.14)} 0%,
          ${alpha(theme.palette.primary.main, 0.08)} 48%,
          ${alpha(theme.palette.secondary.light, 0.06)} 100%
        )`,
        boxShadow: `0 12px 40px ${alpha(theme.palette.secondary.main, 0.08)}`,
        ...sx,
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.secondary.main, 0.16),
            color: 'secondary.dark',
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
          }}
        >
          <Iconify icon="solar:layers-bold" width={28} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: 1, display: 'block', mb: 0.25 }}
          >
            Professional bundle
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.35, mb: 0.5 }}>
            {count > 0
              ? `${count} curated program${count === 1 ? '' : 's'} in one package`
              : 'Multiple curated programs in one package'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, maxWidth: 560 }}>
            One enrollment covers every course listed below. Open each program to learn at your own pace—ideal for
            structured pathways and continuing education.
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
