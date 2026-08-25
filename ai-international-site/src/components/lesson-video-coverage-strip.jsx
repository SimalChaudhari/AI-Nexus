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
} from 'src/utils/video-coverage';

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

  if (duration <= 0) {
    const liveClock = formatSecondsToClock(Math.max(0, Number(currentTimeSec) || 0));
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
            {liveClock} / — • 0% unique
          </Typography>
        </Stack>
        <Box
          sx={{
            height: STRIP_HEIGHT,
            borderRadius: 999,
            bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.2 : 0.12),
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
          Play this video to start unique coverage. Every module has its own watch range.
        </Typography>
      </Box>
    );
  }

  const watched = clipCoverageRanges(parseCoverageRangePairs(watchedRanges), duration);
  const unwatched = computeUnwatchedRanges(watched, duration);
  const watchedSec = coverageMeasureSeconds(watched, duration);
  const pct = coveragePercentDisplay(watchedSec, duration, { isComplete });
  const required = Math.max(0, Number(requiredSeconds) || 0);
  // Always show Required minimum when admin minutes are set.
  // If required >= duration (catalog ≈ video length), pin the marker at the end.
  const requiredPct =
    required > 0 && duration > 0
      ? Math.min(99.4, Math.max(0.1, (100 * Math.min(required, duration)) / duration))
      : null;

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

  const handleTrackClick = (event) => {
    if (disabled || typeof onSeekTo !== 'function') return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!(rect.width > 0)) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    handleSeek(ratio * duration);
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
          {formatSecondsToClock(clockSec)} / {formatSecondsToClock(duration)} • {pct}% unique
        </Typography>
      </Stack>

      <Box
        sx={{
          position: 'relative',
          height: STRIP_HEIGHT,
          borderRadius: 999,
          bgcolor: trackBg,
          overflow: 'hidden',
          cursor: onSeekTo && !disabled ? 'pointer' : 'default',
        }}
      >
        {unwatched.map(([start, end]) => {
          const leftPct = (100 * start) / duration;
          const widthPct = (100 * (end - start)) / duration;
          const label = formatRangeLabel([start, end]);
          return (
            <Tooltip key={`gap-${start}-${end}`} title={`Not watched — click to jump to ${label}`} arrow>
              <Box
                sx={{
                  ...segmentStyle(leftPct, widthPct),
                  bgcolor: unwatchedColor,
                  pointerEvents: 'none',
                  zIndex: 2,
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

        {requiredPct != null ? (
          <Tooltip title={`Required minimum · ${formatSecondsToClock(Math.min(required, duration))}`} arrow>
            <Box
              sx={{
                position: 'absolute',
                left: `${Math.min(requiredPct, 99.4)}%`,
                top: -2,
                bottom: -2,
                width: 2,
                bgcolor: alpha(theme.palette.warning.main, 0.95),
                zIndex: 2,
                pointerEvents: 'none',
              }}
              aria-hidden
            />
          </Tooltip>
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

        {onSeekTo && !disabled ? (
          <Box
            role="slider"
            tabIndex={0}
            aria-label="Jump to time"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(playheadSec != null ? playheadSec : 0)}
            onClick={handleTrackClick}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                handleSeek((playheadSec || 0) + 5);
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                handleSeek((playheadSec || 0) - 5);
              }
            }}
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 4,
              cursor: 'pointer',
            }}
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
          {requiredPct != null ? (
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
              {unwatchedSec > 0 ? ` (${formatSecondsToClock(unwatchedSec)} remaining)` : ''}
            </>
          )}
        </Typography>
      </Stack>
    </Box>
  );
}
