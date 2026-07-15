import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';

import {
  clipCoverageRanges,
  computeUnwatchedRanges,
  coverageMeasureSeconds,
  coveragePercentDisplay,
  formatRangeLabel,
  formatSecondsToClock,
  parseCoverageRangePairs,
} from 'src/sections/learning/utils/video-coverage';

const STRIP_HEIGHT = 10;

function segmentStyle(leftPct, widthPct) {
  return {
    position: 'absolute',
    left: `${leftPct}%`,
    width: `${Math.max(widthPct, 0.35)}%`,
    top: 0,
    bottom: 0,
  };
}

/**
 * Timeline below the player — watched vs not-yet-watched segments (Udemy-style).
 */
export function LessonVideoCoverageStrip({
  durationSeconds = 0,
  watchedRanges = [],
  currentTimeSec = null,
  requiredSeconds = 0,
  isComplete = false,
  onSeekTo,
  disabled = false,
}) {
  const theme = useTheme();
  const duration = Math.max(0, Number(durationSeconds) || 0);
  if (duration <= 0) return null;

  const watched = clipCoverageRanges(parseCoverageRangePairs(watchedRanges), duration);
  const unwatched = computeUnwatchedRanges(watched, duration);
  const watchedSec = coverageMeasureSeconds(watched, duration);
  const pct = coveragePercentDisplay(watchedSec, duration, { isComplete });
  const required = Math.max(0, Number(requiredSeconds) || 0);
  const requiredPct =
    required > 0 && required < duration ? Math.min(100, Math.round((100 * required) / duration)) : null;

  const unwatchedSec = Math.max(0, duration - watchedSec);
  const gapLabels = unwatched.map(formatRangeLabel);
  const visibleGaps = gapLabels.slice(0, 3);
  const moreGaps = gapLabels.length - visibleGaps.length;

  const watchedColor = isComplete ? theme.palette.success.main : theme.palette.primary.main;
  const unwatchedColor = alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.35 : 0.22);
  const trackBg = alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.2 : 0.12);

  const handleSeek = (seconds) => {
    if (disabled || typeof onSeekTo !== 'function') return;
    onSeekTo(Math.max(0, Math.min(duration, Number(seconds) || 0)));
  };

  const playheadSec =
    currentTimeSec != null && Number.isFinite(currentTimeSec)
      ? Math.min(duration, Math.max(0, currentTimeSec))
      : null;
  const playheadPct =
    playheadSec != null ? Math.min(100, Math.max(0, (100 * playheadSec) / duration)) : null;
  // Match player + sidebar: clock = playhead; % stays unique coverage.
  const clockSec = playheadSec != null ? playheadSec : watchedSec;

  return (
    <Box
      sx={{
        mt: 1.5,
        px: { xs: 0.5, sm: 0 },
        py: 1.25,
        borderRadius: 1.5,
        bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.08 : 0.06),
        border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Watch coverage
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {formatSecondsToClock(clockSec)} / {formatSecondsToClock(duration)} • {pct}%
        </Typography>
      </Stack>

      <Box
        sx={{
          position: 'relative',
          height: STRIP_HEIGHT,
          borderRadius: 999,
          bgcolor: trackBg,
          overflow: 'hidden',
        }}
      >
        {unwatched.map(([start, end]) => {
          const leftPct = (100 * start) / duration;
          const widthPct = (100 * (end - start)) / duration;
          const label = formatRangeLabel([start, end]);
          return (
            <Tooltip key={`gap-${start}-${end}`} title={`Not watched — click to jump to ${label}`} arrow>
              <Box
                role={onSeekTo && !disabled ? 'button' : undefined}
                tabIndex={onSeekTo && !disabled ? 0 : undefined}
                onClick={() => handleSeek(start + 0.05)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSeek(start + 0.05);
                  }
                }}
                sx={{
                  ...segmentStyle(leftPct, widthPct),
                  bgcolor: unwatchedColor,
                  cursor: onSeekTo && !disabled ? 'pointer' : 'default',
                  '&:hover': onSeekTo && !disabled ? { filter: 'brightness(0.92)' } : undefined,
                }}
                aria-label={`Unwatched segment ${label}`}
              />
            </Tooltip>
          );
        })}

        {watched.map(([start, end]) => {
          const leftPct = (100 * start) / duration;
          const widthPct = (100 * (end - start)) / duration;
          return (
            <Box
              key={`watched-${start}-${end}`}
              sx={{
                ...segmentStyle(leftPct, widthPct),
                bgcolor: watchedColor,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          );
        })}

        {requiredPct != null && requiredPct < 100 ? (
          <Box
            sx={{
              position: 'absolute',
              left: `${requiredPct}%`,
              top: -2,
              bottom: -2,
              width: 2,
              bgcolor: alpha(theme.palette.warning.main, 0.85),
              zIndex: 2,
              pointerEvents: 'none',
            }}
            aria-hidden
          />
        ) : null}

        {playheadPct != null ? (
          <Box
            sx={{
              position: 'absolute',
              left: `${playheadPct}%`,
              top: -1,
              bottom: -1,
              width: 2,
              ml: '-1px',
              bgcolor: 'common.white',
              boxShadow: `0 0 0 1px ${alpha(theme.palette.common.black, 0.45)}`,
              zIndex: 3,
              pointerEvents: 'none',
            }}
            aria-hidden
          />
        ) : null}
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={0.75}
        sx={{ mt: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: watchedColor }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Watched
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: unwatchedColor }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Not watched yet
            </Typography>
          </Stack>
          {requiredPct != null && requiredPct < 100 ? (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box
                sx={{
                  width: 2,
                  height: 10,
                  borderRadius: 1,
                  bgcolor: theme.palette.warning.main,
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Required minimum
              </Typography>
            </Stack>
          ) : null}
        </Stack>

        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'right' }}>
          {unwatched.length === 0 ? (
            'All sections watched'
          ) : (
            <>
              Still to watch: {visibleGaps.join(', ')}
              {moreGaps > 0 ? ` +${moreGaps} more` : ''}
              {unwatchedSec > 0 ? ` (${formatSecondsToClock(unwatchedSec)} total)` : ''}
            </>
          )}
        </Typography>
      </Stack>
    </Box>
  );
}
