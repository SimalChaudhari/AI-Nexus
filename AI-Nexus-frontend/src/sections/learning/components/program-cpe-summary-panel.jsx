import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

function formatCpeHoursLabel(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
  return `${text} CPE Hour${rounded === 1 ? '' : 's'}`;
}

function formatWatchTimeLabel(summary) {
  if (summary?.totalWatchedTime) return summary.totalWatchedTime;
  const seconds = Math.max(0, Number(summary?.totalWatchedSeconds || 0));
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  if (hh > 0) {
    return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

export function ProgramCpeSummaryPanel({ summary, compact = false }) {
  const theme = useTheme();
  const breakdown = Array.isArray(summary?.pillarBreakdown) ? summary.pillarBreakdown : [];
  if (!breakdown.length) return null;

  const earnedCpeHours = Number(summary?.totalEarnedCpeHours ?? summary?.totalCpeHours ?? 0);
  const allocatedCpeHours = summary?.totalAllocatedCpeHours;
  const watchTime = formatWatchTimeLabel(summary);

  return (
    <Box
      sx={{
        p: compact ? 1.5 : 2,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.success.main, 0.06),
        border: `1px solid ${alpha(theme.palette.success.main, 0.22)}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Iconify icon="solar:clock-circle-bold" width={18} sx={{ color: 'success.dark' }} />
        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 0.06, textTransform: 'uppercase', color: 'success.dark' }}>
          Programme CPE summary
        </Typography>
      </Stack>

      <Typography variant={compact ? 'h6' : 'h5'} sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
        {formatCpeHoursLabel(earnedCpeHours)}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
        Earned from unique video watch time across Pillar 1, 2, and 3
      </Typography>

      <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: 'text.primary' }}>
        {watchTime} watched
      </Typography>

      {allocatedCpeHours != null ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
          Programme allocation: {formatCpeHoursLabel(allocatedCpeHours)}
        </Typography>
      ) : null}

      <Divider sx={{ my: 1.25, borderStyle: 'dashed' }} />

      <Stack spacing={0.75}>
        {breakdown.map((row) => (
          <Stack
            key={`pillar-${row.pillarIndex}-${row.courseId}`}
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={1}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Pillar {row.pillarIndex}
            </Typography>
            <Stack spacing={0.15} sx={{ alignItems: 'flex-end' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {formatCpeHoursLabel(row.earnedCpeHours ?? 0)}
                {row.allocatedCpeHours != null ? ` / ${formatCpeHoursLabel(row.allocatedCpeHours)}` : ''}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {row.watchedTime || '0:00'} watched
                {row.allVideosCompleted ? ' · complete' : ''}
              </Typography>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
