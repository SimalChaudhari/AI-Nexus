import { useMemo, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { toast } from 'src/components/snackbar';
import { promptCatalogService } from 'src/services/prompt-catalog.service';
import { Form, Field } from 'src/components/hook-form';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z as zod } from 'zod';
import { Iconify } from 'src/components/iconify';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
import { PROMPT_PROVIDER_LABEL } from './constants';

const htmlToPlain = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const PROVIDER_OPTIONS = Object.entries(PROMPT_PROVIDER_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const PromptCreateSchema = zod.object({
  providers: zod.array(zod.string()).min(1, { message: 'Select at least one provider' }),
  sectionTitle: zod.string().trim().min(1, { message: 'Section is required' }),
  useCase: zod.string().trim().min(1, { message: 'Use case is required' }),
  prompt: zod
    .string()
    .refine((val) => !isEffectivelyEmptyHtml(val), { message: 'Prompt is required' })
    .refine((val) => (val?.length ?? 0) <= 50000, { message: 'Prompt is too long' }),
});

const PromptEditSchema = zod.object({
  sectionTitle: zod.string().trim().min(1, { message: 'Section is required' }),
  useCase: zod.string().trim().min(1, { message: 'Use case is required' }),
  prompt: zod
    .string()
    .refine((val) => !isEffectivelyEmptyHtml(val), { message: 'Prompt is required' })
    .refine((val) => (val?.length ?? 0) <= 50000, { message: 'Prompt is too long' }),
});

export function PromptNewEditForm({ currentPrompt, defaultSectionTitle = '', isCreate = false }) {
  const theme = useTheme();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => {
    if (!isCreate) return undefined;

    let active = true;
    (async () => {
      try {
        setCategoriesLoading(true);
        const options = await promptCatalogService.getAdminCategoryOptions();
        if (active) setCategoryOptions(options);
      } catch {
        if (active) setCategoryOptions([]);
      } finally {
        if (active) setCategoriesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isCreate]);

  const defaultValues = useMemo(
    () =>
      isCreate
        ? {
            providers: ['chatgpt'],
            sectionTitle: defaultSectionTitle || '',
            useCase: '',
            prompt: '',
          }
        : {
            sectionTitle: htmlToPlain(currentPrompt?.sectionTitle),
            useCase: htmlToPlain(currentPrompt?.useCase),
            prompt: currentPrompt?.prompt || '',
          },
    [currentPrompt, defaultSectionTitle, isCreate]
  );

  const methods = useForm({
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(isCreate ? PromptCreateSchema : PromptEditSchema),
    defaultValues,
  });
  const { reset, handleSubmit, control } = methods;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleCancel = () => {
    if (isCreate) {
      router.push(paths.admin.prompt.list);
      return;
    }
    router.push(paths.admin.prompt.details(currentPrompt?.id));
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      setSaving(true);
      if (isCreate) {
        const created = await promptCatalogService.createAdminPromptItem({
          providers: values.providers,
          sectionTitle: String(values.sectionTitle || '').trim(),
          useCase: values.useCase,
          prompt: values.prompt,
        });
        toast.success('Prompt created successfully');
        if (created?.id) {
          router.push(paths.admin.prompt.details(created.id));
        } else {
          router.push(paths.admin.prompt.list);
        }
        return;
      }

      if (!currentPrompt?.id) return;
      await promptCatalogService.updateAdminPromptItem(currentPrompt.id, {
        sectionTitle: currentPrompt.sectionTitle ?? '',
        useCase: currentPrompt.useCase ?? '',
        prompt: values.prompt,
      });
      toast.success('Prompt updated successfully');
      router.push(paths.admin.prompt.details(currentPrompt.id));
    } catch (error) {
      toast.error(error?.message || `Failed to ${isCreate ? 'create' : 'update'} prompt`);
    } finally {
      setSaving(false);
    }
  });

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  return (
    <Form methods={methods} onSubmit={handleSave}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title={isCreate ? 'New prompt' : 'Prompt details'}
              subheader={
                isCreate
                  ? 'Add a custom prompt manually. It will be kept after external sync.'
                  : 'Section and use case are fixed for this entry. Update the prompt content below.'
              }
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
                  <Iconify icon="solar:document-text-bold" width={28} />
                </Box>
              }
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={3} sx={{ px: 3, pb: 3 }}>
              <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" width={22} />}>
                {isCreate ? (
                  <>
                    Choose providers and category details, then write the prompt. Manual prompts stay
                    in the catalog when you run <strong>Sync Prompts</strong>.
                  </>
                ) : (
                  <>
                    Use the <strong>editor toolbar</strong> for formatting prompt content.
                  </>
                )}
              </Alert>

              {isCreate ? (
                <Field.MultiCheckbox
                  name="providers"
                  label="Providers"
                  options={PROVIDER_OPTIONS}
                  row
                />
              ) : null}

              {isCreate ? (
                <Controller
                  name="sectionTitle"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <Autocomplete
                      freeSolo
                      options={categoryOptions}
                      loading={categoriesLoading}
                      value={field.value || ''}
                      onChange={(event, newValue) =>
                        field.onChange(String(newValue ?? '').trim())
                      }
                      onInputChange={(event, newInputValue, reason) => {
                        if (reason === 'input') {
                          field.onChange(newInputValue);
                        }
                      }}
                      onBlur={field.onBlur}
                      getOptionLabel={(option) => String(option || '')}
                      isOptionEqualToValue={(option, value) => String(option) === String(value)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Section / Category"
                          placeholder="Select synced category or type a new one"
                          error={!!error}
                          helperText={
                            error?.message ||
                            'Choose an existing category from sync, or enter a custom category name.'
                          }
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {categoriesLoading ? (
                                  <CircularProgress color="inherit" size={20} sx={{ mr: 1 }} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  )}
                />
              ) : (
                <Field.Text
                  name="sectionTitle"
                  label="Section / Category"
                  InputProps={{ readOnly: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: alpha(theme.palette.grey[500], 0.08),
                    },
                  }}
                />
              )}
              <Field.Text
                name="useCase"
                label="Use Case"
                InputProps={{ readOnly: !isCreate }}
                sx={
                  isCreate
                    ? undefined
                    : {
                        '& .MuiOutlinedInput-root': {
                          bgcolor: alpha(theme.palette.grey[500], 0.08),
                        },
                      }
                }
              />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Prompt
                </Typography>
                <Field.Editor
                  name="prompt"
                  placeholder="Write the full prompt content..."
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
              p: 3,
            }}
          >
            <CardHeader
              title="Publish"
              subheader={isCreate ? 'Create when you are ready.' : 'Save when you’re ready.'}
              sx={{ p: 0, mb: 2 }}
            />
            <Stack spacing={1.5}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                color="inherit"
                startIcon={<Iconify icon="eva:arrow-back-fill" />}
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <LoadingButton
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                loading={saving}
                startIcon={<Iconify icon="eva:checkmark-fill" />}
              >
                {isCreate ? 'Create prompt' : 'Save changes'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
