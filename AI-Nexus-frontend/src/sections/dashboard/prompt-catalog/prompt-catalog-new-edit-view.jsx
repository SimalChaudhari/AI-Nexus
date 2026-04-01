import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import LoadingButton from '@mui/lab/LoadingButton';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { Editor } from 'src/components/editor';
import { SvgColor } from 'src/components/svg-color';
import { toast } from 'src/components/snackbar';
import { LoadingScreen } from 'src/components/loading-screen';
import { promptCatalogService } from 'src/services/prompt-catalog.service';

const DEFAULT_PROVIDER_OPTIONS = [
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude', label: 'Claude' },
];

const defaultValues = {
  providers: ['chatgpt'],
  category: '',
  sectionTitle: '',
  sectionOrder: 0,
  itemOrder: 0,
  useCase: '',
  prompt: '',
  isActive: true,
};

const hasEditorText = (html = '') => {
  const value = String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  return Boolean(value);
};

export function PromptCatalogNewEditView({ editMode = false }) {
  const { id } = useParams();
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(editMode);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState(defaultValues);
  const [providerOptions, setProviderOptions] = useState(DEFAULT_PROVIDER_OPTIONS);

  useEffect(() => {
    const loadProviderOptions = async () => {
      try {
        const options = await promptCatalogService.getAdminProviderOptions();
        if (options.length) {
          const nextOptions = options.map((p) => ({
            value: p.value,
            label: p.label || p.value,
          }));
          setProviderOptions(
            nextOptions
          );
          setValues((prev) => {
            const validSelected = (prev.providers || []).filter((provider) =>
              nextOptions.some((opt) => opt.value === provider)
            );
            return { ...prev, providers: validSelected };
          });
        }
      } catch {
        // keep default options
      }
    };
    loadProviderOptions();
  }, []);

  useEffect(() => {
    if (!editMode || !id) return;
    const load = async () => {
      try {
        setLoading(true);
        const rows = await promptCatalogService.getAdminRows();
        const row = rows.find((item) => item.id === id);
        if (!row) {
          toast.error('Prompt row not found');
          router.push(paths.admin.promptCatalog.list);
          return;
        }
        setValues({
          providers: row.providerValues || (row.providers || []).map((provider) => provider?.value).filter(Boolean) || ['chatgpt'],
          category: row.category || row.packId || '',
          sectionTitle: row.sectionTitle || '',
          sectionOrder: Number(row.sectionOrder || 0),
          itemOrder: Number(row.itemOrder || 0),
          useCase: row.useCase || '',
          prompt: row.prompt || '',
          isActive: !!row.isActive,
        });
      } catch (error) {
        toast.error(error?.message || 'Failed to load prompt row');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [editMode, id, router]);

  const heading = useMemo(() => (editMode ? 'Edit Prompt' : 'Create Prompt'), [editMode]);
  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  const submit = async () => {
    if (!values.sectionTitle?.trim() || !hasEditorText(values.useCase) || !hasEditorText(values.prompt)) {
      toast.error('Section title, use case and prompt are required');
      return;
    }
    if (!values.providers?.length) {
      toast.error('Please select at least one provider');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        providers: values.providers,
        category: values.category?.trim() || null,
        sectionTitle: values.sectionTitle,
        sectionOrder: Number(values.sectionOrder || 0),
        itemOrder: Number(values.itemOrder || 0),
        useCase: values.useCase,
        prompt: values.prompt,
        isActive: !!values.isActive,
      };

      if (editMode && id) {
        await promptCatalogService.updateRow(id, payload);
        toast.success('Prompt updated');
      } else {
        await promptCatalogService.createRow(payload);
        toast.success('Prompt created');
      }
      router.push(paths.admin.promptCatalog.list);
    } catch (error) {
      toast.error(error?.message || (editMode ? 'Update failed' : 'Create failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditorImageUpload = async (file) => {
    try {
      return await promptCatalogService.uploadPromptImage(file);
    } catch (error) {
      toast.error(error?.message || 'Image upload failed');
      return '';
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Resource', href: paths.admin.workflow.list },
          { name: 'Prompt Catalog', href: paths.admin.promptCatalog.list },
          { name: editMode ? 'Edit' : 'Create' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title={editMode ? 'Edit prompt entry' : 'Create prompt entry'}
              subheader="Configure provider mapping, section details, and final prompt text."
              sx={{ px: 3, pt: 3, pb: 0, alignItems: 'flex-start' }}
              action={
                <Box
                  sx={{
                    flexShrink: 0,
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
                  <SvgColor
                    src={`${CONFIG.site.basePath}/assets/icons/navbar/ic-workflow.svg`}
                    sx={{ width: 28, height: 28, color: 'primary.main' }}
                  />
                </Box>
              }
            />
            <Divider sx={{ mx: 3, my: 2 }} />

            <Stack spacing={2.5} sx={{ p: 3, pt: 0 }}>
              <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" width={22} />}>
                Keep prompt text concise and reusable. You can map one prompt entry to multiple providers.
              </Alert>

              <Select
                size="small"
                multiple
                value={values.providers}
                onChange={(e) => setValues((p) => ({ ...p, providers: e.target.value }))}
                displayEmpty
                renderValue={(selected) =>
                  selected.length === 0
                    ? 'No available providers'
                    : providerOptions.filter((opt) => selected.includes(opt.value))
                        .map((opt) => opt.label)
                        .join(', ')
                }
              >
                {providerOptions.length === 0 ? (
                  <MenuItem disabled value="">
                    No available providers
                  </MenuItem>
                ) : null}
                {providerOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label="Category (Optional)"
                  value={values.category}
                  onChange={(e) => setValues((p) => ({ ...p, category: e.target.value }))}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Section Order"
                  type="number"
                  value={values.sectionOrder}
                  onChange={(e) => setValues((p) => ({ ...p, sectionOrder: e.target.value }))}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Item Order"
                  type="number"
                  value={values.itemOrder}
                  onChange={(e) => setValues((p) => ({ ...p, itemOrder: e.target.value }))}
                  fullWidth
                />
                <Select
                  size="small"
                  value={values.isActive ? 'yes' : 'no'}
                  onChange={(e) => setValues((p) => ({ ...p, isActive: e.target.value === 'yes' }))}
                  fullWidth
                >
                  <MenuItem value="yes">Active</MenuItem>
                  <MenuItem value="no">Inactive</MenuItem>
                </Select>
              </Stack>

              <TextField
                fullWidth
                size="small"
                label="Section Title"
                value={values.sectionTitle}
                onChange={(e) => setValues((p) => ({ ...p, sectionTitle: e.target.value }))}
              />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Use Case
                </Typography>
                <Editor
                  value={values.useCase || ''}
                  onChange={(value) => setValues((p) => ({ ...p, useCase: value }))}
                  onUploadImage={handleEditorImageUpload}
                  placeholder="Write use case details..."
                  fullItem={false}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Prompt
                </Typography>
                <Editor
                  value={values.prompt || ''}
                  onChange={(value) => setValues((p) => ({ ...p, prompt: value }))}
                  onUploadImage={handleEditorImageUpload}
                  placeholder="Write prompt content..."
                  fullItem={false}
                />
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} md={4}>
          <Card
            sx={{
              ...cardSx,
              position: { md: 'sticky' },
              top: { md: 24 },
            }}
          >
            <CardHeader
              title="Publish"
              subheader="Save when ready. You can always edit later."
              sx={{ px: 3, pt: 3, pb: 0 }}
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={1.5} sx={{ p: 3, pt: 0 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Current mode: {editMode ? 'Edit existing prompt' : 'Create new prompt'}
              </Typography>
              <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1.5}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="inherit"
                  size="large"
                  startIcon={<Iconify icon="eva:arrow-back-fill" />}
                  onClick={() => router.push(paths.admin.promptCatalog.list)}
                >
                  Cancel
                </Button>
                <LoadingButton
                  fullWidth
                  loading={submitting}
                  variant="contained"
                  size="large"
                  onClick={submit}
                  startIcon={<Iconify icon={editMode ? 'eva:checkmark-fill' : 'solar:add-circle-bold'} />}
                >
                  {editMode ? 'Save changes' : 'Create prompt'}
                </LoadingButton>
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

