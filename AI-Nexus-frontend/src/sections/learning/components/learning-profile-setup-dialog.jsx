import { useMemo, useState } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { Iconify } from 'src/components/iconify';
import { userService } from 'src/services/user.service';
import {
  AI_EXPERIENCE_OPTIONS,
  LEARNING_GOAL_OPTIONS,
  AI_USE_AREA_OPTIONS,
  FINANCE_ROLE_OPTIONS,
} from 'src/constants/learning-profile-options';

const getAutocompleteSlotProps = (isNarrow) => ({
  popper: {
    placement: 'bottom-start',
    sx: (theme) => ({ zIndex: theme.zIndex.modal + 2 }),
  },
  paper: {
    sx: { maxHeight: isNarrow ? 'min(52vh, 300px)' : 320 },
  },
});

const getAutocompleteListboxProps = (isNarrow) => ({
  sx: {
    maxHeight: isNarrow ? 'min(46vh, 240px)' : 180,
    py: 0.5,
    WebkitOverflowScrolling: 'touch',
    ...(isNarrow
      ? {
          '& .MuiAutocomplete-option': {
            fontSize: '0.8125rem',
            minHeight: 40,
            py: 0.75,
          },
        }
      : {}),
  },
});

const textFieldMobileDenseSx = {
  '& .MuiInputBase-root': {
    fontSize: { xs: '0.8125rem', sm: '0.875rem' },
    minHeight: { xs: 40, sm: 40 },
  },
  '& .MuiInputBase-input': { py: { xs: '8.5px', sm: undefined } },
  '& .MuiInputLabel-root': { fontSize: { xs: '0.75rem', sm: undefined } },
};

