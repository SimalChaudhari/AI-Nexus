import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import {
  getLessonMediaFrameSx,
  LESSON_MEDIA_FRAME_HEIGHT,
} from 'src/sections/learning/utils/player-responsive-type';

export function LessonVideoPlayer({
  embedUrl,
  videoSrc,
  videoPoster,
  videoRef,
  youtubeContainerRef,
  lockedOverlay,
  frameHeight = LESSON_MEDIA_FRAME_HEIGHT,
  onLoadedMetadata,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onSeeking,
  onSeeked,
  floatingOverlay,
}) {
  const theme = useTheme();

  return (
    <Box sx={getLessonMediaFrameSx(theme, frameHeight)}>
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
