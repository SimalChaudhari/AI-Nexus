import { useEffect } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { useLearningProfileEditor, LearningProfileEditorFields } from './learning-profile-editor';

// ----------------------------------------------------------------------

export function LearningProfileSetupDialog({ open, user, onSaved }) {
  const theme = useTheme();
  const editor = useLearningProfileEditor(user, open, true);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.dispatchEvent(
      new CustomEvent('chatbot-visibility-change', {
        detail: { hidden: Boolean(open), source: 'learning-profile-dialog' },
      })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent('chatbot-visibility-change', {
          detail: { hidden: false, source: 'learning-profile-dialog' },
        })
      );
    };
  }, [open]);

  const handleSaveClick = async () => {
    const updated = await editor.handleSave();
    if (updated) onSaved?.(updated);
  };

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown
      scroll="paper"
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          // Block dismiss during onboarding
        }
      }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
      slotProps={{
        backdrop: { sx: { backdropFilter: 'blur(6px)' } },
      }}
      PaperProps={{
        elevation: 0,
        sx: {
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: 'min(92dvh, 900px)',
          width: { xs: 'calc(100% - 24px)', sm: '100%' },
          mx: { xs: 'auto', sm: 'auto' },
          my: { xs: 'max(12px, env(safe-area-inset-top))', sm: 3 },
          borderRadius: 2.5,
          border: (t) => `1px solid ${t.palette.divider}`,
          boxShadow: (t) => t.customShadows?.z24 || t.shadows[12],
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          flexShrink: 0,
          px: { xs: 1.75, sm: 2.25 },
          pt: { xs: 1.35, sm: 2 },
          pb: { xs: 1, sm: 1.5 },
          background: (t) =>
            `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 48%, ${alpha(t.palette.primary.main, 0.92)} 100%)`,
          color: 'primary.contrastText',
          borderTopLeftRadius: (t) => Number(t.shape.borderRadius) * 2.5 - 1,
          borderTopRightRadius: (t) => Number(t.shape.borderRadius) * 2.5 - 1,
        }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={{ xs: 1.25, sm: 1.5 }} sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.common.white, 0.16),
              border: `1px solid ${alpha(theme.palette.common.white, 0.28)}`,
            }}
          >
            <Iconify icon="solar:user-rounded-bold" width={22} sx={{ transform: { xs: 'scale(0.85)', sm: 'none' } }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                opacity: 0.85,
                letterSpacing: { xs: 0.5, sm: 0.8 },
                fontWeight: 700,
                fontSize: { xs: '0.58rem', sm: '0.65rem' },
              }}
            >
              Learning profile
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                lineHeight: 1.25,
                mb: 0.25,
                fontSize: { xs: '0.92rem', sm: undefined },
              }}
            >
              Personalize your learning
            </Typography>
            <Typography
              variant="caption"
              sx={{
                opacity: 0.9,
                display: 'block',
                lineHeight: 1.4,
                fontSize: { xs: '0.68rem', sm: undefined },
              }}
            >
              One-time setup for better course picks.
            </Typography>
          </Box>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={editor.progress}
          sx={{
            mt: { xs: 1, sm: 1.5 },
            height: { xs: 3, sm: 3 },
            borderRadius: 99,
            bgcolor: alpha(theme.palette.common.white, 0.2),
            '& .MuiLinearProgress-bar': {
              borderRadius: 99,
              bgcolor: 'common.white',
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 0.35, opacity: 0.85, fontSize: { xs: '0.62rem', sm: '0.7rem' } }}
        >
          {editor.filledSteps}/4 complete
        </Typography>
      </Box>

      <DialogContent
        dividers
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          py: { xs: 1.5, sm: 1.5 },
          px: { xs: 2, sm: 2.25 },
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <LearningProfileEditorFields {...editor} />
      </DialogContent>

      <DialogActions
        sx={{
          flexShrink: 0,
          px: { xs: 2, sm: 2.25 },
          py: { xs: 1.5, sm: 1.5 },
          pb: { xs: `max(12px, env(safe-area-inset-bottom))`, sm: 1.5 },
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 1.25, sm: 1 },
          bgcolor: (t) => alpha(t.palette.grey[500], t.palette.mode === 'dark' ? 0.12 : 0.06),
          borderTop: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="flex-start"
          flexWrap="wrap"
          useFlexGap
          sx={{ minWidth: 0, justifyContent: { xs: 'center', sm: 'flex-start' }, textAlign: { xs: 'center', sm: 'left' } }}
        >
          <Iconify
            icon="solar:shield-check-bold"
            width={16}
            sx={{ color: 'success.main', flexShrink: 0, mt: 0.1, transform: { xs: 'scale(0.95)', sm: 'none' } }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: { xs: '0.62rem', sm: '0.7rem' }, lineHeight: 1.35 }}>
            Required · saved on your profile
          </Typography>
        </Stack>
        <LoadingButton
          variant="contained"
          size="medium"
          onClick={handleSaveClick}
          loading={editor.submitting}
          disabled={!editor.isValid}
          fullWidth={editor.isMobile}
          sx={{
            minWidth: { sm: 160 },
            minHeight: { xs: 40, sm: 36 },
            fontWeight: 700,
            fontSize: { xs: '0.8rem', sm: undefined },
            px: { xs: 2, sm: 2.5 },
            boxShadow: (t) => `0 6px 18px ${alpha(t.palette.primary.main, 0.3)}`,
          }}
        >
          Save & continue
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
