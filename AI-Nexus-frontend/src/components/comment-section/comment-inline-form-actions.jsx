import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import CircularProgress from 'src/components/loading/circular-progress';
// ----------------------------------------------------------------------

const commentInlineFormActionsSx = {
  mt: 1.25,
  gap: 1,
};

export function CommentInlineFormActions({
  onCancel,
  onSubmit,
  submitting = false,
  submitDisabled = false,
  cancelLabel = 'Cancel',
  submitLabel = 'Post',
  submittingLabel = 'Posting…',
}) {
  const theme = useTheme();

  return (
    <Stack
      direction={{ xs: 'column-reverse', sm: 'row' }}
      spacing={1}
      justifyContent="flex-end"
      sx={commentInlineFormActionsSx}
    >
      <Button
        fullWidth
        size="small"
        variant="outlined"
        color="inherit"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCancel?.(e);
        }}
        disabled={submitting}
        sx={{
          borderColor: theme.palette.divider,
          display: { xs: 'flex', sm: 'inline-flex' },
          flex: { sm: '0 0 auto' },
        }}
      >
        {cancelLabel}
      </Button>
      <Button
        fullWidth
        size="small"
        variant="contained"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSubmit?.(e);
        }}
        disabled={submitting || submitDisabled}
        startIcon={
          submitting ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <Iconify icon="solar:plain-2-bold" width={18} />
          )
        }
        sx={{
          display: { xs: 'flex', sm: 'inline-flex' },
          flex: { sm: '0 0 auto' },
          minWidth: { sm: 100 },
          fontWeight: 600,
          boxShadow:
            submitting || submitDisabled
              ? 'none'
              : `0 4px 12px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(25, 118, 210, 0.28)'}`,
          '&.Mui-disabled': {
            bgcolor: alpha(theme.palette.primary.main, 0.22),
            color: alpha(theme.palette.primary.contrastText, 0.85),
          },
          '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inline-flex' } },
        }}
      >
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </Stack>
  );
}
