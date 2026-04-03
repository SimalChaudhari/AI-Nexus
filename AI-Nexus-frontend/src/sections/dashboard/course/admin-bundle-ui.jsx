import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

/** Compact bundle column cell for admin course list table. */
export function AdminBundleTableCell({ row }) {
  const theme = useTheme();
  const n = Array.isArray(row.bundleCourseIds) ? row.bundleCourseIds.length : 0;

  if (!row.isBundle) {
    return (
      <Box component="span" sx={{ color: 'text.disabled', typography: 'body2' }}>
        —
      </Box>
    );
  }

  return (
    <Stack direction="row" alignItems="center" spacing={1.25}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: `linear-gradient(140deg, ${alpha(theme.palette.secondary.dark, 0.85)} 0%, ${alpha(theme.palette.primary.dark, 0.75)} 100%)`,
          color: 'common.white',
          boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.35)}`,
        }}
      >
        <Iconify icon="solar:layers-bold" width={22} />
      </Box>
      <Stack spacing={0.15} sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            color: 'secondary.dark',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontSize: '0.65rem',
            lineHeight: 1.2,
          }}
        >
          Bundle
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.25, color: 'text.primary' }}>
          {n > 0 ? `${n} course${n === 1 ? '' : 's'}` : 'No courses yet'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
          {n > 0 ? 'Linked programs' : 'Add in edit'}
        </Typography>
      </Stack>
    </Stack>
  );
}
