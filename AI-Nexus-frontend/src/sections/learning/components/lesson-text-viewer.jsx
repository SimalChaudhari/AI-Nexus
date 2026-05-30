import Box from '@mui/material/Box';

export function LessonTextViewer({
  html,
  lockedOverlay,
  frameHeight,
  /** When true, lesson body grows naturally and the parent panel scrolls (no nested scroll). */
  scrollInParent = false,
}) {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          p: 2.5,
          bgcolor: 'background.paper',
          boxShadow: (theme) => theme.customShadows.z8,
          color: 'text.primary',
          border: (theme) => `1px solid ${theme.palette.divider}`,
          '& img': { maxWidth: '100%', height: 'auto' },
          '& pre': { overflowX: 'auto', maxWidth: '100%' },
          '& p': { marginBottom: 1.5 },
          '& h1, & h2, & h3': { marginTop: 2, marginBottom: 1 },
          ...(scrollInParent
            ? {
                minHeight: frameHeight,
                height: 'auto',
                overflow: 'visible',
              }
            : {
                height: frameHeight,
                overflow: 'auto',
              }),
        }}
        dangerouslySetInnerHTML={{ __html: html || '' }}
      />
      {lockedOverlay}
    </Box>
  );
}

