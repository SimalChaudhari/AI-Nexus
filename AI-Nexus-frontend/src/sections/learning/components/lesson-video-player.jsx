import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { getYouTubeEmbedIframeSrc } from 'src/utils/youtube';
import {
  preventVideoContextMenu,
  SECURE_VIDEO_ELEMENT_PROPS,
} from 'src/utils/secure-video';
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
  /** Force remount when the same video URL is reused across different sections. */
  remountKey = null,
}) {
  const theme = useTheme();
  const showYoutube = Boolean(embedUrl);
  const showSpotlightr = Boolean(spotlightrMeta);
  const showNative = Boolean(videoSrc && !showYoutube && !showSpotlightr);
  const youtubeIframeSrc = showYoutube ? getYouTubeEmbedIframeSrc(embedUrl) : null;
  const nativeKey = remountKey ? `${remountKey}|${videoSrc || ''}` : videoSrc || 'native';

  return (
    <Box
      key={remountKey || undefined}
      onContextMenu={preventVideoContextMenu}
      sx={getLessonMediaFrameSx(theme, frameHeight)}
    >
      {/* Both shells stay mounted (opacity/z-index only) so refs + layout survive Spotlightr ↔ YouTube. */}
      <Box
        ref={youtubeContainerRef}
        onContextMenu={preventVideoContextMenu}
        sx={{
          ...getLessonVideoSurfaceSx(),
          ...(showYoutube ? activePlayerLayerSx : hiddenPlayerLayerSx),
        }}
      >
        {youtubeIframeSrc ? (
          <Box
            component="iframe"
            key={`${remountKey || 'yt'}|${youtubeIframeSrc}`}
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
        key={remountKey ? `spotlightr-${remountKey}` : 'spotlightr'}
        onContextMenu={preventVideoContextMenu}
        sx={{
          ...getLessonVideoSurfaceSx(),
          ...(showSpotlightr ? activePlayerLayerSx : hiddenPlayerLayerSx),
        }}
      />
      {showNative ? (
        <Box
          component="video"
          key={nativeKey}
          ref={videoRef}
          poster={videoPoster || undefined}
          controls
          playsInline
          preload="metadata"
          {...SECURE_VIDEO_ELEMENT_PROPS}
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
            // Soften selection / long-press save UX on some browsers
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTouchCallout: 'none',
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
