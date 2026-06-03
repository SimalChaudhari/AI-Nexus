import { z as zod } from 'zod';
import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { Upload } from 'src/components/upload';
import { createCategory, updateCategory } from 'src/store/slices/categorySlice';
import { CategoryIconPicker } from './category-icon-picker';

// ----------------------------------------------------------------------

function slugifyClient(value) {
  if (!value || typeof value !== 'string') return '';
  const s = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s;
}

export const NewCategorySchema = zod.object({
  title: zod
    .string()
    .min(1, { message: 'Title is required!' })
    .max(200, { message: 'Title must be 200 characters or less' })
    .trim(),
  slug: zod.string().max(160, { message: 'Slug too long' }).optional(),
  description: zod
    .string()
    .max(5000, { message: 'Description is too long' })
    .optional(),
  image: zod
    .string()
    .max(10_000_000, { message: 'Image value is too long' })
    .optional(),
  icon: zod.string().optional(),
  status: zod.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Please select active or inactive' }),
  }),
});

const normalizeStatus = (status) => {
  const s = String(status ?? 'active').toLowerCase();
  return s === 'inactive' ? 'inactive' : 'active';
};

// ----------------------------------------------------------------------

export function CategoryNewEditForm({ currentCategory, onCancel }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const isEdit = Boolean(currentCategory);
  const [previewImage, setPreviewImage] = useState(currentCategory?.image || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageDeleted, setImageDeleted] = useState(false);

  /** When false, slug field follows the title (new categories only). */
  const slugManualRef = useRef(isEdit);

  const defaultValues = useMemo(
    () => ({
      title: currentCategory?.title || '',
      slug: currentCategory?.slug || '',
      description: currentCategory?.description ?? '',
      image: currentCategory?.image ?? '',
      icon: currentCategory?.icon || '',
      status: normalizeStatus(currentCategory?.status),
    }),
    [currentCategory]
  );

  const methods = useForm({
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(NewCategorySchema),
    defaultValues,
  });

  const { handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = methods;

  useEffect(() => {
    reset(defaultValues);
    slugManualRef.current = isEdit;
    if (currentCategory?.id) {
      setPreviewImage(currentCategory.image || null);
      setSelectedFile(null);
      setImageDeleted(false);
    } else {
      setPreviewImage(null);
      setSelectedFile(null);
      setImageDeleted(false);
    }
  }, [currentCategory, defaultValues, reset, isEdit]);

  const iconValue = watch('icon');
  const titleWatch = watch('title');

  useEffect(() => {
    if (isEdit) return;
    if (slugManualRef.current) return;
    const trimmed = titleWatch?.trim() || '';
    if (!trimmed) {
      setValue('slug', '', { shouldValidate: true });
      return;
    }
    const next = slugifyClient(trimmed);
    setValue('slug', next || '', { shouldValidate: true });
  }, [titleWatch, isEdit, setValue]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(paths.admin.category.list);
  };

  const handleSlugUserInput = () => {
    slugManualRef.current = true;
  };

  const handleSyncSlugFromTitle = () => {
    slugManualRef.current = false;
    const trimmed = titleWatch?.trim() || '';
    if (!trimmed) {
      setValue('slug', '', { shouldValidate: true });
      return;
    }
    const next = slugifyClient(trimmed);
    setValue('slug', next || '', { shouldValidate: true, shouldDirty: true });
  };

  const handleDropImage = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
      setSelectedFile(file);
      setImageDeleted(false);
    },
    []
  );

  const handleRemoveImage = useCallback(() => {
    setPreviewImage(null);
    setSelectedFile(null);
    setImageDeleted(true);
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const categoryData = {
        title: data.title.trim(),
        status: data.status,
        description: data.description?.trim() || undefined,
        icon: data.icon?.trim() || undefined,
      };
      const rawSlug = data.slug?.trim();
      if (rawSlug) {
        categoryData.slug = rawSlug;
      }

      if (currentCategory) {
        if (imageDeleted) categoryData.image = '';
        await dispatch(
          updateCategory({
            id: currentCategory.id,
            categoryData,
            imageFile: imageDeleted ? undefined : selectedFile || null,
          })
        ).unwrap();
        toast.success('Category updated successfully!');
      } else {
        await dispatch(createCategory({ categoryData, imageFile: selectedFile || null })).unwrap();
        toast.success('Category created successfully!');
      }
      router.push(paths.admin.category.list);
    } catch (error) {
      const errorMessage = error || 'Failed to save category';
      toast.error(errorMessage);
      console.error('Error saving category:', error);
    }
  });

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title={isEdit ? 'Edit category' : 'Create category'}
              subheader="Title, URL slug, optional description and image, status, and optional icon."
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
                  <Iconify icon="solar:widget-5-bold-duotone" width={28} />
                </Box>
              }
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={3} sx={{ p: 3, pt: 0 }}>
              <Alert severity="info" icon={<Iconify icon="solar:pallete-2-bold-duotone" width={22} />}>
                <strong>Slug</strong> is generated from the title until you edit it. The API enforces a unique slug.
                Upload an image directly (PNG, JPG, GIF, WebP up to 5 MB).
              </Alert>

              <Field.Text name="title" label="Title" placeholder="e.g. AI Foundations" />

              <Stack spacing={1}>
                <Field.Text
                  name="slug"
                  label="Slug"
                  placeholder="ai-foundations"
                  helperText="Lowercase, numbers, and hyphens. Leave blank on create to derive from the title."
                  slotProps={{
                    htmlInput: {
                      onInput: handleSlugUserInput,
                    },
                  }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<Iconify icon="solar:refresh-bold" width={18} />}
                  onClick={handleSyncSlugFromTitle}
                  sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                >
                  Regenerate slug from title
                </Button>
              </Stack>

              <Field.Text
                name="description"
                label="Description (optional)"
                placeholder="Short summary for admins or catalog copy"
                multiline
                minRows={3}
              />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                  Image (optional)
                </Typography>
                <Upload
                  coverPreview
                  value={selectedFile || previewImage}
                  onDrop={handleDropImage}
                  onDelete={handleRemoveImage}
                  maxSize={5 * 1024 * 1024}
                  accept={{
                    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                  }}
                />
              </Box>

              <Box>
                <CategoryIconPicker
                  value={iconValue || ''}
                  onChange={(icon) => setValue('icon', icon, { shouldValidate: true, shouldDirty: true })}
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
              title="Visibility"
              subheader="Inactive categories can be hidden from learners depending on your app rules."
              sx={{ px: 3, pt: 3, pb: 0 }}
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={2.5} sx={{ p: 3, pt: 0 }}>
              <Field.Select name="status" label="Status" InputLabelProps={{ shrink: true }}>
                <MenuItem value="active">
                  <Stack spacing={0.25} alignItems="flex-start">
                    <Typography variant="subtitle2">Active</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Visible and usable for new content
                    </Typography>
                  </Stack>
                </MenuItem>
                <MenuItem value="inactive">
                  <Stack spacing={0.25} alignItems="flex-start">
                    <Typography variant="subtitle2">Inactive</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hidden or archived from default flows
                    </Typography>
                  </Stack>
                </MenuItem>
              </Field.Select>

              <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1.5}>
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
                  {isEdit ? 'Save changes' : 'Create category'}
                </LoadingButton>
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
