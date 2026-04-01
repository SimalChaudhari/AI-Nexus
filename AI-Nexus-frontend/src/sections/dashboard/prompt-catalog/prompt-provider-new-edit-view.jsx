import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import DialogTitle from '@mui/material/DialogTitle';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter, useParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Editor } from 'src/components/editor';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { promptCatalogService } from 'src/services/prompt-catalog.service';
import { CategoryIconPicker } from 'src/sections/dashboard/category/category-icon-picker';

const DEFAULT_FORM = {
  provider: 'chatgpt',
  title: '',
  description: '',
  color: '#10a37f',
  bgColor: '#10a37f',
  icon: '',
  detailTitle: '',
  redirectUrl: '',
  isActive: true,
};

const hasEditorText = (html = '') => {
  const value = String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  return Boolean(value);
};

const isGradientColor = (value) => typeof value === 'string' && value.trim().toLowerCase().startsWith('linear-gradient(');

export function PromptProviderNewEditView({ editMode = false }) {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [bgColorDialogOpen, setBgColorDialogOpen] = useState(false);
  const [iconDialogOpen, setIconDialogOpen] = useState(false);

  useEffect(() => {
    if (!editMode || !id) return;
    const load = async () => {
      try {
        setLoading(true);
        const rows = await promptCatalogService.getAdminProviderProfiles();
        const found = rows.find((row) => String(row.id) === String(id));
        if (!found) {
          toast.error('Provider not found');
          router.push(paths.admin.promptCatalog.providers);
          return;
        }
        setForm({
          provider: found.provider || 'chatgpt',
          title: found.title || '',
          description: found.description || '',
          color: found.color || '#10a37f',
          bgColor: found.bgColor || found.color || '#10a37f',
          icon: found.icon || '',
          detailTitle: found.detailTitle || '',
          redirectUrl: found.redirectUrl || '',
          isActive: !!found.isActive,
        });
      } catch (error) {
        toast.error(error?.message || 'Failed to load provider');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [editMode, id, router]);

  const heading = useMemo(() => (editMode ? 'Edit Provider' : 'Create Provider'), [editMode]);
  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  const onSubmit = async () => {
    if (!form.title?.trim() || !hasEditorText(form.description) || !hasEditorText(form.detailTitle)) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        provider: form.provider,
        title: form.title.trim(),
        description: form.description.trim(),
        color: form.color.trim(),
        bgColor: form.bgColor.trim(),
        icon: form.icon.trim(),
        detailTitle: form.detailTitle.trim(),
        redirectUrl: form.redirectUrl?.trim() || null,
        isActive: !!form.isActive,
      };

      if (editMode && id) {
        await promptCatalogService.updateProviderProfile(id, payload);
        toast.success('Provider updated');
      } else {
        await promptCatalogService.createProviderProfile(payload);
        toast.success('Provider created');
      }
      router.push(paths.admin.promptCatalog.providers);
    } catch (error) {
      toast.error(error?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;

  if (editMode && !id) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent title="Provider not found!" />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Resource', href: paths.admin.workflow.list },
          { name: 'Provider', href: paths.admin.promptCatalog.providers },
          { name: editMode ? 'Edit' : 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title={editMode ? 'Edit provider' : 'Create provider'}
              subheader="Configure provider profile content and branding for cards and details."
              sx={{ px: 3, pt: 3, pb: 0 }}
              action={
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                  }}
                >
                  <Iconify icon="solar:stars-bold-duotone" width={28} />
                </Box>
              }
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={2.5} sx={{ p: 3, pt: 0 }}>
              <Alert severity="info" icon={<Iconify icon="solar:pallete-2-bold-duotone" width={22} />}>
                Use clear titles and details. You can set custom <strong>Color</strong> and <strong>Icon</strong> for each provider profile.
              </Alert>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Select
                  size="small"
                  value={form.provider}
                  onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
                  fullWidth
                  disabled={editMode}
                >
                  <MenuItem value="chatgpt">chatgpt</MenuItem>
                  <MenuItem value="gemini">gemini</MenuItem>
                  <MenuItem value="claude">claude</MenuItem>
                </Select>
                <TextField size="small" label="Title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} fullWidth />
              </Stack>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Description
                </Typography>
                <Editor
                  value={form.description || ''}
                  onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
                  placeholder="Write provider description..."
                  fullItem={false}
                />
              </Box>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    Color
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setColorDialogOpen(true)}
                    sx={{ minHeight: 40, justifyContent: 'space-between' }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: 0.75,
                          border: '1px solid',
                          borderColor: 'divider',
                          background: form.color || '#10a37f',
                        }}
                      />
                      <Typography variant="body2">{form.color || '#10a37f'}</Typography>
                    </Stack>
                  </Button>
                </Box>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    BG Color
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setBgColorDialogOpen(true)}
                    sx={{ minHeight: 40, justifyContent: 'space-between' }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: 0.75,
                          border: '1px solid',
                          borderColor: 'divider',
                          background: form.bgColor || '#10a37f',
                        }}
                      />
                      <Typography variant="body2">{form.bgColor || '#10a37f'}</Typography>
                    </Stack>
                  </Button>
                </Box>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    Icon
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setIconDialogOpen(true)}
                    sx={{ minHeight: 40, justifyContent: 'space-between' }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Iconify icon={form.icon || 'solar:chat-round-dots-bold-duotone'} width={20} />
                      <Typography variant="body2">
                        {form.icon || 'solar:chat-round-dots-bold-duotone'}
                      </Typography>
                    </Stack>
                  </Button>
                </Box>
              </Stack>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Detail Title
                </Typography>
                <Editor
                  value={form.detailTitle || ''}
                  onChange={(value) => setForm((prev) => ({ ...prev, detailTitle: value }))}
                  placeholder="Write detail title..."
                  fullItem={false}
                />
              </Box>

              <TextField
                size="small"
                label="Redirect URL (use {prompt} placeholder)"
                placeholder="https://chatgpt.com/?prompt={prompt}"
                value={form.redirectUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, redirectUrl: e.target.value }))}
                fullWidth
              />

            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} md={4}>
          <Card sx={{ ...cardSx, position: { md: 'sticky' }, top: { md: 24 } }}>
            <CardHeader
              title="Visibility"
              subheader="Control whether this provider profile is active and available."
              sx={{ px: 3, pt: 3, pb: 0 }}
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={2.5} sx={{ p: 3, pt: 0 }}>
              <Select
                size="small"
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === 'active' }))}
                fullWidth
              >
                <MenuItem value="active">
                  <Stack spacing={0.25} alignItems="flex-start">
                    <Typography variant="subtitle2">Active</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Visible and usable
                    </Typography>
                  </Stack>
                </MenuItem>
                <MenuItem value="inactive">
                  <Stack spacing={0.25} alignItems="flex-start">
                    <Typography variant="subtitle2">Inactive</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hidden from default lists
                    </Typography>
                  </Stack>
                </MenuItem>
              </Select>

              <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1.5}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  color="inherit"
                  startIcon={<Iconify icon="eva:arrow-back-fill" />}
                  component={RouterLink}
                  href={paths.admin.promptCatalog.providers}
                >
                  Cancel
                </Button>
                <LoadingButton
                  fullWidth
                  loading={saving}
                  variant="contained"
                  size="large"
                  onClick={onSubmit}
                  startIcon={<Iconify icon={editMode ? 'eva:checkmark-fill' : 'solar:add-circle-bold'} />}
                >
                  {editMode ? 'Save changes' : 'Create provider'}
                </LoadingButton>
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={colorDialogOpen} onClose={() => setColorDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Select Color</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              type="color"
              value={isGradientColor(form.color) ? '#10a37f' : form.color}
              onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Color value (normal color)"
              placeholder="e.g. #10a37f or primary.main"
              value={form.color}
              onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColorDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bgColorDialogOpen} onClose={() => setBgColorDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Select BG Color</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              type="color"
              value={isGradientColor(form.bgColor) ? '#10a37f' : form.bgColor}
              onChange={(e) => setForm((prev) => ({ ...prev, bgColor: e.target.value }))}
              fullWidth
            />
            <TextField
              label="BG Color value (hex, palette token, or linear-gradient)"
              placeholder="e.g. #10a37f or linear-gradient(90deg, #10a37f 0%, #0a7a5c 100%)"
              value={form.bgColor}
              onChange={(e) => setForm((prev) => ({ ...prev, bgColor: e.target.value }))}
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  bgColor: 'linear-gradient(90deg, #10a37f 0%, #0a7a5c 100%)',
                }))
              }
            >
              Use gradient preset
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBgColorDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={iconDialogOpen} onClose={() => setIconDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Select Icon</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <CategoryIconPicker value={form.icon} onChange={(icon) => setForm((prev) => ({ ...prev, icon }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIconDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

