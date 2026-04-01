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
import LoadingButton from '@mui/lab/LoadingButton';
import Divider from '@mui/material/Divider';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { createLabel, updateLabel } from 'src/store/slices/labelSlice';

// ----------------------------------------------------------------------

export const NewLabelSchema = zod.object({
  title: zod.string().min(1, { message: 'Title is required!' }),
});

// ----------------------------------------------------------------------

export function LabelNewEditForm({ currentLabel, onCancel }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const isEdit = Boolean(currentLabel);

  const defaultValues = useMemo(
    () => ({
      title: currentLabel?.title || currentLabel?.name || '',
    }),
    [currentLabel]
  );

  const methods = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(NewLabelSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    reset(defaultValues);
  }, [currentLabel, defaultValues, reset]);

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
    router.push(paths.admin.label.list);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const labelData = {
        title: data.title,
      };

      if (currentLabel) {
        await dispatch(updateLabel({ id: currentLabel.id, labelData })).unwrap();
        toast.success('Label updated successfully!');
      } else {
        await dispatch(createLabel(labelData)).unwrap();
        toast.success('Label created successfully!');
      }
      router.push(paths.admin.label.list);
    } catch (error) {
      const errorMessage = error || 'Failed to save label';
      toast.error(errorMessage);
      console.error('Error saving label:', error);
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title={isEdit ? 'Edit label' : 'Create a new label'}
              subheader="Short, clear name - used across AI resources and filters."
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
                    src={`${CONFIG.site.basePath}/assets/icons/navbar/ic-label.svg`}
                    sx={{ width: 28, height: 28, color: 'primary.main' }}
                  />
                </Box>
              }
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={3} sx={{ px: 3, pb: 3 }}>
              <Field.Text
                name="title"
                label="Title"
                placeholder="e.g. Beginner, Advanced"
                autoFocus={!isEdit}
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
            <CardHeader title="Publish" subheader="Save when you're ready." sx={{ p: 0, mb: 2 }} />
            <Stack spacing={1.5}>
              <Button
                fullWidth
                color="inherit"
                variant="outlined"
                size="large"
                startIcon={<Iconify icon="eva:arrow-back-fill" />}
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                variant="contained"
                size="large"
                loading={isSubmitting}
                fullWidth
                startIcon={<Iconify icon={isEdit ? 'eva:checkmark-fill' : 'solar:add-circle-bold'} />}
              >
                {isEdit ? 'Save changes' : 'Create label'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}