function FieldCard({ step, icon, title, helper, children }) {
  const theme = useTheme();
  const isNarrowChip = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Box
      sx={{
        p: { xs: 1.15, sm: 1.25 },
        borderRadius: { xs: 1.5, sm: 1.5 },
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.08 : 0.04),
        transition: theme.transitions.create(['border-color', 'box-shadow'], {
          duration: theme.transitions.duration.shorter,
        }),
        '@media (hover: hover)': {
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.45),
            boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.12)}`,
          },
        },
      }}
    >
      <Stack spacing={{ xs: 0.75, sm: 0.75 }}>
        <Stack direction="row" alignItems="flex-start" spacing={{ xs: 0.75, sm: 1 }} sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: { xs: 26, sm: 28 },
              height: { xs: 26, sm: 28 },
              borderRadius: 1,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, lineHeight: 1, fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
              {step}
            </Typography>
          </Box>
          <Iconify
            icon={icon}
            width={18}
            sx={{
              color: 'text.secondary',
              flexShrink: 0,
              mt: 0.25,
              transform: { xs: 'scale(0.88)', sm: 'none' },
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              gap={{ xs: 0, sm: 0.5 }}
              flexWrap="nowrap"
              sx={{ minWidth: 0 }}
            >
              <Typography
                variant="body2"
                component="div"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.35,
                  fontSize: { xs: '0.78rem', sm: '0.875rem' },
                  flex: '1 1 auto',
                  minWidth: 0,
                }}
              >
                {title}
                {isNarrowChip ? (
                  <Box
                    component="span"
                    title="Required"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 800,
                      display: 'inline',
                      margin: 0,
                      padding: 0,
                      userSelect: 'none',
                    }}
                  >
                    *
                  </Box>
                ) : null}
              </Typography>
              {!isNarrowChip ? (
                <Chip
                  label="Required"
                  title="Required"
                  size="small"
                  color="primary"
                  variant="soft"
                  sx={{
                    height: 22,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    alignSelf: 'center',
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              ) : null}
            </Stack>
          </Box>
        </Stack>
        {helper ? (
          <Typography
            variant="caption"
            component="div"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.4,
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              pl: { xs: 0, sm: 0.25 },
            }}
          >
            {helper}
          </Typography>
        ) : null}
        <Box
          sx={{
            width: '100%',
            minWidth: 0,
            '& .MuiOutlinedInput-root': { borderRadius: { xs: 1.25, sm: 1 } },
            '& .MuiChip-root': { fontSize: { xs: '0.7rem', sm: undefined }, height: { xs: 24, sm: undefined } },
          }}
        >
          {children}
        </Box>
      </Stack>
    </Box>
  );
}

export function LearningProfileSetupDialog({ open, user, onSaved }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const autocompleteSlots = useMemo(() => getAutocompleteSlotProps(isMobile), [isMobile]);
  const autocompleteListboxProps = useMemo(() => getAutocompleteListboxProps(isMobile), [isMobile]);
  const [submitting, setSubmitting] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState(user?.aiExperienceLevel || '');
  const [learningGoals, setLearningGoals] = useState(
    Array.isArray(user?.aiLearningGoals) ? user.aiLearningGoals : []
  );
  const [useAreas, setUseAreas] = useState(Array.isArray(user?.aiUseAreas) ? user.aiUseAreas : []);
  const [financeRole, setFinanceRole] = useState(user?.financeRole || user?.persona || '');

  const isValid = useMemo(
    () =>
      Boolean(experienceLevel) &&
      Array.isArray(learningGoals) &&
      learningGoals.length > 0 &&
      Array.isArray(useAreas) &&
      useAreas.length > 0 &&
      Boolean(financeRole),
    [experienceLevel, learningGoals, useAreas, financeRole]
  );

  const filledSteps = useMemo(() => {
    let n = 0;
    if (experienceLevel) n += 1;
    if (learningGoals.length) n += 1;
    if (useAreas.length) n += 1;
    if (financeRole) n += 1;
    return n;
  }, [experienceLevel, learningGoals.length, useAreas.length, financeRole]);

  const progress = (filledSteps / 4) * 100;

  const handleSave = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      const updated = await userService.updateUserProfile({
        aiExperienceLevel: experienceLevel,
        aiLearningGoals: learningGoals,
        aiUseAreas: useAreas,
        financeRole,
        persona: financeRole,
      });
      if (typeof window !== 'undefined') {
        const rawUser = sessionStorage.getItem('user');
        const parsed = rawUser ? JSON.parse(rawUser) : {};
        sessionStorage.setItem('user', JSON.stringify({ ...parsed, ...updated }));
      }
      onSaved?.(updated);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown
      scroll="paper"
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
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
          value={progress}
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
          {filledSteps}/4 complete
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
        <Stack spacing={{ xs: 1.5, sm: 1.25 }}>
          <FieldCard
            step="1"
            icon="solar:stars-minimalistic-bold"
            title="AI experience level"
            helper="Starting point for content depth."
          >
            <Autocomplete
              disablePortal
              options={AI_EXPERIENCE_OPTIONS}
              value={experienceLevel || null}
              onChange={(_, value) => setExperienceLevel(value || '')}
              slotProps={autocompleteSlots}
              ListboxProps={autocompleteListboxProps}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select your level" size="small" sx={textFieldMobileDenseSx} />
              )}
            />
          </FieldCard>

          <FieldCard
            step="2"
            icon="solar:flag-bold"
            title="Main learning goals"
            helper="Used for smart fallbacks if a role map is missing."
          >
            <Autocomplete
              multiple
              disableCloseOnSelect
              disablePortal
              options={LEARNING_GOAL_OPTIONS}
              value={learningGoals}
              onChange={(_, value) => setLearningGoals(value || [])}
              slotProps={autocompleteSlots}
              ListboxProps={autocompleteListboxProps}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select goals" size="small" sx={textFieldMobileDenseSx} />
              )}
            />
          </FieldCard>

          <FieldCard
            step="3"
            icon="solar:target-bold"
            title="Where you want to use AI"
            helper="Saved on your profile for future personalization."
          >
            <Autocomplete
              multiple
              disableCloseOnSelect
              disablePortal
              options={AI_USE_AREA_OPTIONS}
              value={useAreas}
              onChange={(_, value) => setUseAreas(value || [])}
              slotProps={autocompleteSlots}
              ListboxProps={autocompleteListboxProps}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select areas" size="small" />
              )}
            />
          </FieldCard>

          <FieldCard
            step="4"
            icon="solar:case-minimalistic-bold"
            title="Your finance role"
            helper="Drives admin-mapped recommendations on Learning."
          >
            <Autocomplete
              disablePortal
              options={FINANCE_ROLE_OPTIONS}
              value={financeRole || null}
              onChange={(_, value) => setFinanceRole(value || '')}
              slotProps={autocompleteSlots}
              ListboxProps={autocompleteListboxProps}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select role" size="small" sx={textFieldMobileDenseSx} />
              )}
            />
          </FieldCard>
        </Stack>
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
          <Iconify icon="solar:shield-check-bold" width={16} sx={{ color: 'success.main', flexShrink: 0, mt: 0.1, transform: { xs: 'scale(0.95)', sm: 'none' } }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: { xs: '0.62rem', sm: '0.7rem' }, lineHeight: 1.35 }}>
            Required · saved on your profile
          </Typography>
        </Stack>
        <LoadingButton
          variant="contained"
          size="medium"
          onClick={handleSave}
          loading={submitting}
          disabled={!isValid}
          fullWidth={isMobile}
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
