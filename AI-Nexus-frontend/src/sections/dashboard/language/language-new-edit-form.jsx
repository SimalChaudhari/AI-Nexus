import { z as zod } from 'zod';
import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { createLanguage, updateLanguage } from 'src/store/slices/languageSlice';

// ----------------------------------------------------------------------

export const NewLanguageSchema = zod.object({
  title: zod.string().min(1, { message: 'Title is required!' }),
  deleted: zod.boolean().optional(),
});

// ----------------------------------------------------------------------

export function LanguageNewEditForm({ currentLanguage }) {
  const dispatch = useDispatch();
  const router = useRouter();

  const defaultValues = useMemo(
    () => ({
      title: currentLanguage?.title ?? '',
      deleted: currentLanguage?.deleted ?? false,
    }),
    [currentLanguage]
  );

  const methods = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(NewLanguageSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    watch,
    setValue,
  } = methods;

  const deleted = watch('deleted');

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = { title: data.title };
      if (currentLanguage) payload.deleted = !!data.deleted;

      if (currentLanguage) {
        await dispatch(updateLanguage({ id: currentLanguage.id, data: payload })).unwrap();
        toast.success('Language updated successfully!');
      } else {
        await dispatch(createLanguage(payload)).unwrap();
        toast.success('Language created successfully!');
      }
      router.push(paths.admin.language.list);
    } catch (error) {
      toast.error(error || 'Failed to save language');
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Field.Text name="title" label="Title" />
              {currentLanguage && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!deleted}
                      onChange={(e) => setValue('deleted', e.target.checked)}
                    />
                  }
                  label="Deleted (soft delete)"
                />
              )}
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} md={4}>
          <Box sx={{ position: { md: 'sticky' }, top: { md: 100 }, alignSelf: { md: 'flex-start' } }}>
            <Stack direction="row" spacing={1.5}>
              <Button fullWidth color="inherit" variant="outlined" size="large" onClick={() => router.back()}>
                Cancel
              </Button>
              <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting} fullWidth>
                {!currentLanguage ? 'Create' : 'Save Changes'}
              </LoadingButton>
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Form>
  );
}
