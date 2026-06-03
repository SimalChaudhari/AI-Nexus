import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Editor } from 'src/components/editor';
import CircularProgress from 'src/components/loading/circular-progress';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
import { commentComposerEditorSx, commentComposerShellSx } from './comment-composer-styles';

// ----------------------------------------------------------------------

export function CommentRichTextComposer({
  value,
  editorKey,
  onChange,
  onUploadImage,
  onSecondary,
  onSubmit,
  submitting = false,
  maxLength = 50000,
  title = 'Write a comment',
  subtitle,
  placeholder = 'Write a comment…',
  secondaryLabel = 'Clear',
  submitLabel = 'Post',
  submittingLabel = 'Posting…',
  showHeaderIcon = true,
  stopPropagation = false,
}) {
  const theme = useTheme();
  const allowImages = Boolean(onUploadImage);
  const resolvedSubtitle =
    subtitle ??
    (allowImages
      ? 'Formatting, links, and images supported'
      : 'Formatting and links supported');
  const charCount = value?.length ?? 0;
  const overLimit = charCount > maxLength;
  const isEmpty = isEffectivelyEmptyHtml(value);
  const disabled = submitting || isEmpty || overLimit;

  const shell = (
    <Box sx={commentComposerShellSx(theme)}>
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        sx={{ mb: 1.5, display: { xs: 'none', sm: 'flex' } }}
      >
        {showHeaderIcon ? (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
            }}
          >
            <Iconify icon="solar:pen-new-square-bold" width={20} />
          </Box>
        ) : null}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {title}
          </Typography>
          {resolvedSubtitle ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {resolvedSubtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>

      <Box sx={{ mb: 1.5, display: { xs: 'block', sm: 'none' } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {resolvedSubtitle ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25, display: 'block' }}>
            {resolvedSubtitle}
          </Typography>
        ) : null}
      </Box>

      <Box
        sx={{
          width: '100%',
          maxWidth: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          boxShadow: `0 4px 16px ${alpha(theme.palette.grey[500], 0.08)}`,
          transition: theme.transitions.create(['border-color', 'box-shadow'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:focus-within': {
            borderColor: alpha(theme.palette.primary.main, 0.45),
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}`,
          },
        }}
      >
        <Editor
          key={editorKey}
          value={value}
          onChange={onChange}
          onUploadImage={onUploadImage}
          hideImage={!allowImages}
          fullItem={false}
          placeholder={placeholder}
          sx={commentComposerEditorSx(theme)}
        />
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mt: 1.5 }}
      >
        <Typography
          variant="caption"
          sx={{
            color: overLimit ? 'error.main' : 'text.secondary',
            fontWeight: overLimit ? 600 : 400,
          }}
        >
          {charCount}/{maxLength} characters
        </Typography>
        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1}
          justifyContent="flex-end"
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          <Button
            fullWidth
            variant="soft"
            color="inherit"
            size="small"
            onClick={(e) => {
              if (stopPropagation) {
                e.preventDefault();
                e.stopPropagation();
              }
              onSecondary?.(e);
            }}
            disabled={submitting}
            startIcon={
              secondaryLabel === 'Cancel' ? null : <Iconify icon="solar:eraser-bold" width={18} />
            }
            sx={{
              display: { xs: 'flex', sm: 'inline-flex' },
              '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inline-flex' } },
            }}
          >
            {secondaryLabel}
          </Button>
          <Button
            fullWidth
            variant="contained"
            size="small"
            onClick={(e) => {
              if (stopPropagation) {
                e.preventDefault();
                e.stopPropagation();
              }
              onSubmit?.(e);
            }}
            disabled={disabled}
            startIcon={
              submitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Iconify icon="solar:plain-2-bold" width={18} />
              )
            }
            sx={{
              px: 2.5,
              display: { xs: 'flex', sm: 'inline-flex' },
              boxShadow: disabled ? 'none' : `0 6px 16px ${alpha(theme.palette.primary.main, 0.28)}`,
              '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inline-flex' } },
            }}
          >
            {submitting ? submittingLabel : submitLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );

  if (!stopPropagation) {
    return shell;
  }

  return (
    <Box onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      {shell}
    </Box>
  );
}
