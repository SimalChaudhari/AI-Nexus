import { z as zod } from 'zod';
import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import { MenuItem } from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { createCategory, updateCategory } from 'src/store/slices/categorySlice';
import { CategoryIconPicker } from './category-icon-picker';

// ----------------------------------------------------------------------

export const NewTagSchema = zod.object({
  title: zod.string().min(1, { message: 'Title is required!' }),
  icon: zod.string().optional(),
  status: zod.string(),
});

// ----------------------------------------------------------------------

export function TagNewEditForm({ currentTag }) {
  const dispatch = useDispatch();
  const router = useRouter();

  const defaultValues = useMemo(
    () => ({
      title: currentTag?.title || '',
      icon: currentTag?.icon || '',
      status: currentTag?.status || 'active',
    }),
    [currentTag]
  );

  const methods = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(NewTagSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  const iconValue = watch('icon');

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Prepare category data (convert status to lowercase for backend)
      const categoryData = {
        title: data.title,
        icon: data.icon || undefined,
        status: data.status?.toLowerCase() || 'active',
      };

      if (currentTag) {
        await dispatch(updateCategory({ id: currentTag.id, categoryData })).unwrap();
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

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Field.Text name="title" label="Title" />

              <CategoryIconPicker
                value={iconValue || ''}
                onChange={(icon) => setValue('icon', icon, { shouldValidate: true })}
              />

              <Field.Select name="status" label="Status">
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Field.Select>
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} md={4}>
          <Stack direction="row" spacing={1.5} sx={{ position: 'sticky', top: 24 }}>
            <Button fullWidth color="inherit" variant="outlined" size="large" onClick={() => router.back()}>
              Cancel
            </Button>
            <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting} fullWidth>
              {!currentTag ? 'Create' : 'Save Changes'}
            </LoadingButton>
          </Stack>
        </Grid>
      </Grid>
    </Form>
  );
}

