import Box from '@mui/material/Box';

import { parseSpotlightrUrl } from 'src/utils/spotlightr';

/** Official Spotlightr iframe embed (`?fallback=true`). */
export function SpotlightrVideoIframe({
  url,
  title = 'Video',
  sx,
  iframeSx,
  framed = false,
}) {
  const meta = parseSpotlightrUrl(url);
  if (!meta) return null;

  const iframe = (
    <Box
      component="iframe"
      className="spotlightr"
      title={title}
      src={meta.embedUrl}
      frameBorder="0"
      scrolling="no"
      name="videoPlayer"
      allow="autoplay; fullscreen; encrypted-media"
      allowFullScreen
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      sx={{
        border: 0,
        width: '100%',
        height: '100%',
        ...iframeSx,
      }}
    />
  );

  if (!framed) {
    return (
      <Box onContextMenu={(event) => event.preventDefault()} sx={{ width: '100%', height: '100%' }}>
        {iframe}
      </Box>
    );
  }

  return (
    <Box
      onContextMenu={(event) => event.preventDefault()}
      sx={{
        position: 'relative',
        width: '100%',
        pt: '56.25%',
        bgcolor: 'common.black',
        overflow: 'hidden',
        ...sx,
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0 }}>{iframe}</Box>
    </Box>
  );
}
