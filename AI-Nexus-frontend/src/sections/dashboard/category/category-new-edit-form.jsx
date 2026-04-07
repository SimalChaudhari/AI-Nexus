import { z as zod } from 'zod';
import { useMemo, useEffect } from 'react';
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
import { createCategory, updateCategory } from 'src/store/slices/categorySlice';
import { CategoryIconPicker } from './category-icon-picker';

// ----------------------------------------------------------------------

export const NewCategorySchema = zod.object({
  title: zod
    .string()
    .min(1, { message: 'Title is required!' })
    .max(120, { message: 'Title must be 120 characters or less' })
    .trim(),
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

  const defaultValues = useMemo(
    () => ({
      title: currentCategory?.title || '',
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
  }, [currentCategory, defaultValues, reset]);

  const iconValue = watch('icon');

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(paths.admin.category.list);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const categoryData = {
        title: data.title.trim(),
        icon: data.icon?.trim() || undefined,
        status: data.status,
      };

      if (currentCategory) {
        await dispatch(updateCategory({ id: currentCategory.id, categoryData })).unwrap();
        toast.success('Category updated successfully!');
      } else {
        await dispatch(createCategory(categoryData)).unwrap();
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
              subheader="Name your category and optionally choose an icon for lists and filters."
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
                <strong>Icon</strong> is optional. If you skip it, the UI will use a default. Search the library to
                match your course style.
              </Alert>

              <Field.Text name="title" label="Title" placeholder="e.g. Web Development" />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                  Appearance
                </Typography>
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
