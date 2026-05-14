import { useCallback, useEffect, useMemo, useState } from 'react';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
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

// ----------------------------------------------------------------------

/** True when the user still needs mandatory learning-profile onboarding (Learning + Persona routes). */
export function isLearningProfileIncomplete(user) {
  if (!user) return true;
  const missingExperience = !String(user.aiExperienceLevel || '').trim();
  const missingGoals = !Array.isArray(user.aiLearningGoals) || user.aiLearningGoals.length === 0;
  const missingAreas = !Array.isArray(user.aiUseAreas) || user.aiUseAreas.length === 0;
  const missingRole = !String(user.financeRole || user.persona || '').trim();
  return missingExperience || missingGoals || missingAreas || missingRole;
}

// ----------------------------------------------------------------------

const getAutocompleteSlotProps = (isNarrow, placement = 'bottom-start', zIndexBoost = false) => ({
  popper: {
    placement,
    sx: (theme) => ({
      zIndex: zIndexBoost ? theme.zIndex.modal + 2 : theme.zIndex.modal,
    }),
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
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 2,
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
              lineHeight: 1.45,
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

// ----------------------------------------------------------------------

/**
 * Shared state + save for learning profile / persona (used by onboarding dialog and full persona page).
 * @param {boolean} syncWhen When false, form is not reset from `user` (e.g. dialog closed).
 * @param {boolean} autocompleteZIndexBoost Raise popper z-index (dialog stacking).
 */
export function useLearningProfileEditor(user, syncWhen, autocompleteZIndexBoost = false) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const autocompleteSlots = useMemo(
    () => getAutocompleteSlotProps(isMobile, 'bottom-start', autocompleteZIndexBoost),
    [isMobile, autocompleteZIndexBoost]
  );
  const roleAutocompleteSlots = useMemo(
    () => getAutocompleteSlotProps(isMobile, isMobile ? 'top-start' : 'bottom-start', autocompleteZIndexBoost),
    [isMobile, autocompleteZIndexBoost]
  );
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

  const getMobileNoSearchInputProps = useCallback(
    (params) => ({
      ...params,
      inputProps: {
        ...params.inputProps,
        readOnly: isMobile,
      },
    }),
    [isMobile]
  );

  const handleSave = useCallback(async () => {
    if (
      !experienceLevel ||
      !Array.isArray(learningGoals) ||
      learningGoals.length === 0 ||
      !Array.isArray(useAreas) ||
      useAreas.length === 0 ||
      !financeRole
    ) {
      return null;
    }
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
      return updated;
    } finally {
      setSubmitting(false);
    }
  }, [experienceLevel, learningGoals, useAreas, financeRole]);

  useEffect(() => {
    if (!syncWhen || !user) return;
    setExperienceLevel(user?.aiExperienceLevel || '');
    setLearningGoals(Array.isArray(user?.aiLearningGoals) ? [...user.aiLearningGoals] : []);
    setUseAreas(Array.isArray(user?.aiUseAreas) ? [...user.aiUseAreas] : []);
    setFinanceRole(user?.financeRole || user?.persona || '');
  }, [
    syncWhen,
    user?.id,
    user?.aiExperienceLevel,
    user?.aiLearningGoals,
    user?.aiUseAreas,
    user?.financeRole,
    user?.persona,
  ]);

  return {
    isMobile,
    experienceLevel,
    setExperienceLevel,
    learningGoals,
    setLearningGoals,
    useAreas,
    setUseAreas,
    financeRole,
    setFinanceRole,
    isValid,
    filledSteps,
    progress,
    submitting,
    handleSave,
    autocompleteSlots,
    roleAutocompleteSlots,
    autocompleteListboxProps,
    getMobileNoSearchInputProps,
  };
}

// ----------------------------------------------------------------------

export function LearningProfileEditorFields({
  experienceLevel,
  setExperienceLevel,
  learningGoals,
  setLearningGoals,
  useAreas,
  setUseAreas,
  financeRole,
  setFinanceRole,
  autocompleteSlots,
  roleAutocompleteSlots,
  autocompleteListboxProps,
  getMobileNoSearchInputProps,
}) {
  return (
    <Stack spacing={{ xs: 1.5, sm: 1.5 }}>
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
            <TextField
              {...getMobileNoSearchInputProps(params)}
              placeholder="Select your level"
              size="small"
              sx={textFieldMobileDenseSx}
            />
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
            <TextField
              {...getMobileNoSearchInputProps(params)}
              placeholder="Select goals"
              size="small"
              sx={textFieldMobileDenseSx}
            />
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
            <TextField {...getMobileNoSearchInputProps(params)} placeholder="Select areas" size="small" />
          )}
        />
      </FieldCard>

      <FieldCard
        step="4"
        icon="solar:case-minimalistic-bold"
        title="Your finance role (persona)"
        helper="Drives admin-mapped course recommendations on Learning."
      >
        <Autocomplete
          disablePortal
          options={FINANCE_ROLE_OPTIONS}
          value={financeRole || null}
          onChange={(_, value) => setFinanceRole(value || '')}
          slotProps={roleAutocompleteSlots}
          ListboxProps={autocompleteListboxProps}
          renderInput={(params) => (
            <TextField
              {...getMobileNoSearchInputProps(params)}
              placeholder="Select role"
              size="small"
              sx={textFieldMobileDenseSx}
            />
          )}
        />
      </FieldCard>
    </Stack>
  );
}
