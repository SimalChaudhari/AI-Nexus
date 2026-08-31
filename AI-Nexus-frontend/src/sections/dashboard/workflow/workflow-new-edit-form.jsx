import { z as zod } from 'zod';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { Upload } from 'src/components/upload';
import { createWorkflow, updateWorkflow } from 'src/store/slices/workflowSlice';
import { fetchLabels } from 'src/store/slices/labelSlice';
import { fetchTags } from 'src/store/slices/tagSlice';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';

// ----------------------------------------------------------------------

export const NewWorkflowSchema = zod.object({
  title: zod
    .string()
    .trim()
    .min(1, { message: 'Title is required!' })
    .max(200, { message: 'Title must be 200 characters or less' }),
  description: zod
    .string()
    .optional()
    .refine((val) => !val || val.length <= 50000, { message: 'Description is too long' }),
  labelId: zod.string().optional().nullable(),
  tags: zod.array(zod.any()).optional(),
  tagIds: zod.array(zod.string()).optional(),
});

// ----------------------------------------------------------------------
const CREATE_FORM_DRAFT_KEY = 'aiNexus.workflow.createFormDraft';

const readCreateFormDraft = () => {
  try {
    const raw = sessionStorage.getItem(CREATE_FORM_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return {
      title: typeof d.title === 'string' ? d.title : '',
      description: typeof d.description === 'string' ? d.description : '',
      labelId: d.labelId ?? null,
      tagIds: Array.isArray(d.tagIds) ? d.tagIds : [],
      tags: Array.isArray(d.tags) ? d.tags : [],
    };
  } catch {
    return null;
  }
};

const editFormDraftStorageKey = (id) => `aiNexus.workflow.editFormDraft.${id}`;

const readEditFormDraft = (id) => {
  if (!id) return null;
  try {
    const raw = sessionStorage.getItem(editFormDraftStorageKey(id));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return {
      title: typeof d.title === 'string' ? d.title : '',
      description: typeof d.description === 'string' ? d.description : '',
      labelId: d.labelId ?? null,
      tagIds: Array.isArray(d.tagIds) ? d.tagIds : [],
      tags: Array.isArray(d.tags) ? d.tags : [],
    };
  } catch {
    return null;
  }
};

const clearEditFormDraft = (id) => {
  if (!id) return;
  try {
    sessionStorage.removeItem(editFormDraftStorageKey(id));
  } catch {
    // ignore
  }
};

// ----------------------------------------------------------------------

export function WorkflowNewEditForm({
  currentWorkflow,
  onCancel,
}) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const isEdit = Boolean(currentWorkflow);

  const { labels, loading: labelsLoading } = useSelector((state) => state.labels);
  const { tags, loading: tagsLoading } = useSelector((state) => state.tags);
  const { creating, updating } = useSelector((state) => state.workflows);

  const [previewImage, setPreviewImage] = useState(currentWorkflow?.image || null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    dispatch(fetchLabels());
    dispatch(fetchTags());
  }, [dispatch]);

  const defaultValues = useMemo(
    () => ({
      title: currentWorkflow?.title || '',
      description: currentWorkflow?.description || '',
      labelId: currentWorkflow?.labelId || currentWorkflow?.label?.id || null,
      tagIds: currentWorkflow?.tagIds || currentWorkflow?.tags?.map((tag) => tag.id) || [],
      tags:
        currentWorkflow?.tags?.map((tag) => ({
          id: tag.id,
          label: tag.title,
          title: tag.title,
        })) || [],
    }),
    [currentWorkflow]
  );

  const methods = useForm({
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(NewWorkflowSchema),
    defaultValues,
  });

  const { reset, setValue, watch, handleSubmit } = methods;

  useEffect(() => {
    if (isEdit) {
      const draft = currentWorkflow?.id ? readEditFormDraft(currentWorkflow.id) : null;
      const mergedValues = draft
        ? {
            ...defaultValues,
            title: draft.title ?? defaultValues.title,
            description: draft.description ?? defaultValues.description,
            labelId: 'labelId' in draft ? draft.labelId : defaultValues.labelId,
            tagIds: Array.isArray(draft.tagIds) ? draft.tagIds : defaultValues.tagIds,
            tags: Array.isArray(draft.tags) ? draft.tags : defaultValues.tags,
          }
        : defaultValues;
      reset(mergedValues);
      if (currentWorkflow?.id) {
        setPreviewImage(currentWorkflow.image || null);
      } else {
        setPreviewImage(null);
      }
      setSelectedFile(null);
      return;
    }

    // Create: restore title / description / label / tags from session (survives builder round-trip)
    const draft = readCreateFormDraft();
    reset({
      ...defaultValues,
      ...(draft || {}),
    });
    setPreviewImage(null);
    setSelectedFile(null);
  }, [currentWorkflow, defaultValues, isEdit, reset]);

  const isSubmitting = isEdit ? updating : creating;

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(paths.admin.workflow.list);
  };

  const handleDropImage = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);

    setSelectedFile(file);
  }, []);

  const handleDeleteImage = useCallback(() => {
    setPreviewImage(null);
    setSelectedFile(null);
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    try {
      let tagIds = [];
      const tagTitles = [];

      if (data.tags && data.tags.length > 0) {
        data.tags.forEach((tag) => {
          if (typeof tag === 'string') {
            tagTitles.push(tag.trim());
          } else if (tag.id) {
            tagIds.push(tag.id);
          }
        });
      } else if (data.tagIds && data.tagIds.length > 0) {
        tagIds = [...data.tagIds];
      }

      const workflowData = {
        title: data.title.trim(),
        description: isEffectivelyEmptyHtml(data.description || '') ? undefined : data.description,
        labelId: data.labelId || undefined,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
        tagTitles: tagTitles.length > 0 ? tagTitles : undefined,
      };

      const imageFile = selectedFile || null;

      if (currentWorkflow) {
        await dispatch(
          updateWorkflow({
            id: currentWorkflow.id,
            workflowData,
            imageFile,
          })
        ).unwrap();
        clearEditFormDraft(currentWorkflow.id);
        toast.success('AI resource updated successfully!');
      } else {
        await dispatch(
          createWorkflow({
            workflowData,
            imageFile,
          })
        ).unwrap();
        try {
          sessionStorage.removeItem(CREATE_FORM_DRAFT_KEY);
        } catch {
          // ignore
        }
        toast.success('AI resource created successfully!');
      }
      router.push(paths.admin.workflow.list);
    } catch (error) {
      const errorMessage = error || 'Failed to save AI resource';
      toast.error(errorMessage);
      console.error('Error saving AI resource:', error);
    }
  });

  const labelOptions = useMemo(
    () =>
      labels.map((label) => ({
        id: label.id,
        label: label.name || label.title,
      })),
    [labels]
  );

  const tagOptions = useMemo(
    () =>
      tags.map((tag) => ({
        id: tag.id,
        label: tag.title,
      })),
    [tags]
  );

  const selectedLabel = useMemo(() => {
    const labelId = watch('labelId');
    if (!labelId) return null;
    return labelOptions.find((opt) => opt.id === labelId) || null;
  }, [watch('labelId'), labelOptions]);

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title={isEdit ? 'Edit AI resource' : 'Create AI resource'}
              subheader="Title, rich description, cover image, label, and tags."
              sx={{ px: 3, pt: 3, pb: 0, alignItems: 'flex-start' }}
              action={
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
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
                </Stack>
              }
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={3} sx={{ px: 3, pb: 3 }}>
              <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" width={22} />}>
                Use the toolbar for <strong>bold</strong>, lists, and links in the description.{' '}
                <strong>Label</strong> and <strong>at least one tag</strong> are required. Tags can be new or
                existing — press Enter to add.
              </Alert>

              <Field.Text name="title" label="Title" placeholder="e.g. Customer onboarding flow" />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Description
                </Typography>
                <Field.Editor
                  name="description"
                  placeholder="What this resource covers, steps, and outcomes…"
                  fullItem={false}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Cover image
                </Typography>
                <Upload
                  coverPreview
                  value={selectedFile || previewImage}
                  onDrop={handleDropImage}
                  onDelete={handleDeleteImage}
                  maxSize={5 * 1024 * 1024}
                  accept={{
                    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                  }}
                />
              </Box>

              <Field.Autocomplete
                name="labelId"
                label="Label"
                placeholder="Select label..."
                loading={labelsLoading}
                options={labelOptions}
                value={selectedLabel}
                onChange={(event, newValue) => {
                  setValue('labelId', newValue?.id || null, { shouldValidate: false });
                }}
                getOptionLabel={(option) => {
                  if (!option) return '';
                  if (typeof option === 'string') return option;
                  return option.label || '';
                }}
                isOptionEqualToValue={(option, value) => {
                  if (!option || !value) return false;
                  return option.id === value.id;
                }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {option.label}
                  </li>
                )}
              />

              <Field.TagsInput
                name="tags"
                label="Tags"
                placeholder="Add tag… (Enter to add; new tags are created on save)"
                options={tagOptions}
                loading={tagsLoading}
              />
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
            <CardHeader title="Publish" subheader="Save when you’re ready." sx={{ p: 0, mb: 2 }} />
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
                loading={isSubmitting}
                startIcon={<Iconify icon={isEdit ? 'eva:checkmark-fill' : 'solar:add-circle-bold'} />}
              >
                {isEdit ? 'Save changes' : 'Create AI resource'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
