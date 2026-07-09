import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { getYouTubeEmbedIframeSrc } from 'src/utils/youtube';
import {
  getLessonMediaFrameSx,
  getLessonVideoSurfaceSx,
  LESSON_MEDIA_FRAME_HEIGHT,
} from 'src/sections/learning/utils/player-responsive-type';

const hiddenPlayerLayerSx = {
  opacity: 0,
  visibility: 'hidden',
  pointerEvents: 'none',
  zIndex: 0,
};

const activePlayerLayerSx = {
  opacity: 1,
  visibility: 'visible',
  pointerEvents: 'auto',
  zIndex: 2,
};

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
  const showYoutube = Boolean(embedUrl);
  const showSpotlightr = Boolean(spotlightrMeta);
  const showNative = Boolean(videoSrc && !showYoutube && !showSpotlightr);
  const youtubeIframeSrc = showYoutube ? getYouTubeEmbedIframeSrc(embedUrl) : null;

  return (
    <Box sx={getLessonMediaFrameSx(theme, frameHeight)}>
      {/* Both shells stay mounted (opacity/z-index only) so refs + layout survive Spotlightr ↔ YouTube. */}
      <Box
        ref={youtubeContainerRef}
        sx={{
          ...getLessonVideoSurfaceSx(),
          ...(showYoutube ? activePlayerLayerSx : hiddenPlayerLayerSx),
        }}
      >
        {youtubeIframeSrc ? (
          <Box
            component="iframe"
            key={youtubeIframeSrc}
            data-yt-lesson-player="1"
            title="Course video"
            src={youtubeIframeSrc}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 0,
            }}
          />
        ) : null}
      </Box>
      <Box
        ref={spotlightrContainerRef}
        sx={{
          ...getLessonVideoSurfaceSx(),
          ...(showSpotlightr ? activePlayerLayerSx : hiddenPlayerLayerSx),
        }}
      />
      {showNative ? (
        <Box
          component="video"
          ref={videoRef}
          poster={videoPoster || undefined}
          controls
          controlsList="nodownload"
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
            ...activePlayerLayerSx,
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
