import Box from '@mui/material/Box';

import { ViewHtmlContent } from './view-html-content';

// ----------------------------------------------------------------------

/**
 * Reusable renderer for CKEditor/HTML content with optional line clamp.
 */
export function RichTextContent({ html, sx, className, clampLines }) {
  if (!html || typeof html !== 'string') return null;

  const clampSx = clampLines
    ? {
        display: '-webkit-box',
        WebkitLineClamp: clampLines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }
    : {};

  return (
    <Box
      className={className}
      sx={{
        '& p': { m: 0 },
        '& *': { maxWidth: '100%' },
        ...clampSx,
      }}
    >
      <ViewHtmlContent html={html} sx={sx} />
    </Box>
  );
}
