import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

export function LessonVideoPlayer({
  embedUrl,
  videoSrc,
  videoPoster,
  videoRef,
  youtubeContainerRef,
  lockedOverlay,
  frameHeight,
  onLoadedMetadata,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onSeeking,
  onSeeked,
  floatingOverlay,
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'grey.900',
        width: '100%',
        aspectRatio: '16 / 9',
        height: 'auto',
        maxHeight: frameHeight,
        borderRadius: 0,
        boxShadow: (theme) => `0 12px 40px ${alpha(theme.palette.common.black, 0.14)}`,
        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
      }}
    >
      {embedUrl ? (
        <Box ref={youtubeContainerRef} sx={{ width: '100%', height: '100%' }} />
      ) : videoSrc ? (
        <Box
          component="video"
          ref={videoRef}
          poster={videoPoster || undefined}
          controls
          controlsList="noseek nodownload nofullscreen"
          playsInline
          disablePictureInPicture
          preload="metadata"
          onLoadedMetadata={onLoadedMetadata}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onTimeUpdate={onTimeUpdate}
          onSeeking={onSeeking}
          onSeeked={onSeeked}
          onKeyDown={(event) => {
            // Block keyboard-based seeking (arrow keys, Home/End, J/L shortcuts).
            const code = String(event.code || '').toLowerCase();
            const key = String(event.key || '').toLowerCase();
            const blocked =
              code === 'arrowleft' ||
              code === 'arrowright' ||
              code === 'home' ||
              code === 'end' ||
              key === 'arrowleft' ||
              key === 'arrowright' ||
              key === 'home' ||
              key === 'end' ||
              key === 'j' ||
              key === 'l';
            if (blocked) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
        >
          <source src={videoSrc} type="video/mp4" />
        </Box>
      ) : null}
      {floatingOverlay}
      {lockedOverlay}
    </Box>
  );
}
