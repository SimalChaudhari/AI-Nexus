import { z as zod } from 'zod';
import { useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { createProgram, updateProgram } from 'src/store/slices/programSlice';

const schema = zod.object({
  title: zod.string().trim().min(1, 'Program title is required').max(200),
  description: zod.string().max(5000).optional(),
  status: zod.enum(['active', 'inactive']),
});

export function ProgramNewEditForm({ currentProgram, onCancel }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const isEdit = Boolean(currentProgram);

  const defaultValues = useMemo(
    () => ({
      title: currentProgram?.title || '',
      description: currentProgram?.description ?? '',
      status: currentProgram?.status === 'inactive' ? 'inactive' : 'active',
    }),
    [currentProgram]
  );

  const methods = useForm({ resolver: zodResolver(schema), defaultValues });
  const { handleSubmit, reset, formState: { isSubmitting } } = methods;

  useEffect(() => { reset(defaultValues); }, [currentProgram, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        status: data.status,
      };
      if (currentProgram) {
        await dispatch(updateProgram({ id: currentProgram.id, programData: payload })).unwrap();
        toast.success('Program updated');
      } else {
        await dispatch(createProgram(payload)).unwrap();
        toast.success('Program created');
      }
      router.push(paths.admin.program.list);
    } catch (e) {
      toast.error(e || 'Save failed');
    }
  });

  const cardSx = { borderRadius: 2, border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`, boxShadow: 'none' };

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader title="Program" subheader="Name shown to learners for linked courses" sx={{ px: 3, pt: 3, pb: 0 }} />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={2.5} sx={{ p: 3, pt: 0 }}>
              <Alert severity="info">
                Create the program name here. Link courses from <strong>Course → Edit → Program</strong>.
              </Alert>
              <Field.Text name="title" label="Program name" placeholder="e.g. AI Fluency Track A" />
              <Field.Text name="description" label="Description (optional)" multiline minRows={2} />
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} md={4}>
          <Card sx={{ ...cardSx, position: { md: 'sticky' }, top: { md: 24 } }}>
            <CardHeader title="Publish" sx={{ px: 3, pt: 3, pb: 0 }} />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={2} sx={{ p: 3, pt: 0 }}>
              <Field.Select name="status" label="Status" InputLabelProps={{ shrink: true }}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Field.Select>
              <Button variant="outlined" color="inherit" onClick={() => (onCancel ? onCancel() : router.push(paths.admin.program.list))}>
                Cancel
              </Button>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {isEdit ? 'Save' : 'Create program'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
