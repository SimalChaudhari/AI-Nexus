import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

/**
 * Renders stored TipTap HTML safely for display (admin/user announcement bodies).
 * Content is trusted admin-authored HTML; avoid passing untrusted user HTML here without sanitization.
 */
export function ViewHtmlContent({ html, sx, className }) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  return (
    <Box
      className={className}
      sx={{
        // Base rich-text typography used across admin/public detail pages.
        typography: 'body2',
        color: 'text.secondary',
        wordBreak: 'break-word',
        // Clear floated images so later blocks do not overlap.
        '&::after': { content: '""', display: 'block', clear: 'both' },
        // Keep paragraph rhythm compact to match editor output.
        '& p': { mb: 0.5, '&:last-child': { mb: 0 } },
        // Explicit list styles are required because global.css resets <ul>.
        '& ul': {
          pl: 1.5,
          my: 0.25,
          listStyleType: 'disc',
          listStylePosition: 'outside',
        },
        '& ol': {
          pl: 1.5,
          my: 0.25,
          listStyleType: 'decimal',
          listStylePosition: 'outside',
        },
        // Tighten list spacing so bullets align with editor preview.
        '& li': { mb: 0, lineHeight: 1.9 },
        '& li > p': { m: 0, display: 'inline' },
        '& a': { color: 'primary.main' },
        '& strong, & b': { fontWeight: 700 },
        '& em, & i': { fontStyle: 'italic' },
        '& s, & strike': { textDecoration: 'line-through' },
        // Slightly larger heading scale for better frontend readability.
        '& h1': { typography: 'h3', my: 1.25, fontWeight: 700, lineHeight: 1.25 },
        '& h2': { typography: 'h4', my: 1, fontWeight: 700, lineHeight: 1.3 },
        '& h3': { typography: 'h5', my: 0.75, fontWeight: 700, lineHeight: 1.35 },
        '& h4': { typography: 'body1',fontSize: '16px', my: 0.5, fontWeight: 700, lineHeight: 1.4 },
        '& h5': { typography: 'subtitle2',fontSize: '18px', my: 0.25, fontWeight: 700, lineHeight: 1.5 },
        '& h6': { typography: 'subtitle1',fontSize: '16px', my: 0.1, fontWeight: 700, lineHeight: 1.6 },
        '& blockquote': {
          my: 1,
          pl: 2,
          borderLeft: (theme) => `4px solid ${theme.palette.divider}`,
          color: 'text.secondary',
        },
        '& pre, & code': { fontFamily: 'monospace', fontSize: '0.875em' },
        '& .lead-text': { fontSize: '1.05rem', fontWeight: 600, color: 'text.primary' },
        '& .muted-text': { color: 'text.disabled' },
        '& .info-box': {
          my: 1,
          px: 1.5,
          py: 1,
          borderRadius: 1,
          border: (theme) => `1px solid ${theme.palette.info.light}`,
          backgroundColor: (theme) => theme.palette.info.lighter || theme.palette.info.light,
        },
        '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
        // Preserve CKEditor left/right float behavior for wrapped content.
        '& img[style*="float: left"]': { margin: '0 12px 8px 0' },
        '& img[style*="float: right"]': { margin: '0 0 8px 12px' },
        '& figure.image.image-style-align-left': { float: 'left', margin: '0 12px 8px 0' },
        '& figure.image.image-style-align-right': { float: 'right', margin: '0 0 8px 12px' },
        '& figure.image.image-style-block-align-center': {
          marginLeft: 'auto',
          marginRight: 'auto',
        },
        '& figure.image img': { display: 'block' },
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
