import { useCallback, useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useAuthContext } from 'src/auth/hooks';

import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import { MainContent } from 'src/layouts/main';
import { toast } from 'src/components/snackbar';

import {
  isLearningProfileIncomplete,
  useLearningProfileEditor,
  LearningProfileEditorFields,
} from 'src/sections/learning/components/learning-profile-editor';
import { LearningProfileSetupDialog } from 'src/sections/learning/components/learning-profile-setup-dialog';

// ----------------------------------------------------------------------

function formatListPreview(items) {
  if (!Array.isArray(items) || items.length === 0) return '—';
  if (items.length <= 2) return items.join(', ');
  return `${items.slice(0, 2).join(', ')} +${items.length - 2}`;
}

/** First visit: same mandatory modal as Learning (cannot dismiss until saved). */
function PersonaFirstTimeDialog({ user, isAdmin, checkUserSession }) {
  const ContentWrapper = isAdmin ? DashboardContent : MainContent;

  return (
    <ContentWrapper maxWidth={false} sx={{ width: 1, maxWidth: 'none' }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
          Set up your persona
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
          Complete the steps in the dialog below — same experience as when you open Learning for the first time. After
          you save, you can edit anytime on the full Persona page.
        </Typography>
      </Box>
      <LearningProfileSetupDialog
        open
        user={user}
        onSaved={async () => {
          if (checkUserSession) {
            await checkUserSession();
          }
          toast.success('Learning profile saved.');
        }}
      />
    </ContentWrapper>
  );
}

/** Returning users: full-page professional editor (no modal). */
function PersonaFullPageEditor({ user, isAdmin, checkUserSession }) {
  const theme = useTheme();
  const ContentWrapper = isAdmin ? DashboardContent : MainContent;
  const editor = useLearningProfileEditor(user, Boolean(user), false);

  const handleSave = useCallback(async () => {
    const updated = await editor.handleSave();
    if (!updated) {
      toast.error('Please complete all fields before saving.');
      return;
    }
    if (checkUserSession) {
      await checkUserSession();
    }
    toast.success('Learning profile saved.');
  }, [checkUserSession, editor]);

  const savedSummary = useMemo(() => {
    if (!user) return null;
    return {
      experience: user.aiExperienceLevel || '—',
      goals: formatListPreview(user.aiLearningGoals),
      areas: formatListPreview(user.aiUseAreas),
      persona: user.financeRole || user.persona || '—',
    };
  }, [user]);

  return (
    <ContentWrapper maxWidth={false} sx={{ width: 1, maxWidth: 'none' }}>
      <Stack spacing={3} sx={{ width: 1, mt: { xs: 1.5, sm: 2, md: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          justifyContent="space-between"
        >
          <Box sx={{ flex: '1 1 auto', minWidth: 0, pr: { sm: 2 } }}>
            <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Persona & learning profile
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 900 }}>
              Manage your finance role (persona), AI experience, goals, and use areas. Saved values drive course
              recommendations.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            href={paths.profile.root}
            variant="outlined"
            color="inherit"
            size="medium"
            startIcon={<Iconify icon="solar:arrow-left-linear" width={20} />}
            sx={{
              flexShrink: 0,
              fontWeight: 600,
              alignSelf: { xs: 'flex-end', sm: 'flex-start' },
              whiteSpace: 'nowrap',
            }}
          >
            Back to profile
          </Button>
        </Stack>
        <Card
          sx={{
            overflow: 'hidden',
            border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.12)}`,
            boxShadow: (t) =>
              t.palette.mode === 'dark'
                ? `0 12px 40px ${alpha(theme.palette.common.black, 0.35)}`
                : `0 12px 40px ${alpha(theme.palette.grey[500], 0.12)}`,
          }}
        >
          <Box
            sx={{
              px: { xs: 2.25, sm: 3 },
              py: { xs: 2.5, sm: 3 },
              background: (t) =>
                `linear-gradient(125deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 42%, ${alpha(t.palette.primary.main, 0.88)} 100%)`,
              color: 'primary.contrastText',
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'flex-start' }} justifyContent="space-between">
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.75}
                alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                sx={{ minWidth: 0, width: { xs: 1, sm: 'auto' } }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    bgcolor: alpha(theme.palette.common.white, 0.18),
                    border: `1px solid ${alpha(theme.palette.common.white, 0.28)}`,
                  }}
                >
                  <Iconify icon="solar:user-speak-rounded-bold-duotone" width={28} />
                </Box>
                <Box sx={{ minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
                  <Typography variant="overline" sx={{ opacity: 0.9, fontWeight: 700, letterSpacing: 1 }}>
                    Account
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.25, mt: 0.25 }}>
                    Learning persona & preferences
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.92, mt: 1, lineHeight: 1.55, maxWidth: 'none' }}>
                    Set your finance role (persona), experience level, goals, and where you use AI. Recommendations and
                    course ordering update after you save — edit anytime on this page.
                  </Typography>
                </Box>
              </Stack>
              <Box sx={{ width: { xs: 1, sm: 200 }, flexShrink: 0 }}>
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                      Profile strength
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      {editor.filledSteps}/4
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={editor.progress}
                    sx={{
                      height: 8,
                      borderRadius: 99,
                      bgcolor: alpha(theme.palette.common.white, 0.22),
                      '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: 'common.white' },
                    }}
                  />
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 2.25, sm: 3 }, py: { xs: 2, sm: 2.5 }, bgcolor: 'background.neutral' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
              Saved on your account
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ columnGap: 1, rowGap: 1 }}>
              <Chip size="small" variant="outlined" label={`Experience: ${savedSummary.experience}`} sx={{ fontWeight: 600 }} />
              <Chip
                size="small"
                variant="outlined"
                label={`Goals: ${savedSummary.goals}`}
                title={String(savedSummary.goals)}
                sx={{ fontWeight: 600, maxWidth: { xs: '100%' } }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Areas: ${savedSummary.areas}`}
                title={String(savedSummary.areas)}
                sx={{ fontWeight: 600, maxWidth: { xs: '100%' } }}
              />
              <Chip size="small" color="primary" variant="soft" label={`Persona: ${savedSummary.persona}`} sx={{ fontWeight: 700 }} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, lineHeight: 1.5 }}>
              Values below reflect your latest save. After editing, click <strong>Save changes</strong> to update.
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ px: { xs: 2.25, sm: 3 }, py: { xs: 2.5, sm: 3 }, bgcolor: 'background.paper' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Edit profile
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 'none' }}>
              All fields are required. Your selections power personalized course recommendations.
            </Typography>

            <LearningProfileEditorFields {...editor} />
          </Box>

          <Box
            sx={{
              px: { xs: 2.25, sm: 3 },
              py: { xs: 2, sm: 2.25 },
              bgcolor: (t) => alpha(t.palette.grey[500], t.palette.mode === 'dark' ? 0.12 : 0.06),
              borderTop: (t) => `1px solid ${t.palette.divider}`,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="flex-end">
              <LoadingButton
                variant="contained"
                size="large"
                onClick={handleSave}
                loading={editor.submitting}
                disabled={!editor.isValid}
                startIcon={<Iconify icon="solar:diskette-bold" width={20} />}
                sx={{
                  minWidth: { sm: 200 },
                  fontWeight: 700,
                  boxShadow: (t) => `0 8px 24px ${alpha(t.palette.primary.main, 0.35)}`,
                }}
              >
                Save changes
              </LoadingButton>
            </Stack>
          </Box>
        </Card>
      </Stack>
    </ContentWrapper>
  );
}

// ----------------------------------------------------------------------

export function PersonaSettingsView() {
  const { user, loading, checkUserSession, authenticated } = useAuthContext();

  if (loading || !authenticated || !user) {
    return <LoadingScreen />;
  }

  const normalizedRole = String(user.role || 'User').toLowerCase();
  const isAdmin = normalizedRole === 'admin';

  if (isLearningProfileIncomplete(user)) {
    return <PersonaFirstTimeDialog user={user} isAdmin={isAdmin} checkUserSession={checkUserSession} />;
  }

  return <PersonaFullPageEditor user={user} isAdmin={isAdmin} checkUserSession={checkUserSession} />;
}
