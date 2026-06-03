import { alpha } from '@mui/material/styles';

import { editorClasses } from 'src/components/editor/classes';

// ----------------------------------------------------------------------

export const commentComposerShellSx = (theme) => ({
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  p: { xs: 2, sm: 2.5 },
  borderRadius: '16px',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
  background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.07)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 55%)`,
});

/** Shared editor surface for parent comment, reply, and edit composers. */
export const commentComposerEditorSx = (theme) => ({
  width: '100%',
  maxWidth: '100%',
  minHeight: 'unset !important',
  maxHeight: 'none !important',
  borderRadius: 0,
  border: 'none',
  overflow: 'visible',
  [`& .${editorClasses.toolbar.root}`]: {
    width: '100%',
    flexWrap: 'wrap',
    overflow: 'visible',
    p: { xs: 0.75, sm: 1.25 },
    gap: { xs: 0.5, sm: 0.75 },
    borderBottom: `1px solid ${theme.palette.divider}`,
    bgcolor: alpha(theme.palette.grey[500], 0.04),
  },
  [`& .${editorClasses.content.root}`]: {
    width: '100%',
    overflow: 'visible',
    overflowY: 'visible !important',
    flex: '0 0 auto',
    minHeight: { xs: 88, sm: 120 },
    '& .tiptap.ProseMirror': {
      minHeight: { xs: 88, sm: 120 },
      py: { xs: 1.25, sm: 1.5 },
      px: { xs: 1.5, sm: 2 },
      fontSize: { xs: '0.875rem', sm: '0.9375rem' },
    },
  },
});

export const commentComposerFullWidthWrapSx = {
  mt: 2,
  width: '100%',
  maxWidth: '100%',
};
