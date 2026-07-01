import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import {
  getLessonMediaFrameSx,
  getLessonVideoSurfaceSx,
  LESSON_MEDIA_FRAME_HEIGHT,
} from 'src/sections/learning/utils/player-responsive-type';

export function LessonVideoPlayer({
  embedUrl,
  spotlightrMeta,
  videoSrc,
  videoPoster,
  videoRef,
  youtubeContainerRef,
  spotlightrContainerRef,
  lockedOverlay,
  frameHeight = LESSON_MEDIA_FRAME_HEIGHT,
  onLoadedMetadata,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onSeeked,
  floatingOverlay,
}) {
  const theme = useTheme();

  return (
    <Box sx={getLessonMediaFrameSx(theme, frameHeight)}>
      {embedUrl ? (
        <Box ref={youtubeContainerRef} sx={getLessonVideoSurfaceSx()} />
      ) : spotlightrMeta ? (
        <Box ref={spotlightrContainerRef} sx={getLessonVideoSurfaceSx()} />
      ) : videoSrc ? (
        <Box
          component="video"
          ref={videoRef}
          poster={videoPoster || undefined}
          controls
          controlsList="nodownload nofullscreen"
          playsInline
          disablePictureInPicture
          preload="metadata"
          onLoadedMetadata={onLoadedMetadata}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onTimeUpdate={onTimeUpdate}
          onSeeked={onSeeked}
          sx={{
            ...getLessonVideoSurfaceSx(),
            objectFit: 'contain',
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </Box>
      ) : null}
      {floatingOverlay}
      {lockedOverlay}
    </Box>
  );
}
