import Box from '@mui/material/Box';

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
        height: frameHeight,
        boxShadow: (theme) => theme.customShadows.z8,
        border: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      {embedUrl ? (
        <Box ref={youtubeContainerRef} sx={{ width: '100%', height: '100%' }} />
      ) : videoSrc ? (
        <Box
          component="video"
          ref={videoRef}
          // poster={videoPoster}
          controls
          playsInline
          onLoadedMetadata={onLoadedMetadata}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onTimeUpdate={onTimeUpdate}
          onSeeked={onSeeked}
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

