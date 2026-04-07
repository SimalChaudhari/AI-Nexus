import Box from '@mui/material/Box';

export function LessonTextViewer({ html, lockedOverlay, frameHeight }) {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          p: 2.5,
          bgcolor: 'background.paper',
          boxShadow: (theme) => theme.customShadows.z8,
          color: 'text.primary',
          height: frameHeight,
          overflow: 'auto',
          border: (theme) => `1px solid ${theme.palette.divider}`,
          '& img': { maxWidth: '100%', height: 'auto' },
          '& pre': { overflow: 'auto' },
          '& p': { marginBottom: 1.5 },
          '& h1, & h2, & h3': { marginTop: 2, marginBottom: 1 },
        }}
        dangerouslySetInnerHTML={{ __html: html || '' }}
      />
      {lockedOverlay}
    </Box>
  );
}

