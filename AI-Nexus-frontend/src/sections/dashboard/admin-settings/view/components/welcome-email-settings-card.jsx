import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from 'src/components/snackbar';
import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';
import { appSettingsService } from 'src/services/app-settings.service';

const EMPTY_CONTENT = {
  subject: '',
  heading: '',
  intro: '',
  bodyText: '',
  showAccountDetails: false,
  accountDetailsTitle: 'Account details',
  accountDetailsHtml: '',
  showCta: false,
  ctaLabel: '',
  ctaUrl: '',
  ctaAlign: 'center',
  note: '',
  footer: '',
};

const EDITOR_WRAP_SX = {
  minHeight: 140,
  borderRadius: 1.5,
  border: (theme) => `1px solid ${theme.palette.divider}`,
  bgcolor: 'background.paper',
};

function RichField({ label, hint, value, onChange, disabled, minHeight = 140 }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
        {label}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {hint}
        </Typography>
      ) : null}
      <Editor
        value={value || ''}
        onChange={onChange}
        editable={!disabled}
        hideImage
        placeholder={`Write ${label.toLowerCase()}...`}
        slotProps={{ wrap: { sx: { ...EDITOR_WRAP_SX, minHeight } } }}
      />
    </Box>
  );
}

function ContentEditor({
  title,
  hint,
  value,
  onChange,
  disabled,
  onPreview,
  onResetDefaults,
  previewLoading,
}) {
  return (
    <Box
      sx={(theme) => ({
        p: 2.5,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
      })}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        justifyContent="space-between"
        sx={{ mb: 2.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {hint ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {hint}
            </Typography>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1} flexShrink={0}>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<Iconify icon="solar:restart-bold" width={16} />}
            disabled={disabled || previewLoading}
            onClick={onResetDefaults}
          >
            Reset default
          </Button>
          <LoadingButton
            size="small"
            variant="outlined"
            loading={previewLoading}
            disabled={disabled}
            startIcon={<Iconify icon="solar:eye-bold" width={16} />}
            onClick={onPreview}
          >
            View
          </LoadingButton>
        </Stack>
      </Stack>

      <Stack spacing={2.5}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="Subject"
              value={value?.subject || ''}
              disabled={disabled}
              onChange={(e) => onChange('subject', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="Heading"
              value={value?.heading || ''}
              disabled={disabled}
              onChange={(e) => onChange('heading', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="Footer"
              value={value?.footer || ''}
              disabled={disabled}
              onChange={(e) => onChange('footer', e.target.value)}
            />
          </Grid>
        </Grid>

        <RichField
          label="Intro"
          hint="Main message under the greeting."
          value={value?.intro}
          disabled={disabled}
          minHeight={160}
          onChange={(next) => onChange('intro', next)}
        />

        <RichField
          label="Body text (optional)"
          hint="Extra paragraph under the intro. Leave empty to skip."
          value={value?.bodyText}
          disabled={disabled}
          minHeight={140}
          onChange={(next) => onChange('bodyText', next)}
        />

        <Box
          sx={(theme) => ({
            p: 2,
            borderRadius: 1.5,
            border: `1px solid ${theme.palette.divider}`,
          })}
        >
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value?.showAccountDetails)}
                disabled={disabled}
                onChange={(e) => onChange('showAccountDetails', e.target.checked)}
              />
            }
            label={
              <Stack spacing={0.25}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Show account details box
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Optional card like the email preview (title + editable content)
                </Typography>
              </Stack>
            }
            sx={{ m: 0, alignItems: 'flex-start' }}
          />

          {value?.showAccountDetails ? (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Account details title"
                value={value?.accountDetailsTitle || ''}
                disabled={disabled}
                onChange={(e) => onChange('accountDetailsTitle', e.target.value)}
              />
              <RichField
                label="Account details content"
                hint="Fully editable. Use {{email}} and {{companyName}} placeholders."
                value={value?.accountDetailsHtml}
                disabled={disabled}
                minHeight={180}
                onChange={(next) => onChange('accountDetailsHtml', next)}
              />
            </Stack>
          ) : null}
        </Box>

        <Box
          sx={(theme) => ({
            p: 2,
            borderRadius: 1.5,
            border: `1px solid ${theme.palette.divider}`,
          })}
        >
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value?.showCta)}
                disabled={disabled}
                onChange={(e) => onChange('showCta', e.target.checked)}
              />
            }
            label={
              <Stack spacing={0.25}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Show button
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Optional CTA button with custom label, link, and alignment
                </Typography>
              </Stack>
            }
            sx={{ m: 0, alignItems: 'flex-start' }}
          />

          {value?.showCta ? (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Button label"
                    value={value?.ctaLabel || ''}
                    disabled={disabled}
                    placeholder="e.g. Sign In to AI Nexus"
                    onChange={(e) => onChange('ctaLabel', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Button link"
                    value={value?.ctaUrl || ''}
                    disabled={disabled}
                    placeholder="/auth/sign-in or https://..."
                    onChange={(e) => onChange('ctaUrl', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Button alignment
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    color="primary"
                    value={value?.ctaAlign || 'center'}
                    disabled={disabled}
                    onChange={(_e, next) => {
                      if (next) onChange('ctaAlign', next);
                    }}
                  >
                    <ToggleButton value="left">Left</ToggleButton>
                    <ToggleButton value="center">Center</ToggleButton>
                    <ToggleButton value="right">Right</ToggleButton>
                  </ToggleButtonGroup>
                </Grid>
              </Grid>
            </Stack>
          ) : null}
        </Box>

        <RichField
          label="Help note (optional)"
          hint="Highlighted help box near the bottom. Leave empty to hide."
          value={value?.note}
          disabled={disabled}
          minHeight={120}
          onChange={(next) => onChange('note', next)}
        />
      </Stack>
    </Box>
  );
}

export function WelcomeEmailSettingsCard() {
  const [loading, setLoading] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [previewLoadingType, setPreviewLoadingType] = useState(null);
  const [userWelcomeEmailEnabled, setUserWelcomeEmailEnabled] = useState(true);
  const [corporateWelcomeEmailEnabled, setCorporateWelcomeEmailEnabled] = useState(true);
  const [userContent, setUserContent] = useState(EMPTY_CONTENT);
  const [corporateContent, setCorporateContent] = useState(EMPTY_CONTENT);
  const [defaults, setDefaults] = useState({
    userWelcomeEmailContent: EMPTY_CONTENT,
    corporateWelcomeEmailContent: EMPTY_CONTENT,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewTitle, setPreviewTitle] = useState('Email preview');

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await appSettingsService.getWelcomeEmailSettings();
      setUserWelcomeEmailEnabled(Boolean(data.userWelcomeEmailEnabled));
      setCorporateWelcomeEmailEnabled(Boolean(data.corporateWelcomeEmailEnabled));
      setUserContent(data.userWelcomeEmailContent || EMPTY_CONTENT);
      setCorporateContent(data.corporateWelcomeEmailContent || EMPTY_CONTENT);
      setDefaults({
        userWelcomeEmailContent: data.defaults?.userWelcomeEmailContent || EMPTY_CONTENT,
        corporateWelcomeEmailContent:
          data.defaults?.corporateWelcomeEmailContent || EMPTY_CONTENT,
      });
    } catch (error) {
      toast.error(error?.message || 'Failed to load welcome email settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggle = useCallback(
    async (field, nextValue) => {
      const previous = {
        userWelcomeEmailEnabled,
        corporateWelcomeEmailEnabled,
      };
      const payload =
        field === 'userWelcomeEmailEnabled'
          ? { userWelcomeEmailEnabled: nextValue }
          : { corporateWelcomeEmailEnabled: nextValue };

      if (field === 'userWelcomeEmailEnabled') setUserWelcomeEmailEnabled(nextValue);
      else setCorporateWelcomeEmailEnabled(nextValue);

      setSavingToggle(true);
      try {
        const data = await appSettingsService.updateWelcomeEmailSettings(payload);
        setUserWelcomeEmailEnabled(Boolean(data.userWelcomeEmailEnabled));
        setCorporateWelcomeEmailEnabled(Boolean(data.corporateWelcomeEmailEnabled));
        toast.success(
          field === 'userWelcomeEmailEnabled'
            ? nextValue
              ? 'Learner welcome emails are enabled'
              : 'Learner welcome emails are disabled'
            : nextValue
              ? 'Corporate welcome emails are enabled'
              : 'Corporate welcome emails are disabled'
        );
      } catch (error) {
        setUserWelcomeEmailEnabled(previous.userWelcomeEmailEnabled);
        setCorporateWelcomeEmailEnabled(previous.corporateWelcomeEmailEnabled);
        toast.error(error?.message || 'Failed to update welcome email settings');
      } finally {
        setSavingToggle(false);
      }
    },
    [corporateWelcomeEmailEnabled, userWelcomeEmailEnabled]
  );

  const handleSaveContent = useCallback(async () => {
    setSavingContent(true);
    try {
      const data = await appSettingsService.updateWelcomeEmailSettings({
        userWelcomeEmailContent: userContent,
        corporateWelcomeEmailContent: corporateContent,
      });
      setUserContent(data.userWelcomeEmailContent || EMPTY_CONTENT);
      setCorporateContent(data.corporateWelcomeEmailContent || EMPTY_CONTENT);
      toast.success('Welcome email content saved');
    } catch (error) {
      toast.error(error?.message || 'Failed to save welcome email content');
    } finally {
      setSavingContent(false);
    }
  }, [corporateContent, userContent]);

  const handlePreview = useCallback(
    async (type) => {
      setPreviewLoadingType(type);
      try {
        const content = type === 'corporate' ? corporateContent : userContent;
        const data = await appSettingsService.previewWelcomeEmail({ type, content });
        setPreviewTitle(
          type === 'corporate' ? 'Corporate welcome preview' : 'Learner welcome preview'
        );
        setPreviewSubject(data.subject || '');
        setPreviewHtml(data.html || '');
        setPreviewOpen(true);
      } catch (error) {
        toast.error(error?.message || 'Failed to load email preview');
      } finally {
        setPreviewLoadingType(null);
      }
    },
    [corporateContent, userContent]
  );

  const handleResetDefaults = useCallback(
    (type) => {
      if (type === 'corporate') {
        setCorporateContent({
          ...(defaults.corporateWelcomeEmailContent || EMPTY_CONTENT),
        });
      } else {
        setUserContent({
          ...(defaults.userWelcomeEmailContent || EMPTY_CONTENT),
        });
      }
      toast.success(
        type === 'corporate'
          ? 'Corporate email reset to default (save to apply)'
          : 'Learner email reset to default (save to apply)'
      );
    },
    [defaults]
  );

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6">Welcome emails</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Enable/disable welcome emails and edit copy with the rich text editor. Placeholders:{' '}
            <code>{'{{name}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{companyName}}'}</code>{' '}
            (corporate). Use <strong>View</strong> to preview.
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              divider={
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                />
              }
            >
              <FormControlLabel
                control={
                  <Switch
                    color="primary"
                    checked={userWelcomeEmailEnabled}
                    disabled={savingToggle || savingContent}
                    onChange={(e) => handleToggle('userWelcomeEmailEnabled', e.target.checked)}
                  />
                }
                label={
                  <Stack spacing={0.25} sx={{ pr: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Learner registration welcome
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {userWelcomeEmailEnabled ? 'Email will be sent' : 'Email will not be sent'}
                    </Typography>
                  </Stack>
                }
                sx={{ m: 0, mr: { sm: 1 } }}
              />
              <FormControlLabel
                control={
                  <Switch
                    color="primary"
                    checked={corporateWelcomeEmailEnabled}
                    disabled={savingToggle || savingContent}
                    onChange={(e) =>
                      handleToggle('corporateWelcomeEmailEnabled', e.target.checked)
                    }
                  />
                }
                label={
                  <Stack spacing={0.25} sx={{ pr: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Corporate registration welcome
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {corporateWelcomeEmailEnabled
                        ? 'Email will be sent'
                        : 'Email will not be sent'}
                    </Typography>
                  </Stack>
                }
                sx={{ m: 0 }}
              />
            </Stack>

            <ContentEditor
              title="Learner email content"
              hint="Default copy is loaded. Edit with the toolbar, preview with View, or reset."
              value={userContent}
              disabled={savingContent}
              previewLoading={previewLoadingType === 'user'}
              onChange={(key, next) => setUserContent((prev) => ({ ...prev, [key]: next }))}
              onPreview={() => handlePreview('user')}
              onResetDefaults={() => handleResetDefaults('user')}
            />

            <ContentEditor
              title="Corporate email content"
              hint="Use {{companyName}} in intro/body where needed."
              value={corporateContent}
              disabled={savingContent}
              previewLoading={previewLoadingType === 'corporate'}
              onChange={(key, next) => setCorporateContent((prev) => ({ ...prev, [key]: next }))}
              onPreview={() => handlePreview('corporate')}
              onResetDefaults={() => handleResetDefaults('corporate')}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <LoadingButton
                variant="contained"
                loading={savingContent}
                disabled={savingToggle}
                onClick={handleSaveContent}
              >
                Save email content
              </LoadingButton>
            </Box>
          </>
        )}
      </Stack>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>{previewTitle}</DialogTitle>
        <DialogContent dividers sx={{ p: 0, bgcolor: 'grey.100' }}>
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              borderBottom: (t) => `1px solid ${t.palette.divider}`,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Subject
            </Typography>
            <Typography variant="subtitle2">{previewSubject || '—'}</Typography>
          </Box>
          <Box
            component="iframe"
            title="Welcome email preview"
            srcDoc={previewHtml}
            sx={{
              display: 'block',
              width: 1,
              height: 'calc(90vh - 160px)',
              border: 0,
              bgcolor: 'common.white',
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
