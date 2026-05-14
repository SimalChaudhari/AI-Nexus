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

  const rootClass = ['view-html-content', className].filter(Boolean).join(' ');

  return (
    <Box
      className={rootClass}
      sx={{
        // Base rich-text typography used across admin/public detail pages.
        typography: 'body2',
        color: 'text.secondary',
        wordBreak: 'break-word',
        // Clear floated images so later blocks do not overlap.
        '&::after': { content: '""', display: 'block', clear: 'both' },
        // Keep paragraph rhythm compact to match editor output.
        '& p': { mb: 0.5, '&:last-child': { mb: 0 } },
        // global.css sets ul { list-style-type: none; padding: 0 } — restore real markers.
        '& ul': {
          pl: '1.5rem !important',
          my: 0.5,
          ml: 0,
          listStyleType: 'disc !important',
          listStylePosition: 'outside',
          listStyleImage: 'none',
        },
        '& ol': {
          pl: '1.5rem !important',
          my: 0.5,
          ml: 0,
          listStyleType: 'decimal !important',
          listStylePosition: 'outside',
          listStyleImage: 'none',
        },
        '& ul > li, & ol > li': {
          display: 'list-item',
        },
        // Tighten list spacing so bullets align with editor preview.
        '& li': { mb: 0, lineHeight: 1.9 },
        '& li > p': { m: 0, display: 'inline' },
        '& ul li::marker, & ol li::marker': {
          color: 'text.secondary',
        },
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
        '& img': {
          maxWidth: '100%',
          height: 'auto',
          borderRadius: 1.5,
          verticalAlign: 'middle',
        },
        // Preserve CKEditor left/right float behavior for wrapped content.
        '& img[style*="float: left"], & img[style*="float:left"]': {
          margin: '0 12px 8px 0',
        },
        '& img[style*="float: right"], & img[style*="float:right"]': {
          margin: '0 0 8px 12px',
        },
        // Prompt catalog / custom editor image class
        '& img.nml__editor__content__image': { maxWidth: '100%', height: 'auto' },
        '& figure.image.image-style-align-left': { float: 'left', margin: '0 12px 8px 0' },
        '& figure.image.image-style-align-right': { float: 'right', margin: '0 0 8px 12px' },
        '& figure.image.image-style-block-align-center': {
          marginLeft: 'auto',
          marginRight: 'auto',
        },
        '& figure.image img': { display: 'block' },
        // CKEditor tables / captions
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          my: 1,
          fontSize: '0.9375em',
        },
        '& th, & td': {
          border: (theme) => `1px solid ${theme.palette.divider}`,
          px: 1,
          py: 0.75,
          verticalAlign: 'top',
        },
        '& figcaption': {
          mt: 0.5,
          fontSize: '0.875rem',
          color: 'text.secondary',
          textAlign: 'center',
        },
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
