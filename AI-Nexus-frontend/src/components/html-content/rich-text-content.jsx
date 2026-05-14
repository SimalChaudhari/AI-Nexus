import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { ViewHtmlContent } from './view-html-content';

// ----------------------------------------------------------------------

/**
 * Reusable renderer for CKEditor/HTML content with optional line clamp.
 *
 * @param {boolean} [listPreview] — When true (e.g. forum list cards), floated editor images are
 *   stacked and size-capped so -webkit-line-clamp previews do not squash images or wrap text beside them.
 */
export function RichTextContent({ html, sx, className, clampLines, listPreview = false }) {
  if (!html || typeof html !== 'string') return null;

  // Do not use -webkit-line-clamp here: display:-webkit-box breaks <ul>/<ol> markers in Chrome/WebKit.
  const clampInnerSx = clampLines
    ? {
        overflow: 'hidden',
        fontSize: '0.9375rem',
        lineHeight: 1.65,
        maxHeight: `${clampLines * 1.65}em`,
      }
    : {};

  const listPreviewSx = listPreview
    ? {
        // -webkit-box (line clamp) + floated images breaks layout; stack media like a feed card.
        '& img': {
          float: 'none !important',
          display: 'block',
          maxWidth: '100%',
          width: 'auto !important',
          height: 'auto',
          maxHeight: { xs: 160, sm: 200 },
          objectFit: 'contain',
          objectPosition: 'left center',
          my: 1,
          mx: 0,
          borderRadius: 1.5,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: (theme) => alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.12 : 0.5),
        },
        '& figure': {
          float: 'none !important',
          display: 'block',
          maxWidth: '100%',
          my: 1,
          mx: 0,
        },
        '& figure img': {
          maxHeight: { xs: 160, sm: 200 },
          border: 'none',
          bgcolor: 'transparent',
        },
        '& ul, & ol': {
          clear: 'both',
          width: '100%',
          float: 'none',
          listStylePosition: 'outside',
          pl: '1.5rem !important',
          listStyleImage: 'none',
        },
        '& ul': { listStyleType: 'disc !important' },
        '& ol': { listStyleType: 'decimal !important' },
        '& ul > li, & ol > li': { display: 'list-item' },
      }
    : {};

  return (
    <Box
      className={className}
      sx={{
        '& p': { m: 0 },
        '& *': { maxWidth: '100%' },
        ...listPreviewSx,
      }}
    >
      <Box sx={clampInnerSx}>
        <ViewHtmlContent html={html} sx={sx} />
      </Box>
    </Box>
  );
}
